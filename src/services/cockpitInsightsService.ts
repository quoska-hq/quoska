import { formatDateFullDE as formatDate } from "@/config/client/date-utils";
import type {
  Employee,
  TimeEntry,
} from "@/types/database";
import type { CorrectionRequestWithEntry } from "@/types/correction";
import type { CockpitActionItem } from "@/types/cockpit";
import { addDays } from "@/services/holidayService";
import { correctionChangeSummary } from "@/lib/correction-format";
import type { CockpitAbsences } from "@/services/cockpitAbsenceService";
import { missingEntryActions } from "@/services/cockpitMissingEntryService";

const MANUAL_BREAK_LOOKBACK_DAYS = 6 + 1;
const MANUAL_BREAK_WARNING_DAYS = 5;

function employeeName(employee: Employee): string {
  return `${employee.first_name} ${employee.last_name}`.trim();
}

function netMinutes(entry: TimeEntry, nowIso: string): number {
  const end = entry.clock_out ?? nowIso;
  const elapsed = (Date.parse(end) - Date.parse(entry.clock_in)) / 60_000;
  return Math.max(0, Math.round(elapsed - (entry.break_minutes ?? 0)));
}

function entryActions(input: CockpitActionInput): CockpitActionItem[] {
  const employeeMap = new Map(input.employees.map((employee) => [employee.id, employee]));
  const actions: CockpitActionItem[] = [];
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
  }
  return actions;
}

function missingManualBreakActions(input: CockpitActionInput): CockpitActionItem[] {
  const firstDate = addDays(input.endDate, -(MANUAL_BREAK_LOOKBACK_DAYS - 1));
  const employeeMap = new Map(input.employees.map((employee) => [employee.id, employee]));
  const days = new Map<string, Map<string, { grossMinutes: number; manualBreakMinutes: number }>>();

  for (const entry of input.recentBreakEntries) {
    if (
      entry.status !== "completed" ||
      !entry.clock_out ||
      entry.date < firstDate ||
      entry.date > input.endDate ||
      !employeeMap.has(entry.employee_id)
    ) continue;

    const employeeDays = days.get(entry.employee_id) ?? new Map();
    const day = employeeDays.get(entry.date) ?? { grossMinutes: 0, manualBreakMinutes: 0 };
    const elapsed = (Date.parse(entry.clock_out) - Date.parse(entry.clock_in)) / 60_000;
    day.grossMinutes += Math.max(0, Math.round(elapsed));
    day.manualBreakMinutes += Math.max(
      0,
      (entry.break_minutes ?? 0) - (entry.automatic_break_minutes ?? 0),
    );
    employeeDays.set(entry.date, day);
    days.set(entry.employee_id, employeeDays);
  }

  const actions: CockpitActionItem[] = [];
  for (const [employeeId, employeeDays] of days) {
    const affectedDates = [...employeeDays]
      .filter(([, day]) => day.grossMinutes > 6 * 60 && day.manualBreakMinutes === 0)
      .map(([date]) => date)
      .sort();
    if (affectedDates.length < MANUAL_BREAK_WARNING_DAYS) continue;

    const employee = employeeMap.get(employeeId);
    if (!employee) continue;
    const name = employeeName(employee);
    actions.push({
      id: `missing-manual-break-${employeeId}-${affectedDates.join("_")}`,
      kind: "missing_manual_break",
      severity: "warning",
      title: "Pausenerfassung gemeinsam prüfen",
      description: `${name} · ${affectedDates.length} Tage ohne manuell erfasste Pause in den letzten 7 Tagen`,
      detail: "Bitte klären, ob die Pausen tatsächlich genommen und korrekt erfasst wurden.",
      employeeId,
      employeeName: name,
      date: affectedDates.at(-1) ?? input.endDate,
      href: null,
    });
  }
  return actions;
}

function correctionActions(input: CockpitActionInput): CockpitActionItem[] {
  const names = new Map(input.employees.map((employee) => [employee.id, employeeName(employee)]));
  return input.corrections
    .filter((request) => request.status === "pending")
    .filter((request) => input.employees.some((employee) => employee.id === request.employee_id))
    .map((request) => ({
      id: `correction-${request.id}`,
      kind: "pending_correction" as const,
      severity: "warning" as const,
      title: "Korrekturanfrage offen",
      description: `${names.get(request.employee_id) ?? "Unbekannt"} · ${formatDate(request.timeEntry?.date ?? request.created_at.slice(0, 10))} · Grund: ${request.reason}`,
      detail: correctionChangeSummary(request),
      employeeId: request.employee_id,
      employeeName: names.get(request.employee_id) ?? "Unbekannt",
      date: request.timeEntry?.date ?? request.created_at.slice(0, 10),
      href: "/app/reports?tab=corrections",
    }));
}

interface CockpitActionInput {
  employees: Employee[];
  entries: TimeEntry[];
  recentBreakEntries: TimeEntry[];
  missingEntryEntries?: TimeEntry[];
  corrections: CorrectionRequestWithEntry[];
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
    ...missingManualBreakActions(input),
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


function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
}
