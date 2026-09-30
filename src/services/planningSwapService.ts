import type {
  PlanningContext,
  PlanningShift,
  PlanningState,
} from "@/types/planning";
import {
  publishPlanningPeriod,
  PlanningError,
} from "@/services/planningPeriodService";
import { planningShiftSchema } from "@/types/planning-schemas";

export function approvePlanningSwap(
  state: PlanningState,
  context: PlanningContext,
  sourceSnapshot: PlanningShift,
  targetSnapshot: PlanningShift,
): PlanningState {
  const next = structuredClone(state);
  const sourcePeriod = next.periods.find((p) =>
    p.shifts.some((s) => s.id === sourceSnapshot.id),
  );
  const targetPeriod = next.periods.find((p) =>
    p.shifts.some((s) => s.id === targetSnapshot.id),
  );
  const source = sourcePeriod?.shifts.find((s) => s.id === sourceSnapshot.id);
  const target = targetPeriod?.shifts.find((s) => s.id === targetSnapshot.id);
  const same = (a: PlanningShift | undefined, b: PlanningShift) =>
    a &&
    JSON.stringify(planningShiftSchema.parse(a)) ===
      JSON.stringify(planningShiftSchema.parse(b));
  if (
    !source ||
    !target ||
    !sourcePeriod ||
    !targetPeriod ||
    !same(source, sourceSnapshot) ||
    !same(target, targetSnapshot) ||
    !same(
      sourcePeriod.publishedShifts.find((s) => s.id === source.id),
      sourceSnapshot,
    ) ||
    !same(
      targetPeriod.publishedShifts.find((s) => s.id === target.id),
      targetSnapshot,
    )
  )
    throw new PlanningError(
      "Die betroffenen Schichten haben sich verändert. Bitte den Tausch erneut anfragen.",
      409,
    );
  if (source.date < context.today || target.date < context.today)
    throw new PlanningError(
      "Vergangene Schichten können nicht getauscht werden.",
    );
  const employee = source.employeeId;
  source.employeeId = target.employeeId;
  target.employeeId = employee;
  for (const period of new Set([sourcePeriod, targetPeriod])) {
    if (period.status !== "announced" && period.status !== "fixed")
      throw new PlanningError(
        "Es können nur freigegebene Schichten getauscht werden.",
      );
    publishPlanningPeriod(next, context, period.month, period.status);
  }
  return next;
}
