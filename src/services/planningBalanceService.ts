import type {
  PlanningContext,
  PlanningEmployee,
  PlanningState,
} from "@/types/planning";
import {
  planningAddDays,
  planningAddMonths,
} from "@/config/client/planning-calendar";
import { calculateScheduleTargetMinutesForRange } from "@/services/workScheduleService";
import { planningNetMinutes } from "@/services/planningShiftRules";

export function planningTargetMinutes(
  employee: PlanningEmployee,
  context: PlanningContext,
  from: string,
  until: string,
): number {
  const excluded = new Set(
    context.employeeHolidays.find((h) => h.employeeId === employee.id)?.dates ??
      [],
  );
  for (const a of context.absences.filter(
    (a) => a.employeeId === employee.id,
  )) {
    for (
      let d = a.start < from ? from : a.start;
      d <= (a.end && a.end < until ? a.end : until);
      d = planningAddDays(d, 1)
    )
      excluded.add(d);
  }
  return calculateScheduleTargetMinutesForRange(
    from < employee.employmentStart ? employee.employmentStart : from,
    until,
    excluded,
    employee.employmentSchedule ?? employee.workSchedule,
    employee.targetHoursWeek,
  );
}
export function planningBalanceForecast(
  state: PlanningState,
  context: PlanningContext,
  employee: PlanningEmployee,
  month: string,
) {
  const until = planningAddDays(planningAddMonths(month, 1), -1);
  const shifts = state.periods
    .flatMap((p) => p.shifts)
    .filter((s) => s.employeeId === employee.id);
  const plannedMinutes = shifts
    .filter((s) => s.date >= month && s.date <= until)
    .reduce((sum, s) => sum + planningNetMinutes(s), 0);
  const actualMinutes = context.actual
    .filter(
      (e) => e.employeeId === employee.id && e.date >= month && e.date <= until,
    )
    .reduce((sum, e) => sum + e.netMinutes, 0);
  const futurePlanned = shifts
    .filter(
      (s) => Date.parse(s.start) >= Date.parse(context.now) && s.date <= until,
    )
    .reduce((sum, s) => sum + planningNetMinutes(s), 0);
  const futureTarget = planningTargetMinutes(
    employee,
    context,
    planningAddDays(context.today, 1),
    until,
  );
  return {
    plannedMinutes,
    actualMinutes,
    targetMinutes: planningTargetMinutes(employee, context, month, until),
    forecastMinutes: employee.balanceMinutes + futurePlanned - futureTarget,
    provisional:
      !employee.balanceComplete ||
      context.actual.some((e) => e.employeeId === employee.id && !e.end) ||
      context.absences.some((a) => a.employeeId === employee.id && !a.end),
  };
}
