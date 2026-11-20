import { addDays } from "@/services/holidayService";
import {
  employeeScheduleForDate,
  normalizeWorkSchedule,
  type EmployeeWorkSchedule,
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
  const day = ((daysSinceEpoch + 4) % 7 + 7) % 7;
  return JS_DAY_TO_WORKDAY[day] ?? "monday";
}

export function scheduledEmployeeMinutesForDate(
  employee: EmployeeWorkSchedule | null | undefined,
  date: string,
): number {
  return employeeScheduleForDate(employee, date)[workdayForDate(date)];
}

export function calculateEmployeeScheduleTargetMinutesForRange(
  startDate: string,
  endDate: string,
  excludedDates: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  employee: EmployeeWorkSchedule | null | undefined,
): number {
  let target = 0;
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (!excludedDates.has(date)) {
      target += scheduledEmployeeMinutesForDate(employee, date);
    }
  }
  return target;
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
  return calculateEmployeeScheduleTargetMinutesForRange(startDate, endDate, holidayDates, {
    work_schedule: normalizeWorkSchedule(scheduleValue, fallbackWeeklyHours),
    target_hours_week: fallbackWeeklyHours,
  });
}

export function isScheduledWorkday(
  schedule: WorkSchedule,
  date: string,
  holidayDates: ReadonlySet<string>,
): boolean {
  return !holidayDates.has(date) && schedule[workdayForDate(date)] > 0;
}
