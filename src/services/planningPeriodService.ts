import { formatDateFullDE } from "@/config/client/date-utils";
import type {
  PlanningContext,
  PlanningPeriod,
  PlanningShift,
  PlanningState,
} from "@/types/planning";
import {
  planningFirstMonth,
  planningAddDays,
  planningAddMonths,
  planningDay,
  planningIso,
  planningWallTime,
} from "@/config/client/planning-calendar";
import { validatePlanning } from "@/services/planningValidationService";
import { planningShiftIssues } from "@/services/planningShiftRules";

export class PlanningError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function generatePlanningPeriod(
  state: PlanningState,
  month: string,
  today: string,
  holidays: PlanningContext["holidays"] = [],
  now?: string,
): PlanningPeriod {
  if (
    !month.endsWith("-01") ||
    month < planningFirstMonth(today, state.config.firstMonth) ||
    month >
      planningAddMonths(planningFirstMonth(today, state.config.firstMonth), 2)
  )
    throw new PlanningError(
      "Es können nur die aktuellen drei Planungsmonate angelegt werden.",
    );
  if (state.periods.some((p) => p.month === month))
    throw new PlanningError("Dieser Monat ist bereits angelegt.", 409);
  const shifts: PlanningShift[] = [];
  for (
    let date = month;
    date < planningAddMonths(month, 1);
    date = planningAddDays(date, 1)
  ) {
    if (date < today) continue;
    for (const t of state.config.templates.filter(
      (t) => t.active && t.days.includes(planningDay(date)),
    )) {
      if (
        t.holidayMode === "skip" &&
        (holidays
          .find((h) => h.locationId === t.locationId)
          ?.dates.includes(date) ||
          state.config.locations
            .find((l) => l.id === t.locationId)
            ?.additionalHolidays.includes(date))
      )
        continue;
      let start: string;
      try {
        start = planningWallTime(date, t.start);
      } catch (error) {
        throw new PlanningError(
          `${formatDateFullDE(date)}: ${error instanceof Error ? error.message : "Ungültige Schichtzeit."}`,
        );
      }
      if (now && Date.parse(start) < Date.parse(now)) continue;
      let end: string;
      try {
        end = planningWallTime(
          t.nextDay ? planningAddDays(date, 1) : date,
          t.end,
        );
      } catch (error) {
        throw new PlanningError(
          `${formatDateFullDE(date)}: ${error instanceof Error ? error.message : "Ungültige Schichtzeit."}`,
        );
      }
      for (let slot = 0; slot < t.count; slot++)
        shifts.push({
          id: crypto.randomUUID(),
          templateId: t.id,
          locationId: t.locationId,
          skillId: t.skillId,
          date,
          start,
          end,
          breaks: t.breaks.map((b) => ({
            start: planningIso(Date.parse(start) + b.offsetMinutes * 60000),
            end: planningIso(
              Date.parse(start) + (b.offsetMinutes + b.minutes) * 60000,
            ),
          })),
          employeeId: null,
          locked: false,
          substituteDate: null,
        });
    }
  }
  if (shifts.length > 20000)
    throw new PlanningError(
      "Der Monat enthält mehr als 20.000 Schichten. Bitte den Bedarf aufteilen.",
    );
  return { month, shifts, status: "draft", publishedShifts: [], revision: 0 };
}
export function assignPlanningShift(
  state: PlanningState,
  context: PlanningContext,
  incoming: PlanningShift,
  reason: string,
): PlanningState {
  const next = structuredClone(state);
  const period = next.periods.find((p) =>
    p.shifts.some((s) => s.id === incoming.id),
  );
  const old = period?.shifts.find((s) => s.id === incoming.id);
  if (
    !period ||
    !old ||
    period.status === "closed" ||
    Date.parse(old.start) < Date.parse(context.now)
  )
    throw new PlanningError("Diese Schicht kann nicht mehr geändert werden.");
  if (old.locked && reason.trim().length < 10)
    throw new PlanningError(
      "Für eine Änderung an einer gesperrten Schicht ist eine Begründung erforderlich.",
    );
  if (
    incoming.templateId !== old.templateId ||
    incoming.locationId !== old.locationId ||
    incoming.skillId !== old.skillId ||
    incoming.date !== old.date
  )
    throw new PlanningError(
      "Schichtzuordnung und Datum können hier nicht geändert werden.",
    );
  period.shifts[period.shifts.findIndex((s) => s.id === old.id)] = {
    ...incoming,
    locked: incoming.locked,
  };
  const unlockOnly =
    old.locked &&
    !incoming.locked &&
    JSON.stringify({ ...old, locked: false }) === JSON.stringify(incoming);
  if (incoming.employeeId && !unlockOnly) {
    const errors = [
      ...planningShiftIssues(next, context, incoming),
      ...validatePlanning(next, context).filter(
        (i) =>
          [
            "split_profile",
            "external_break",
            "continuous_aggregate",
            "overlap",
            "rest",
            "travel",
            "daily_aggregate",
            "weekly_limit",
            "substitute_busy",
          ].includes(i.code) &&
          i.employeeId === incoming.employeeId &&
          i.severity === "error",
      ),
    ];
    if (errors.length) throw new PlanningError(errors[0].message);
  }
  return next;
}
export function publishPlanningPeriod(
  state: PlanningState,
  context: PlanningContext,
  month: string,
  status: "announced" | "fixed",
): void {
  const period = state.periods.find((p) => p.month === month);
  if (
    !period ||
    period.status === "closed" ||
    month < context.today.slice(0, 7) + "-01"
  )
    throw new PlanningError("Dieser Monat kann nicht freigegeben werden.");
  if (period.status === "fixed" && status !== "fixed")
    throw new PlanningError(
      "Ein verbindlicher Monat kann nicht zurückgestuft werden.",
    );
  const errors = validatePlanning(state, context, month).filter(
    (i) => i.severity === "error",
  );
  if (errors.length)
    throw new PlanningError(
      `Freigabe gesperrt: ${errors[0].message} (${errors.length} Prüfhinweise)`,
    );
  period.status = status;
  period.revision++;
  if (status === "fixed")
    period.shifts.forEach((s) => {
      s.locked = true;
    });
  period.publishedShifts = structuredClone(period.shifts);
}
