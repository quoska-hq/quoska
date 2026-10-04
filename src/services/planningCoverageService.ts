import type {
  PlanningIssue,
  PlanningPeriod,
  PlanningState,
} from "@/types/planning";
import {
  planningAddMonths,
  planningAddDays,
  planningDay,
  planningWallTime,
} from "@/config/client/planning-calendar";
import { planningWorkSegments } from "@/services/planningShiftRules";

/** One person can satisfy only one simultaneous competency requirement. Pauses remove coverage. */
export function planningCoverageIssues(
  state: PlanningState,
  period: PlanningPeriod,
  today = period.month,
  holidays: { locationId: string; dates: string[] }[] = [],
  now?: string,
): PlanningIssue[] {
  const issues: PlanningIssue[] = [];
  for (
    let date = period.month;
    date < planningAddMonths(period.month, 1);
    date = planningAddDays(date, 1)
  ) {
    if (date < today) continue;
    const demands = state.config.demands.filter(
      (d) =>
        (!now || Date.parse(planningWallTime(date, d.end)) > Date.parse(now)) &&
        d.days.includes(planningDay(date)) &&
        (d.holidayMode === "include" ||
          (!holidays
            .find((h) => h.locationId === d.locationId)
            ?.dates.includes(date) &&
            !state.config.locations
              .find((l) => l.id === d.locationId)
              ?.additionalHolidays.includes(date))),
    );
    for (const location of state.config.locations) {
      const relevant = demands.filter((d) => d.locationId === location.id);
      const shifts = period.shifts.filter(
        (s) => s.locationId === location.id && s.employeeId,
      );
      const boundaries = new Set<number>();
      for (const d of relevant) {
        boundaries.add(Date.parse(planningWallTime(date, d.start)));
        boundaries.add(Date.parse(planningWallTime(date, d.end)));
      }
      for (const s of shifts)
        for (const [a, b] of planningWorkSegments(s)) {
          boundaries.add(a);
          boundaries.add(b);
        }
      const sorted = [...boundaries].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i],
          b = sorted[i + 1];
        if (now && b <= Date.parse(now)) continue;
        const required = relevant
          .filter(
            (d) =>
              Date.parse(planningWallTime(date, d.start)) < b &&
              Date.parse(planningWallTime(date, d.end)) > a,
          )
          .flatMap((d) => Array.from({ length: d.count }, () => d.skillId));
        const candidates = new Map<string, Set<string>>();
        for (const s of shifts)
          if (
            planningWorkSegments(s).some(
              ([start, end]) => start <= a && end >= b,
            )
          ) {
            candidates.set(
              s.employeeId!,
              new Set(
                state.config.profiles.find((p) => p.employeeId === s.employeeId)
                  ?.skillIds ?? [],
              ),
            );
          }
        const assigned = new Map<string, number>();
        const match = (slot: number, visited: Set<string>): boolean => {
          for (const [employee, skills] of candidates) {
            if (!skills.has(required[slot]) || visited.has(employee)) continue;
            visited.add(employee);
            if (
              !assigned.has(employee) ||
              match(assigned.get(employee)!, visited)
            ) {
              assigned.set(employee, slot);
              return true;
            }
          }
          return false;
        };
        if (required.some((_, slot) => !match(slot, new Set()))) {
          issues.push({
            code: "coverage",
            date,
            severity: "error",
            message: `${location.name}: Die Besetzung deckt den Bedarf einschließlich Pausen nicht ab.`,
          });
          break;
        }
      }
    }
  }
  return issues;
}
