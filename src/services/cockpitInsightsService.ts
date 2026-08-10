import type {
  CorrectionRequest,
  Employee,
  LeaveRequest,
  SickEntry,
  TimeEntry,
} from "@/types/database";
import type { CockpitActionItem } from "@/types/cockpit";
import { addDays } from "@/services/holidayService";
import { scheduledMinutesForDate } from "@/services/workScheduleService";

export interface CockpitAbsences {
  leaves: LeaveRequest[];
  sicknesses: SickEntry[];
}

export function absenceTypeOnDate(
  employeeId: string,
  date: string,
  absences: CockpitAbsences,
): "leave" | "sick" | null {
  const sick = absences.sicknesses.some((entry) =>
    entry.employee_id === employeeId &&
    entry.start_date <= date &&
    (entry.end_date === null || entry.end_date >= date));
  if (sick) return "sick";
  const leave = absences.leaves.some((entry) =>
    entry.employee_id === employeeId &&
    entry.start_date <= date &&
    entry.end_date >= date);
  return leave ? "leave" : null;
}

export function countEmployeeAbsenceDays(
  employeeId: string,
  dates: string[],
  absences: CockpitAbsences,
): { leaveDays: number; sickDays: number } {
  let leaveDays = 0;
  let sickDays = 0;
  for (const date of dates) {
    const type = absenceTypeOnDate(employeeId, date, absences);
    if (type === "leave") leaveDays++;
    if (type === "sick") sickDays++;
  }
  return { leaveDays, sickDays };
}

function employeeName(employee: Employee): string {
  return `${employee.first_name} ${employee.last_name}`.trim();
}

function netMinutes(entry: TimeEntry, nowIso: string): number {
  const end = entry.clock_out ?? nowIso;
  const elapsed = (Date.parse(end) - Date.parse(entry.clock_in)) / 60_000;
  return Math.max(0, Math.round(elapsed - (entry.break_minutes ?? 0)));
}

function missingEntryActions(input: CockpitActionInput): CockpitActionItem[] {
  const actions: CockpitActionItem[] = [];
  const firstDate = input.startDate > addDays(input.endDate, -6)
    ? input.startDate
    : addDays(input.endDate, -6);
  for (const employee of input.employees) {
    const state = employee.bundesland ?? input.tenantState;
    const holidays = input.holidaysByState.get(state) ?? new Map<string, string>();
    for (let date = firstDate; date < input.endDate; date = addDays(date, 1)) {
      const expected = scheduledMinutesForDate(
        employee.work_schedule,
        date,
        employee.target_hours_week,
      );
      const joined = employee.created_at.slice(0, 10) <= date;
      const absent = absenceTypeOnDate(employee.id, date, input.absences);
      const hasEntry = input.entries.some(
        (entry) => entry.employee_id === employee.id && entry.date === date,
      );
      if (expected > 0 && joined && !holidays.has(date) && !absent && !hasEntry) {
        actions.push({
          id: `missing-${employee.id}-${date}`,
          kind: "missing_entry",
          severity: "warning",
          title: "Zeiteintrag fehlt",
          description: `${employeeName(employee)} · ${formatDate(date)}`,
          employeeId: employee.id,
          employeeName: employeeName(employee),
          date,
          href: null,
        });
      }
    }
  }
  return actions;
}

function entryActions(input: CockpitActionInput): CockpitActionItem[] {
  const employeeMap = new Map(input.employees.map((employee) => [employee.id, employee]));
  const actions: CockpitActionItem[] = [];
  const unassigned = new Map<string, number>();
  for (const entry of input.entries) {
    const employee = employeeMap.get(entry.employee_id);
    if (!employee) continue;
    const name = employeeName(employee);
    const minutes = netMinutes(entry, input.nowIso);
    if (entry.status !== "completed" && entry.date < input.endDate) {
      actions.push(action(entry, name, "missing_clock_out", "critical", "Ausstempeln fehlt", `Eintrag vom ${formatDate(entry.date)} läuft noch.`));
    } else if (minutes > 600) {
      actions.push(action(entry, name, "long_shift", "critical", "Arbeitszeit über 10 Stunden", `${formatDate(entry.date)} · ${formatDuration(minutes)}`));
    }
    const requiredBreak = minutes > 540 ? 45 : minutes > 360 ? 30 : 0;
    if (entry.status === "completed" && requiredBreak > entry.break_minutes) {
      actions.push(action(entry, name, "break_violation", "critical", "Pause unterschritten", `${formatDate(entry.date)} · ${entry.break_minutes} statt ${requiredBreak} Minuten`));
    }
    if (!entry.project_id && minutes > 0) {
      unassigned.set(employee.id, (unassigned.get(employee.id) ?? 0) + minutes);
    }
  }
  for (const [employeeId, minutes] of unassigned) {
    const employee = employeeMap.get(employeeId);
    if (!employee) continue;
    actions.push({
      id: `unassigned-${employeeId}`,
      kind: "unassigned_time",
      severity: "info",
      title: "Zeit ohne Projekt",
      description: `${employeeName(employee)} · ${formatDuration(minutes)}`,
      employeeId,
      employeeName: employeeName(employee),
      date: input.endDate,
      href: null,
    });
  }
  return actions;
}

function correctionActions(input: CockpitActionInput): CockpitActionItem[] {
  const names = new Map(input.employees.map((employee) => [employee.id, employeeName(employee)]));
  return input.corrections
    .filter((request) => input.employees.some((employee) => employee.id === request.employee_id))
    .map((request) => ({
      id: `correction-${request.id}`,
      kind: "pending_correction" as const,
      severity: "warning" as const,
      title: "Korrekturanfrage offen",
      description: `${names.get(request.employee_id) ?? "Unbekannt"} · ${request.reason}`,
      employeeId: request.employee_id,
      employeeName: names.get(request.employee_id) ?? "Unbekannt",
      date: request.created_at.slice(0, 10),
      href: "/app/reports?tab=corrections",
    }));
}

interface CockpitActionInput {
  employees: Employee[];
  entries: TimeEntry[];
  corrections: CorrectionRequest[];
  absences: CockpitAbsences;
  holidaysByState: Map<string, ReadonlyMap<string, string>>;
  tenantState: string;
  startDate: string;
  endDate: string;
  nowIso: string;
}

export function buildCockpitActions(input: CockpitActionInput): CockpitActionItem[] {
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return [
    ...entryActions(input),
    ...correctionActions(input),
    ...missingEntryActions(input),
  ].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.date.localeCompare(a.date));
}

function action(
  entry: TimeEntry,
  name: string,
  kind: CockpitActionItem["kind"],
  severity: CockpitActionItem["severity"],
  title: string,
  description: string,
): CockpitActionItem {
  return { id: `${kind}-${entry.id}`, kind, severity, title, description, employeeId: entry.employee_id, employeeName: name, date: entry.date, href: null };
}

function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}.${month}.`;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
}
