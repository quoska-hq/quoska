import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanningContext, PlanningSnapshot } from "@/types/planning";
import { readPlanningInputs, readPlanningState } from "@/repos/planningRepo";
import { getNowIso, getTodayDate } from "@/config/server/timestamps";
import {
  planningAddDays,
  planningAddMonths,
} from "@/config/client/planning-calendar";
import { normalizeWorkSchedule } from "@/types/work-schedule";
import { presentEmploymentSchedule } from "@/services/employeeScheduleService";
import {
  netMinutesForEntry,
  employmentStartDate,
} from "@/services/overtimeService";
import { validatePlanning } from "@/services/planningValidationService";
import { PlanningError } from "@/services/planningPeriodService";
import { planningTargetMinutes } from "@/services/planningBalanceService";
import { totalTrackedNetMinutes } from "@/services/overtimeService";

export async function loadPlanningSnapshot(
  client: SupabaseClient,
  tenantId: string,
): Promise<PlanningSnapshot> {
  const today = getTodayDate(),
    now = getNowIso(),
    from = planningAddMonths(today.slice(0, 7) + "-01", -2);
  const before = await readPlanningState(client, tenantId, from);
  const inputs = await readPlanningInputs(client, tenantId);
  const after = await readPlanningState(client, tenantId, from);
  if (before.version !== after.version)
    throw new PlanningError(
      "Die Daten wurden inzwischen geändert. Bitte neu laden.",
      409,
    );
  const years = new Set<string>();
  for (
    let month = today.slice(0, 7) + "-01";
    month <= planningAddMonths(today.slice(0, 7) + "-01", 4);
    month = planningAddMonths(month, 1)
  )
    years.add(month.slice(0, 4));
  const historyBoundary = planningAddDays(today, -(7 + 7));
  const context: PlanningContext = {
    today,
    now,
    absences: inputs.absences,
    employees: inputs.employees.map((original) => {
      const e = presentEmploymentSchedule(original, today);
      return {
        id: e.id,
        name: `${e.first_name} ${e.last_name}`,
        targetHoursWeek: e.target_hours_week,
        workSchedule: normalizeWorkSchedule(
          e.work_schedule,
          e.target_hours_week,
        ),
        employmentSchedule: e.employment_schedule,
        employmentStart: employmentStartDate(e),
        openingBalanceMinutes: e.initial_overtime_minutes ?? 0,
        balanceMinutes: 0,
        balanceComplete: false,
        bundesland: e.bundesland ?? "berlin",
      };
    }),
    actual: inputs.entries
      .filter(
        (e) =>
          e.date >=
          (historyBoundary < today.slice(0, 4) + "-01-01"
            ? historyBoundary
            : today.slice(0, 4) + "-01-01"),
      )
      .map((e) => ({
        employeeId: e.employee_id,
        date: e.date,
        start: e.clock_in,
        end: e.clock_out,
        netMinutes: e.clock_out
          ? Math.max(0, netMinutesForEntry(e))
          : Math.max(
              0,
              Math.floor((Date.parse(now) - Date.parse(e.clock_in)) / 60000) -
                e.break_minutes,
            ),
      })),
    employeeHolidays: inputs.employees.map((e) => ({
      employeeId: e.id,
      dates: inputs.holidays
        .filter(
          (h) =>
            h.bundesland === "all" ||
            h.bundesland === (e.bundesland ?? "berlin"),
        )
        .map((h) => h.date),
    })),
    holidays: after.state.config.locations.map((location) => ({
      locationId: location.id,
      dates: inputs.holidays
        .filter(
          (h) => h.bundesland === "all" || h.bundesland === location.bundesland,
        )
        .map((h) => h.date),
      complete: [...years].every((y) =>
        ["01-01", "05-01", "10-03", "12-25", "12-26"].every((d) =>
          inputs.holidays.some(
            (h) => h.date === `${y}-${d}` && h.bundesland === "all",
          ),
        ),
      ),
    })),
  };
  for (const employee of context.employees) {
    const profile = after.state.config.profiles.find(
      (p) => p.employeeId === employee.id,
    );
    if (profile)
      profile.contractChanges = employee.employmentSchedule?.changes ?? [];
    employee.balanceMinutes =
      employee.openingBalanceMinutes +
      totalTrackedNetMinutes(
        inputs.entries.filter(
          (e) => e.employee_id === employee.id && e.date <= today,
        ),
        now,
      ) -
      planningTargetMinutes(employee, context, employee.employmentStart, today);
    employee.balanceComplete = true;
    for (
      let y = Number(employee.employmentStart.slice(0, 4));
      y <= Number(today.slice(0, 4));
      y++
    ) {
      if (
        !["01-01", "05-01", "10-03", "12-25", "12-26"].every((d) =>
          inputs.holidays.some(
            (h) => h.date === `${y}-${d}` && h.bundesland === "all",
          ),
        )
      )
        employee.balanceComplete = false;
    }
  }
  return {
    version: after.version,
    state: after.state,
    context,
    issues: validatePlanning(after.state, context),
    workerConfigured: (process.env.PLANNING_WORKER_TOKEN?.length ?? 0) >= 32,
  };
}
