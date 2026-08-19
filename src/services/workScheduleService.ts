import { addDays } from "@/services/holidayService";
import {
  normalizeWorkSchedule,
  type WorkdayKey,
  type WorkSchedule,
} from "@/types/work-schedule";

const JS_DAY_TO_WORKDAY: readonly WorkdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function workdayForDate(date: string): WorkdayKey {
  const milliseconds = Date.parse(`${date}T12:00:00Z`);
  const daysSinceEpoch = Math.floor(milliseconds / 86_400_000);
  const day = (daysSinceEpoch + 4) % 7;
  return JS_DAY_TO_WORKDAY[day] ?? "monday";
}

export function scheduledMinutesForDate(
  scheduleValue: unknown,
  date: string,
  fallbackWeeklyHours = 40,
): number {
  const schedule = normalizeWorkSchedule(scheduleValue, fallbackWeeklyHours);
  return schedule[workdayForDate(date)];
}

export function calculateScheduleTargetMinutes(
  weekStart: string,
  holidayDates: ReadonlySet<string> | ReadonlyMap<string, string>,
  scheduleValue: unknown,
  fallbackWeeklyHours = 40,
): number {
  return calculateScheduleTargetMinutesForRange(
    weekStart,
    addDays(weekStart, 6),
    holidayDates,
    scheduleValue,
    fallbackWeeklyHours,
  );
}

/** Contractual target for an inclusive date range. */
export function calculateScheduleTargetMinutesForRange(
  startDate: string,
  endDate: string,
  holidayDates: ReadonlySet<string> | ReadonlyMap<string, string>,
  scheduleValue: unknown,
  fallbackWeeklyHours = 40,
): number {
  if (endDate < startDate) return 0;
  let target = 0;
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (!holidayDates.has(date)) {
      target += scheduledMinutesForDate(
        scheduleValue,
        date,
        fallbackWeeklyHours,
      );
    }
  }
  return target;
}

export function isScheduledWorkday(
  schedule: WorkSchedule,
  date: string,
  holidayDates: ReadonlySet<string>,
): boolean {
  return !holidayDates.has(date) && schedule[workdayForDate(date)] > 0;
}
