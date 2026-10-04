import type {
  PlanningContext,
  PlanningState,
  PlanningJobResult,
} from "@/types/planning";
import { planningRestWindows } from "@/services/planningRestService";
import {
  PLANNING_SUNDAY_REST_WINDOW_DAYS,
  PLANNING_HOLIDAY_REST_WINDOW_DAYS,
} from "@/config/planning";
import {
  planningAddDays,
  planningDay,
} from "@/config/client/planning-calendar";
import { PlanningError } from "@/services/planningPeriodService";
import { validatePlanning } from "@/services/planningValidationService";
export function applyPlanningJob(
  state: PlanningState,
  context: PlanningContext,
  month: string,
  result: PlanningJobResult,
): PlanningState {
  if (!["optimal", "feasible"].includes(result.status))
    throw new PlanningError(
      "Dieser Rechenlauf hat keinen verwendbaren Vorschlag.",
    );
  const next = structuredClone(state),
    period = next.periods.find((p) => p.month === month);
  if (!period) throw new PlanningError("Planungsmonat nicht gefunden.");
  const selected = next.periods
    .filter((p) => p.month >= month && p.status !== "closed")
    .flatMap((p) => p.shifts);
  const byShift = new Map(
    result.assignments.map((a) => [a.shiftId, a.employeeId]),
  );
  if (
    byShift.size !== result.assignments.length ||
    result.assignments.some((a) => !selected.some((s) => s.id === a.shiftId))
  )
    throw new PlanningError(
      "Der Vorschlag enthält ungültige Schichtzuordnungen.",
    );
  for (const s of selected.filter(
    (s) => Date.parse(s.start) >= Date.parse(context.now),
  )) {
    const employeeId = byShift.get(s.id);
    if (!employeeId || (s.locked && s.employeeId !== employeeId))
      throw new PlanningError(
        "Der Vorschlag ist unvollständig oder verändert gesperrte Schichten.",
      );
    if (s.employeeId !== employeeId) s.substituteDate = null;
    s.employeeId = employeeId;
  }
  // Explicit rest reservations are part of the proposal and rechecked at apply/publish.
  for (const s of selected) {
    const holiday =
      context.holidays
        .find((h) => h.locationId === s.locationId)
        ?.dates.includes(s.date) ||
      next.config.locations
        .find((l) => l.id === s.locationId)
        ?.additionalHolidays.includes(s.date);
    if (planningDay(s.date) !== 0 && !holiday) continue;
    if (s.substituteDate) continue;
    const own = next.periods
      .flatMap((p) => p.shifts)
      .filter((i) => i.employeeId === s.employeeId);
    for (
      let n = 1;
      n <=
      (planningDay(s.date) === 0
        ? PLANNING_SUNDAY_REST_WINDOW_DAYS - 1
        : PLANNING_HOLIDAY_REST_WINDOW_DAYS - 1);
      n++
    ) {
      const date = planningAddDays(s.date, n);
      if (
        planningDay(date) === 0 ||
        context.holidays
          .find((h) => h.locationId === s.locationId)
          ?.dates.includes(date) ||
        next.config.locations
          .find((l) => l.id === s.locationId)
          ?.additionalHolidays.includes(date)
      )
        continue;
      const obligations = [
        ...own,
        ...(next.config.profiles.find((p) => p.employeeId === s.employeeId)
          ?.externalWork ?? []),
        ...context.actual
          .filter((e) => e.employeeId === s.employeeId)
          .map((e) => ({ start: e.start, end: e.end ?? context.now })),
      ];
      if (
        planningRestWindows(date).some(
          ([a, b]) =>
            !obligations.some(
              (i) => Date.parse(i.start) < b && Date.parse(i.end) > a,
            ),
        ) &&
        !own.some(
          (i) =>
            i.id !== s.id && i.substituteDate === date && i.date !== s.date,
        )
      ) {
        s.substituteDate = date;
        break;
      }
    }
  }
  const errors = validatePlanning(next, context).filter(
    (i) => i.severity === "error",
  );
  if (errors.length)
    throw new PlanningError(
      `Vorschlag kann nicht übernommen werden: ${errors[0].message}`,
    );
  return next;
}
