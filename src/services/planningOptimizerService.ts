export { applyPlanningJob } from "@/services/planningProposalService";
import type {
  PlanningContext,
  PlanningJobPayload,
  PlanningShift,
  PlanningState,
} from "@/types/planning";
import {
  planningAddDays,
  planningAddMonths,
  planningDay,
  planningLocal,
} from "@/config/client/planning-calendar";
import {
  planningNetMinutes,
  planningShiftIssues,
} from "@/services/planningShiftRules";
import { PlanningError } from "@/services/planningPeriodService";
import { planningTargetMinutes } from "@/services/planningBalanceService";

export function buildPlanningJob(
  state: PlanningState,
  context: PlanningContext,
  version: number,
  month: string,
): PlanningJobPayload {
  const period = state.periods.find((p) => p.month === month);
  if (!period || period.status === "closed")
    throw new PlanningError("Der Planungsmonat fehlt oder ist abgeschlossen.");
  const selectedPeriods = state.periods.filter(
    (p) => p.month >= month && p.status !== "closed",
  );
  const shifts = selectedPeriods
    .flatMap((p) => p.shifts)
    .filter((s) => Date.parse(s.start) >= Date.parse(context.now));
  if (shifts.length > 20000)
    throw new PlanningError(
      "Der Rechenlauf enthält mehr als 20.000 Schichten. Bitte einen späteren Startmonat wählen.",
    );
  if (shifts.length * state.config.profiles.length > 2_000_000)
    throw new PlanningError(
      "Bitte diesen Rechenlauf nach Filialteams aufteilen; die Kandidatenmenge ist zu groß.",
    );
  const profiles = state.config.profiles;
  const neighboring = state.periods
    .filter((p) => p.month < month)
    .flatMap((p) => p.shifts)
    .filter((s) => s.employeeId && s.date >= context.today);
  const reservedIntervals = new Map(
    profiles.map((p) => [
      p.employeeId,
      [
        ...neighboring.filter((s) => s.employeeId === p.employeeId),
        ...p.externalWork,
        ...context.actual
          .filter((e) => e.employeeId === p.employeeId)
          .map((e) => ({ start: e.start, end: e.end ?? context.now })),
      ],
    ]),
  );
  const candidate = (s: PlanningShift, employeeId: string) => {
    const test = {
      ...s,
      employeeId,
      substituteDate: s.substituteDate ?? planningAddDays(s.date, 1),
    };
    if (planningShiftIssues(state, context, test).length) return false;
    const intervals = reservedIntervals.get(employeeId) ?? [];
    return !intervals.some(
      (i) =>
        Date.parse(i.start) < Date.parse(s.end) + 660 * 60000 &&
        Date.parse(i.end) > Date.parse(s.start) - 660 * 60000,
    );
  };
  const candidates = new Map(
    shifts.map((s) => [
      s.id,
      profiles
        .filter(
          (p) =>
            (!s.locked || s.employeeId === p.employeeId) &&
            candidate(s, p.employeeId),
        )
        .map((p) => p.employeeId),
    ]),
  );
  const sorted = [...shifts].sort((a, b) => a.start.localeCompare(b.start));
  const conflicts: [string, string][] = [];
  for (let i = 0; i < sorted.length; i++)
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i],
        b = sorted[j];
      if (Date.parse(b.start) >= Date.parse(a.end) + 660 * 60000) break;
      if (
        !candidates.get(a.id)!.some((id) => candidates.get(b.id)!.includes(id))
      )
        continue;
      const gap = Math.max(
        Date.parse(a.start) - Date.parse(b.end),
        Date.parse(b.start) - Date.parse(a.end),
      );
      if (gap < 660 * 60000) conflicts.push([a.id, b.id]);
      if (conflicts.length > 500000)
        throw new PlanningError(
          "Der Rechenlauf enthält zu viele Überschneidungen. Bitte Filialteams gezielter zuordnen.",
        );
    }
  if (shifts.length * profiles.length > 2_000_000)
    throw new PlanningError(
      "Bitte diesen Rechenlauf nach Filialteams aufteilen; die Kandidatenmenge ist zu groß.",
    );
  const reservedDaily: { employeeId: string; date: string; minutes: number }[] =
    [];
  const reservedWeekly = profiles.flatMap((profile) => {
    const items = [
      ...neighboring
        .filter((s) => s.employeeId === profile.employeeId)
        .map((s) => ({ start: s.start, minutes: planningNetMinutes(s) })),
      ...profile.externalWork.map((s) => ({
        start: s.start,
        minutes: planningNetMinutes(s),
      })),
      ...context.actual
        .filter((e) => e.employeeId === profile.employeeId)
        .map((e) => ({ start: e.start, minutes: e.netMinutes })),
    ];
    const weeks = new Map<string, number>(),
      daily = new Map<string, number>();
    for (const item of items) {
      const d = planningLocal(item.start).date;
      const week = planningAddDays(d, -((planningDay(d) + 6) % 7));
      weeks.set(week, (weeks.get(week) ?? 0) + item.minutes);
      daily.set(d, (daily.get(d) ?? 0) + item.minutes);
    }
    reservedDaily.push(
      ...[...daily].map(([date, minutes]) => ({
        employeeId: profile.employeeId,
        date,
        minutes,
      })),
    );
    return [...weeks].map(([week, minutes]) => ({
      employeeId: profile.employeeId,
      week,
      minutes,
    }));
  });
  return {
    version,
    timeLimitSeconds: 60,
    conflicts,
    reservedWeekly,
    reservedDaily,
    shifts: shifts.map((s) => ({
      id: s.id,
      start: Date.parse(s.start),
      end: Date.parse(s.end),
      minutes: planningNetMinutes(s),
      date: s.date,
      locationId: s.locationId,
      fixedEmployeeId: s.locked ? s.employeeId : null,
      originalEmployeeId: s.employeeId,
      weekend: planningDay(s.date) === 0 || planningDay(s.date) === 6,
      night:
        planningLocal(s.start).time < "05:00" ||
        planningLocal(s.start).time >= "22:00" ||
        planningLocal(s.end).date !== s.date,
      candidates: candidates.get(s.id)!,
    })),
    employees: context.employees
      .filter((e) => profiles.some((p) => p.employeeId === e.id))
      .map((e) => ({
        id: e.id,
        weeklyMinutes: profiles.find((p) => p.employeeId === e.id)!
          .maxWeeklyMinutes,
        targetMinutes: Math.max(
          0,
          planningTargetMinutes(
            e,
            context,
            period.month <= context.today
              ? planningAddDays(context.today, 1)
              : period.month,
            planningAddDays(
              planningAddMonths(selectedPeriods.at(-1)!.month, 1),
              -1,
            ),
          ) - Math.round((e.balanceComplete ? e.balanceMinutes : 0) / 3),
        ),
        initialMinutes: neighboring
          .filter((s) => s.employeeId === e.id)
          .reduce((sum, s) => sum + planningNetMinutes(s), 0),
        preferredDays: profiles.find((p) => p.employeeId === e.id)!
          .preferredDays,
      })),
  };
}
