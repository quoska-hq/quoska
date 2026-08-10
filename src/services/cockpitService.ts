import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorrectionRequest, Employee, Project, TimeEntry } from "@/types/database";
import type {
  CockpitData,
  CockpitDailyPoint,
  CockpitEmployeeRow,
  CockpitProjectRow,
} from "@/types/cockpit";
import { success, failure, type ApiResponse } from "@/types/api";
import { addDays } from "@/services/holidayService";
import { scheduledMinutesForDate } from "@/services/workScheduleService";
import { buildCockpitActivity } from "@/services/cockpitActivityService";
import {
  absenceTypeOnDate,
  buildCockpitActions,
  countEmployeeAbsenceDays,
  type CockpitAbsences,
} from "@/services/cockpitInsightsService";
import { getEmployeesByTenant } from "@/repos/employeeRepo";
import { getHolidayDatesInRange } from "@/repos/holidayRepo";
import { getApprovedLeavesForTenant } from "@/repos/leaveRepo";
import { getActiveSickForTenant } from "@/repos/sickEntryRepo";
import { getPendingCorrectionRequests } from "@/repos/correctionRequestRepo";
import {
  getCockpitAuditRecords,
  getCockpitActiveEntries,
  getCockpitProjects,
  getCockpitTenantState,
  getCockpitTimeEntries,
  type CockpitAuditRecord,
} from "@/repos/cockpitRepo";

interface CockpitBuildInput {
  employees: Employee[];
  scopedEmployees: Employee[];
  entries: TimeEntry[];
  projects: Project[];
  audits: CockpitAuditRecord[];
  absences: CockpitAbsences;
  corrections: CorrectionRequest[];
  holidaysByState: Map<string, ReadonlyMap<string, string>>;
  tenantState: string;
  startDate: string;
  endDate: string;
  days: 7 | 30;
  employeeId?: string;
  nowIso: string;
}

function netMinutes(entry: TimeEntry): number {
  if (entry.status !== "completed" || !entry.clock_out) return 0;
  const elapsed = (Date.parse(entry.clock_out) - Date.parse(entry.clock_in)) / 60_000;
  return Math.max(0, Math.round(elapsed - (entry.break_minutes ?? 0)));
}

function datesInRange(startDate: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDays(startDate, index));
}

function employeeTarget(
  employee: Employee,
  dates: string[],
  holidaysByState: Map<string, ReadonlyMap<string, string>>,
  tenantState: string,
  absences: CockpitAbsences,
): number {
  const state = employee.bundesland ?? tenantState;
  const holidays = holidaysByState.get(state) ?? new Map<string, string>();
  const joinedOn = employee.created_at.slice(0, 10);
  return dates.reduce((total, date) => {
    if (
      date < joinedOn ||
      holidays.has(date) ||
      absenceTypeOnDate(employee.id, date, absences)
    ) return total;
    return total + scheduledMinutesForDate(
      employee.work_schedule,
      date,
      employee.target_hours_week,
    );
  }, 0);
}

function buildDaily(
  dates: string[],
  employees: Employee[],
  entries: TimeEntry[],
  input: CockpitBuildInput,
): CockpitDailyPoint[] {
  return dates.map((date) => ({
    date,
    workedMinutes: entries
      .filter((entry) => entry.date === date)
      .reduce((total, entry) => total + netMinutes(entry), 0),
    targetMinutes: employees.reduce(
      (total, employee) => total + employeeTarget(
        employee,
        [date],
        input.holidaysByState,
        input.tenantState,
        input.absences,
      ),
      0,
    ),
  }));
}

function topProjectName(
  employeeId: string,
  entries: TimeEntry[],
  projectNames: Map<string, string>,
): string | null {
  const active = entries.find(
    (entry) => entry.employee_id === employeeId && entry.status !== "completed",
  );
  if (active?.project_id) return projectNames.get(active.project_id) ?? "Unbekannt";

  const totals = new Map<string, number>();
  for (const entry of entries.filter((item) => item.employee_id === employeeId)) {
    const key = entry.project_id ?? "__none__";
    totals.set(key, (totals.get(key) ?? 0) + netMinutes(entry));
  }
  const top = [...totals].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top) return null;
  return top === "__none__" ? "Ohne Projekt" : projectNames.get(top) ?? "Unbekannt";
}

function buildEmployeeRows(
  employees: Employee[],
  entries: TimeEntry[],
  dates: string[],
  input: CockpitBuildInput,
): CockpitEmployeeRow[] {
  const projectNames = new Map(input.projects.map((project) => [project.id, project.name]));
  return employees.map((employee) => {
    const ownEntries = entries.filter((entry) => entry.employee_id === employee.id);
    const workedMinutes = ownEntries.reduce((total, entry) => total + netMinutes(entry), 0);
    const targetMinutes = employeeTarget(
      employee,
      dates,
      input.holidaysByState,
      input.tenantState,
      input.absences,
    );
    const active = ownEntries.find((entry) => entry.status !== "completed");
    const status: CockpitEmployeeRow["status"] = active?.status === "paused"
      ? "paused"
      : active
        ? "running"
        : "off";
    const state = employee.bundesland ?? input.tenantState;
    const holidays = input.holidaysByState.get(state) ?? new Map<string, string>();
    const joinedOn = employee.created_at.slice(0, 10);
    const scheduledDates = dates.filter((date) =>
      date >= joinedOn &&
      !holidays.has(date) &&
      scheduledMinutesForDate(
        employee.work_schedule,
        date,
        employee.target_hours_week,
      ) > 0);
    const { leaveDays, sickDays } = countEmployeeAbsenceDays(
      employee.id,
      scheduledDates,
      input.absences,
    );
    return {
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      workedMinutes,
      targetMinutes,
      deltaMinutes: workedMinutes - targetMinutes,
      status,
      projectName: topProjectName(employee.id, entries, projectNames),
      currentProjectName: active?.project_id
        ? projectNames.get(active.project_id) ?? "Unbekannt"
        : null,
      entryCount: ownEntries.length,
      leaveDays,
      sickDays,
    };
  }).sort((a, b) => b.workedMinutes - a.workedMinutes);
}

function buildProjects(entries: TimeEntry[], projects: Project[]): CockpitProjectRow[] {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.project_id ?? "__none__";
    totals.set(key, (totals.get(key) ?? 0) + netMinutes(entry));
  }
  const totalMinutes = [...totals.values()].reduce((sum, minutes) => sum + minutes, 0);
  return [...totals]
    .filter(([, minutes]) => minutes > 0)
    .map(([key, minutes]) => {
      const project = projectMap.get(key);
      return {
        id: project?.id ?? null,
        name: project?.name ?? "Ohne Projekt",
        color: project?.color ?? null,
        minutes,
        sharePercent: totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

export function buildCockpitData(input: CockpitBuildInput): CockpitData {
  const dates = datesInRange(input.startDate, input.days);
  const daily = buildDaily(dates, input.scopedEmployees, input.entries, input);
  const employeeRows = buildEmployeeRows(input.scopedEmployees, input.entries, dates, input);
  const workedMinutes = daily.reduce((total, day) => total + day.workedMinutes, 0);
  const targetMinutes = daily.reduce((total, day) => total + day.targetMinutes, 0);
  return {
    period: { startDate: input.startDate, endDate: input.endDate, days: input.days },
    selectedEmployeeId: input.employeeId ?? null,
    employees: input.employees.map((employee) => ({
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`.trim(),
    })),
    summary: {
      workedMinutes,
      targetMinutes,
      activeNow: employeeRows.filter((row) => row.status !== "off").length,
      peopleCount: input.scopedEmployees.length,
      completionPercent: targetMinutes ? Math.round((workedMinutes / targetMinutes) * 100) : 0,
    },
    daily,
    employeeRows,
    projects: buildProjects(input.entries, input.projects),
    activity: buildCockpitActivity(input.audits, input.employees, input.projects),
    actions: buildCockpitActions({
      employees: input.scopedEmployees,
      entries: input.entries,
      corrections: input.corrections,
      absences: input.absences,
      holidaysByState: input.holidaysByState,
      tenantState: input.tenantState,
      startDate: input.startDate,
      endDate: input.endDate,
      nowIso: input.nowIso,
    }),
  };
}

export async function getAdminCockpit(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
  days: 7 | 30,
  nowIso: string,
  employeeId?: string,
): Promise<ApiResponse<CockpitData>> {
  const [
    employees,
    entries,
    activeEntries,
    projects,
    audits,
    tenantState,
    leaves,
    sicknesses,
    corrections,
  ] = await Promise.all([
    getEmployeesByTenant(supabase, tenantId),
    getCockpitTimeEntries(supabase, tenantId, startDate, endDate, employeeId),
    getCockpitActiveEntries(supabase, tenantId, employeeId),
    getCockpitProjects(supabase, tenantId),
    getCockpitAuditRecords(supabase, tenantId, `${startDate}T00:00:00.000Z`, employeeId),
    getCockpitTenantState(supabase, tenantId),
    getApprovedLeavesForTenant(supabase, tenantId, startDate, endDate),
    getActiveSickForTenant(supabase, tenantId, startDate, endDate),
    getPendingCorrectionRequests(supabase, tenantId),
  ]);
  const scopedEmployees = employeeId
    ? employees.filter((employee) => employee.id === employeeId)
    : employees;
  if (employeeId && scopedEmployees.length === 0) {
    return failure("Mitarbeiter nicht gefunden.");
  }
  const allEntries = [
    ...entries,
    ...activeEntries.filter((active) => !entries.some((entry) => entry.id === active.id)),
  ];
  const states = [...new Set(employees.map((employee) => employee.bundesland ?? tenantState))];
  const holidayRows = await Promise.all(states.map(async (state) => [
    state,
    await getHolidayDatesInRange(supabase, state, startDate, endDate),
  ] as const));
  return success(buildCockpitData({
    employees,
    scopedEmployees,
    entries: allEntries,
    projects,
    audits,
    absences: { leaves, sicknesses },
    corrections,
    holidaysByState: new Map(holidayRows),
    tenantState,
    startDate,
    endDate,
    days,
    employeeId,
    nowIso,
  }));
}
