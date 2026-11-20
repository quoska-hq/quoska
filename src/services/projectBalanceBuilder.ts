import { getWeekSunday } from "@/services/holidayService";
import type { PersonalProjectGoal, ProjectBalanceBooking, ProjectBalanceQuery, ProjectBalanceRow } from "@/types/project-balance";
import type { ProjectWeeklyTarget } from "@/types/project-target";

const DAY_MS = 86_400_000;

function epochDay(date: string): number {
  return Date.parse(date + "T00:00:00Z") / DAY_MS;
}

/** Cumulative target on all Monday–Friday dates before this epoch day. */
function targetBefore(day: number, weeklyMinutes: number): number {
  // 01.01.1970 was a Thursday.
  const daysFromMonday = day + 3;
  const weeks = Math.floor(daysFromMonday / 7);
  const weekdays = Math.min(daysFromMonday - weeks * 7, 5);
  return weeks * weeklyMinutes + Math.round(weekdays * weeklyMinutes / 5);
}

/** Targets are ordered by effectiveFrom, most recent applicable target wins. */
function targetOnDate(targets: ProjectWeeklyTarget[], date: string): number {
  let lower = 0;
  let upper = targets.length;
  while (lower < upper) {
    const mid = Math.floor((lower + upper) / 2);
    if (targets[mid].effectiveFrom <= date) lower = mid + 1;
    else upper = mid;
  }
  return targets[lower - 1]?.weeklyMinutes ?? 0;
}

function accountKey({ projectId, employeeId }: { projectId: string; employeeId: string }): string {
  return `${projectId}/${employeeId}`;
}

interface BuildProjectBalancesInput extends ProjectBalanceQuery {
  targets: readonly ProjectWeeklyTarget[];
  bookings: Iterable<ProjectBalanceBooking>;
  todayDate: string;
}

export function buildProjectBalances({
  targets, bookings, startDate, endDate, todayDate, projectId, employeeId,
}: BuildProjectBalancesInput): ProjectBalanceRow[] {
  const asOf = endDate < todayDate ? endDate : todayDate;
  const asOfExclusive = epochDay(asOf) + 1;
  const rangeStart = epochDay(startDate);
  const history = new Map<string, ProjectWeeklyTarget[]>();

  for (const target of targets) {
    if (target.effectiveFrom > asOf || (projectId && target.projectId !== projectId) ||
      (employeeId && target.employeeId !== employeeId)) continue;
    const key = accountKey(target);
    const accountTargets = history.get(key);
    if (accountTargets) accountTargets.push(target);
    else history.set(key, [target]);
  }

  const balances = new Map<string, ProjectBalanceRow>();
  for (const [key, accountTargets] of history) {
    if (!accountTargets.some((target) => target.weeklyMinutes > 0)) continue;
    accountTargets.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    let accruedMinutes = 0;
    let selectedMinutes = 0;
    for (const [index, target] of accountTargets.entries()) {
      if (target.weeklyMinutes === 0) continue;
      const nextTarget = accountTargets[index + 1];
      const from = epochDay(target.effectiveFrom);
      const until = nextTarget ? epochDay(nextTarget.effectiveFrom) : asOfExclusive;
      const endTarget = targetBefore(until, target.weeklyMinutes);
      accruedMinutes += endTarget - targetBefore(from, target.weeklyMinutes);
      if (rangeStart < until) {
        selectedMinutes += endTarget - targetBefore(Math.max(from, rangeStart), target.weeklyMinutes);
      }
    }
    const { projectId, projectName, employeeId, employeeName } = accountTargets[0];
    balances.set(key, {
      projectId, projectName, employeeId, employeeName,
      targetMinutes: selectedMinutes,
      actualMinutes: 0,
      balanceMinutes: 0 - accruedMinutes,
    });
  }

  for (const booking of bookings) {
    if (booking.date > asOf) continue;
    const key = accountKey(booking);
    const balance = balances.get(key);
    if (!balance || targetOnDate(history.get(key)!, booking.date) === 0) continue;
    balance.balanceMinutes += booking.netMinutes;
    if (booking.date >= startDate) balance.actualMinutes += booking.netMinutes;
  }

  return [...balances.values()].sort((a, b) =>
    a.projectName.localeCompare(b.projectName, "de") ||
    a.employeeName.localeCompare(b.employeeName, "de"),
  );
}

interface PersonalProjectWeek {
  targets: readonly ProjectWeeklyTarget[];
  weekStart: string;
  employeeId: string;
}

/** Keep the full history for projects with an active target at some point this week. */
export function personalProjectTargetsForWeek({
  targets, weekStart, employeeId,
}: PersonalProjectWeek): ProjectWeeklyTarget[] {
  const weekEnd = getWeekSunday(weekStart);
  const byProject = new Map<string, ProjectWeeklyTarget[]>();
  for (const target of targets) {
    if (target.employeeId !== employeeId || target.effectiveFrom > weekEnd) continue;
    const history = byProject.get(target.projectId);
    if (history) history.push(target);
    else byProject.set(target.projectId, [target]);
  }
  return [...byProject.values()].flatMap((history) => {
    history.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
    const active = targetOnDate(history, weekStart) > 0 ||
      history.some((target) => target.effectiveFrom > weekStart && target.weeklyMinutes > 0);
    return active ? history : [];
  });
}

export function buildPersonalProjectGoals({
  targets, bookings, weekStart, todayDate, employeeId,
}: PersonalProjectWeek & {
  bookings: Iterable<ProjectBalanceBooking>;
  todayDate: string;
}): PersonalProjectGoal[] {
  const weekEnd = getWeekSunday(weekStart);
  const period = {
    targets: personalProjectTargetsForWeek({ targets, weekStart, employeeId }),
    startDate: weekStart,
    endDate: weekEnd,
    employeeId,
  };
  const planned = buildProjectBalances({ ...period, todayDate: weekEnd, bookings: [] });
  const accrued = new Map(
    buildProjectBalances({ ...period, todayDate, bookings }).map((row) => [row.projectId, row]),
  );
  return planned.map(({ projectId, projectName, targetMinutes }) => {
    const row = accrued.get(projectId);
    return {
      projectId, projectName, plannedMinutes: targetMinutes,
      actualMinutes: row?.actualMinutes ?? 0,
      balanceMinutes: row?.balanceMinutes ?? 0,
    };
  });
}
