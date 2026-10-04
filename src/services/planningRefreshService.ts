import type { PlanningContext, PlanningState } from "@/types/planning";
import {
  generatePlanningPeriod,
  PlanningError,
} from "@/services/planningPeriodService";
export function refreshPlanningPeriod(
  state: PlanningState,
  context: PlanningContext,
  month: string,
): PlanningState {
  const next = structuredClone(state),
    period = next.periods.find((p) => p.month === month);
  if (!period || period.status === "closed")
    throw new PlanningError("Dieser Monat kann nicht neu aufgebaut werden.");
  const regenerated = generatePlanningPeriod(
    { ...next, periods: next.periods.filter((p) => p.month !== month) },
    month,
    context.today,
    context.holidays,
    context.now,
  );
  const matched = new Set<string>();
  period.shifts = regenerated.shifts
    .filter((s) => Date.parse(s.start) >= Date.parse(context.now))
    .map((s) => {
      const prior = period.shifts.find(
        (v) =>
          v.templateId === s.templateId &&
          v.date === s.date &&
          !matched.has(v.id),
      );
      if (!prior) return s;
      matched.add(prior.id);
      return prior.locked
        ? prior
        : {
            ...s,
            id: prior.id,
            employeeId: prior.employeeId,
            substituteDate: prior.substituteDate,
          };
    })
    .concat(
      period.shifts.filter(
        (s) =>
          !matched.has(s.id) &&
          (s.locked || Date.parse(s.start) < Date.parse(context.now)),
      ),
    );
  return next;
}
