import { z } from "zod";

const MINUTES_PER_HOUR = 60;
export const MAX_DAILY_WORK_MINUTES = 10 * MINUTES_PER_HOUR;
export const MAX_WEEKLY_WORK_MINUTES = 48 * MINUTES_PER_HOUR;

export const WORKDAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WorkdayKey = (typeof WORKDAY_KEYS)[number];
export type WorkSchedule = Record<WorkdayKey, number>;

export const WORKDAY_LABELS: Record<WorkdayKey, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  monday: 480,
  tuesday: 480,
  wednesday: 480,
  thursday: 480,
  friday: 480,
  saturday: 0,
  sunday: 0,
};

export const FOUR_DAY_WORK_SCHEDULE: WorkSchedule = {
  monday: 480,
  tuesday: 480,
  wednesday: 480,
  thursday: 480,
  friday: 0,
  saturday: 0,
  sunday: 0,
};

export const THIRTY_HOUR_WORK_SCHEDULE: WorkSchedule = {
  monday: 360,
  tuesday: 360,
  wednesday: 360,
  thursday: 360,
  friday: 360,
  saturday: 0,
  sunday: 0,
};

const minuteValue = z.number().int().min(0).max(MAX_DAILY_WORK_MINUTES);

export const workScheduleSchema = z
  .object({
    monday: minuteValue,
    tuesday: minuteValue,
    wednesday: minuteValue,
    thursday: minuteValue,
    friday: minuteValue,
    saturday: minuteValue,
    sunday: minuteValue,
  })
  .refine(
    (schedule) => Object.values(schedule).some((minutes) => minutes > 0),
    "Mindestens ein Arbeitstag ist erforderlich",
  )
  .refine(
    (schedule) =>
      Object.values(schedule).reduce((sum, minutes) => sum + minutes, 0) <=
      MAX_WEEKLY_WORK_MINUTES,
    "Maximal 48 Wochenstunden sind erlaubt",
  );

export function totalScheduleMinutes(schedule: WorkSchedule): number {
  return WORKDAY_KEYS.reduce((sum, day) => sum + schedule[day], 0);
}

export function scheduleHours(schedule: WorkSchedule): number {
  return totalScheduleMinutes(schedule) / MINUTES_PER_HOUR;
}

export function formatWorkMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / MINUTES_PER_HOUR);
  const minutes = safeMinutes % MINUTES_PER_HOUR;
  return minutes === 0
    ? `${hours} Std.`
    : `${hours} Std. ${minutes} Min.`;
}

export function evenlyDistributeWorkMinutes(
  totalMinutes: number,
  workdays: readonly WorkdayKey[],
): WorkSchedule | null {
  const uniqueWorkdays = [...new Set(workdays)];
  if (
    !Number.isInteger(totalMinutes) ||
    totalMinutes < 1 ||
    totalMinutes > MAX_WEEKLY_WORK_MINUTES ||
    uniqueWorkdays.length === 0
  ) {
    return null;
  }

  const baseMinutes = Math.floor(totalMinutes / uniqueWorkdays.length);
  const remainder = totalMinutes % uniqueWorkdays.length;
  if (baseMinutes + (remainder > 0 ? 1 : 0) > MAX_DAILY_WORK_MINUTES) {
    return null;
  }

  const schedule = Object.fromEntries(
    WORKDAY_KEYS.map((day) => [day, 0]),
  ) as WorkSchedule;
  uniqueWorkdays.forEach((day, index) => {
    schedule[day] = baseMinutes + (index < remainder ? 1 : 0);
  });
  return schedule;
}

export function workScheduleFromWeeklyHours(hours: number): WorkSchedule {
  const weekdayMinutes = Math.round((hours * MINUTES_PER_HOUR) / 5);
  return {
    monday: weekdayMinutes,
    tuesday: weekdayMinutes,
    wednesday: weekdayMinutes,
    thursday: weekdayMinutes,
    friday: weekdayMinutes,
    saturday: 0,
    sunday: 0,
  };
}

export function normalizeWorkSchedule(
  value: unknown,
  fallbackWeeklyHours = 40,
): WorkSchedule {
  const parsed = workScheduleSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : workScheduleFromWeeklyHours(fallbackWeeklyHours);
}
