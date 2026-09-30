import type {
  PlanningContext,
  PlanningIssue,
  PlanningProfile,
} from "@/types/planning";
import {
  planningAddDays,
  planningDay,
  planningLocal,
} from "@/config/client/planning-calendar";
import { planningNetMinutes } from "@/services/planningShiftRules";
export function planningExternalIssues(
  profile: PlanningProfile,
  context: PlanningContext,
): PlanningIssue[] {
  const issues: PlanningIssue[] = [];
  const fail = (code: string, message: string, date: string) =>
    issues.push({
      code,
      message,
      date,
      employeeId: profile.employeeId,
      severity: date < context.today ? "warning" : "error",
    });
  for (const work of profile.externalWork) {
    let cursor = Date.parse(work.start);
    const pauseMinutes = work.breaks.reduce(
      (sum, pause) =>
        sum + (Date.parse(pause.end) - Date.parse(pause.start)) / 60000,
      0,
    );
    if (planningNetMinutes(work) > 360 && pauseMinutes < 30)
      fail(
        "external_break",
        "Bei mehr als sechs Stunden einer weiteren Beschäftigung fehlen insgesamt 30 Minuten Pause.",
        planningLocal(work.start).date,
      );
    const externalHolidays =
      context.employeeHolidays.find((h) => h.employeeId === profile.employeeId)
        ?.dates ?? [];
    for (
      let d = planningLocal(work.start).date;
      d <= planningLocal(Date.parse(work.end) - 1).date;
      d = planningAddDays(d, 1)
    )
      if (
        d >= context.today &&
        (planningDay(d) === 0 || externalHolidays.includes(d))
      )
        fail(
          "external_protected_day",
          "Sonn- oder Feiertagsarbeit in einer weiteren Beschäftigung benötigt ein gesondertes geprüftes Berechtigungs- und Ersatzruheprofil.",
          d,
        );
    for (const pause of [...work.breaks].sort(
      (a, b) => Date.parse(a.start) - Date.parse(b.start),
    )) {
      const a = Date.parse(pause.start),
        b = Date.parse(pause.end);
      if (a < cursor || b > Date.parse(work.end) || b - a < 15 * 60000)
        fail(
          "external_break",
          "Pausen einer weiteren Beschäftigung sind nicht gültig hinterlegt.",
          planningLocal(work.start).date,
        );
      cursor = b;
    }
  }
  return issues;
}
