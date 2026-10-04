import { planningExternalIssues } from "@/services/planningExternalRules";
import { planningRestWindows } from "@/services/planningRestService";
import {
  PLANNING_SUNDAY_REST_WINDOW_DAYS,
  PLANNING_HOLIDAY_REST_WINDOW_DAYS,
} from "@/config/planning";
import type {
  PlanningContext,
  PlanningIssue,
  PlanningShift,
  PlanningState,
} from "@/types/planning";
import {
  planningAddDays,
  planningDay,
  planningLocal,
  planningWallTime,
} from "@/config/client/planning-calendar";
import {
  planningNetMinutes,
  planningWorkSegments,
} from "@/services/planningShiftRules";

export function planningTimelineIssues(
  state: PlanningState,
  context: PlanningContext,
  shifts: PlanningShift[],
): PlanningIssue[] {
  const issues: PlanningIssue[] = [];
  for (const profile of state.config.profiles) {
    const own = shifts.filter((s) => s.employeeId === profile.employeeId);
    const plannedIds = new Set(own.map((s) => s.id));
    const intervals = [
      ...own.map((s) => ({
        start: s.start,
        end: s.end,
        minutes: planningNetMinutes(s),
        locationId: s.locationId,
        id: s.id,
      })),
      ...profile.externalWork.map((s) => ({
        ...s,
        minutes: planningNetMinutes(s),
        locationId: "external",
        id: "external",
      })),
      ...context.actual
        .filter((e) => e.employeeId === profile.employeeId)
        .map((e) => ({
          start: e.start,
          end: e.end ?? context.now,
          minutes: e.netMinutes,
          locationId: "actual",
          id: "actual",
        })),
    ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    const fail = (code: string, message: string, date?: string) =>
      issues.push({
        code,
        message,
        employeeId: profile.employeeId,
        date,
        severity: date && date < context.today ? "warning" : "error",
      });
    const segments = [...own, ...profile.externalWork]
      .flatMap(planningWorkSegments)
      .filter(([, b]) => b >= Date.parse(context.now))
      .sort((a, b) => a[0] - b[0]);
    issues.push(...planningExternalIssues(profile, context));
    let continuousStart = 0,
      continuousEnd = 0;
    for (const [a, b] of segments) {
      if (a - continuousEnd >= 15 * 60000) continuousStart = a;
      continuousEnd = Math.max(b, continuousEnd);
      if (continuousEnd - continuousStart > 360 * 60000)
        fail(
          "continuous_aggregate",
          "Zusammengenommen fehlen nach sechs Stunden aller Beschäftigungen 15 Minuten ununterbrochene Pause.",
          planningLocal(a).date,
        );
    }
    const weekly = new Map<string, number>(),
      daily = new Map<string, number>();
    const workedSundays = new Map<string, Set<string>>();
    for (let i = 0; i < intervals.length; i++) {
      const item = intervals[i];
      const date = planningLocal(item.start).date;
      const monday = planningAddDays(date, -((planningDay(date) + 6) % 7));
      weekly.set(monday, (weekly.get(monday) ?? 0) + item.minutes);
      daily.set(date, (daily.get(date) ?? 0) + item.minutes);
      const previous = intervals[i - 1];
      if (previous) {
        const gap = (Date.parse(item.start) - Date.parse(previous.end)) / 60000;
        if (
          gap >= 0 &&
          gap < 660 &&
          date === planningLocal(previous.start).date &&
          (plannedIds.has(item.id) || plannedIds.has(previous.id))
        )
          fail(
            "split_profile",
            "Das Standardprofil plant einen Schichtblock je Arbeitstag. Geteilte Dienste oder weitere Beschäftigungen mit kürzerem Abstand benötigen ein gesondertes geprüftes Pausenprofil.",
            date,
          );
        // Multiple recorded entries within the same day are aggregated; overlap always fails.
        if (gap < 0)
          fail(
            "overlap",
            "Arbeitszeiten überschneiden sich, auch mit weiteren Beschäftigungen.",
            date,
          );
        else if (date !== planningLocal(previous.start).date && gap < 660)
          fail(
            "rest",
            "Zwischen Arbeitstagen fehlen elf ununterbrochene Ruhestunden (§ 5 ArbZG).",
            date,
          );
        if (
          gap >= 0 &&
          previous.locationId !== item.locationId &&
          gap < state.config.travelMinutes
        )
          fail(
            "travel",
            "Der Abstand reicht nicht für den hinterlegten Filialwechsel.",
            date,
          );
      }
      for (
        let d = date;
        d <= planningLocal(Date.parse(item.end) - 1).date;
        d = planningAddDays(d, 1)
      ) {
        if (planningDay(d) === 0) {
          const set = workedSundays.get(d.slice(0, 4)) ?? new Set<string>();
          set.add(d);
          workedSundays.set(d.slice(0, 4), set);
        }
      }
    }
    for (const [date, minutes] of daily)
      if (minutes > 480)
        fail(
          "daily_aggregate",
          "In Summe aller Beschäftigungen sind mehr als acht Stunden am Arbeitstag vorgesehen.",
          date,
        );
    for (const [date, minutes] of weekly)
      if (minutes > Math.min(2880, profile.maxWeeklyMinutes))
        fail(
          "weekly_limit",
          "Das bestätigte Wochenlimit wird einschließlich weiterer Beschäftigungen überschritten.",
          planningAddDays(date, 6),
        );
    for (const [year, worked] of workedSundays) {
      let total = 0;
      for (
        let date = `${year}-01-01`;
        date <= `${year}-12-31`;
        date = planningAddDays(date, 1)
      )
        if (planningDay(date) === 0) total++;
      if (worked.size > total - 15)
        fail(
          "free_sundays",
          "Es verbleiben weniger als 15 beschäftigungsfreie Sonntage im Kalenderjahr (§ 11 ArbZG).",
        );
    }
    const historyRest = state.periods
      .flatMap((p) => p.publishedShifts)
      .filter(
        (s) =>
          s.employeeId === profile.employeeId &&
          s.date < context.today &&
          s.substituteDate &&
          s.substituteDate >= context.today,
      );
    const restUsage = new Map<string, string>();
    for (const shift of [...own, ...historyRest]) {
      const template = state.config.templates.find(
        (t) => t.id === shift.templateId,
      );
      const location = state.config.locations.find(
        (l) => l.id === shift.locationId,
      );
      const holidays =
        context.holidays.find((h) => h.locationId === shift.locationId)
          ?.dates ?? [];
      for (
        let date = shift.date;
        date <= planningLocal(Date.parse(shift.end) - 1).date;
        date = planningAddDays(date, 1)
      ) {
        const sunday = planningDay(date) === 0;
        if (
          !sunday &&
          !holidays.includes(date) &&
          !location?.additionalHolidays.includes(date)
        )
          continue;
        if (template?.authorization === "bakery_production") {
          const a = Date.parse(planningWallTime(date, "00:00")),
            b = Date.parse(planningWallTime(planningAddDays(date, 1), "00:00"));
          const minutes = own
            .filter(
              (s) =>
                state.config.templates.find((t) => t.id === s.templateId)
                  ?.authorization === "bakery_production",
            )
            .flatMap(planningWorkSegments)
            .reduce(
              (sum, [start, end]) =>
                sum +
                Math.max(0, Math.min(end, b) - Math.max(start, a)) / 60000,
              0,
            );
          if (minutes > 180)
            fail(
              "bakery_sunday_limit",
              "Herstellung und Auslieferung sind sonntags und feiertags auf drei Stunden begrenzt (§ 10 Abs. 3 ArbZG).",
              date,
            );
        }
        const rest = shift.substituteDate;
        if (
          !rest ||
          rest < date ||
          rest >
            planningAddDays(
              date,
              sunday
                ? PLANNING_SUNDAY_REST_WINDOW_DAYS - 1
                : PLANNING_HOLIDAY_REST_WINDOW_DAYS - 1,
            ) ||
          planningDay(rest) === 0 ||
          holidays.includes(rest) ||
          location?.additionalHolidays.includes(rest)
        ) {
          fail(
            "substitute_window",
            "Der Ersatzruhetag muss ein zulässiger Werktag innerhalb von zwei bzw. acht Wochen sein (§ 11 ArbZG).",
            date,
          );
          continue;
        }
        const previousWorkDate = restUsage.get(rest);
        if (previousWorkDate && previousWorkDate !== date)
          fail(
            "substitute_reused",
            "Ein Ersatzruhetag kann nicht mehrere unterschiedliche Beschäftigungstage ersetzen.",
            rest,
          );
        restUsage.set(rest, date);
        if (
          planningRestWindows(rest).every(([a, b]) =>
            intervals.some(
              (s) => Date.parse(s.start) < b && Date.parse(s.end) > a,
            ),
          )
        )
          fail(
            "substitute_busy",
            "Am Ersatzruhetag fehlen 24 Stunden beschäftigungsfreie Zeit mit unmittelbar verbundener Ruhezeit.",
            rest,
          );
      }
    }
  }
  return issues;
}
