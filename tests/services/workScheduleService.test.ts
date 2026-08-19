import { describe, expect, it } from "vitest";
import {
  calculateScheduleTargetMinutes,
  calculateScheduleTargetMinutesForRange,
  isScheduledWorkday,
  scheduledMinutesForDate,
  workdayForDate,
} from "@/services/workScheduleService";
import {
  DEFAULT_WORK_SCHEDULE,
  FOUR_DAY_WORK_SCHEDULE,
  evenlyDistributeWorkMinutes,
  formatWorkMinutes,
  normalizeWorkSchedule,
} from "@/types/work-schedule";

describe("workScheduleService", () => {
  it("maps ISO dates to weekdays without depending on the local timezone", () => {
    expect(workdayForDate("2026-08-10")).toBe("monday");
    expect(workdayForDate("2026-08-14")).toBe("friday");
    expect(workdayForDate("2026-08-16")).toBe("sunday");
  });

  it("keeps Friday free for a four-day contract", () => {
    expect(scheduledMinutesForDate(FOUR_DAY_WORK_SCHEDULE, "2026-08-14")).toBe(0);
    expect(isScheduledWorkday(FOUR_DAY_WORK_SCHEDULE, "2026-08-14", new Set())).toBe(false);
  });

  it("subtracts a holiday only when it falls on a scheduled workday", () => {
    const mondayHoliday = new Set(["2026-08-10"]);
    const fridayHoliday = new Set(["2026-08-14"]);

    expect(calculateScheduleTargetMinutes("2026-08-10", mondayHoliday, FOUR_DAY_WORK_SCHEDULE)).toBe(24 * 60);
    expect(calculateScheduleTargetMinutes("2026-08-10", fridayHoliday, FOUR_DAY_WORK_SCHEDULE)).toBe(32 * 60);
  });

  it("accrues the current week's target only through the current day", () => {
    expect(calculateScheduleTargetMinutesForRange(
      "2026-08-10",
      "2026-08-12",
      new Set(),
      DEFAULT_WORK_SCHEDULE,
    )).toBe(24 * 60);
  });

  it("starts accruing target time on the employee's first day", () => {
    expect(calculateScheduleTargetMinutesForRange(
      "2026-08-12",
      "2026-08-14",
      new Set(),
      DEFAULT_WORK_SCHEDULE,
    )).toBe(24 * 60);
  });

  it("supports contractual weekend work", () => {
    const saturdaySchedule = {
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 480,
      sunday: 0,
    };

    expect(scheduledMinutesForDate(saturdaySchedule, "2026-08-15")).toBe(480);
    expect(isScheduledWorkday(saturdaySchedule, "2026-08-15", new Set())).toBe(true);
  });

  it("falls back to a conventional five-day week for legacy rows", () => {
    expect(normalizeWorkSchedule(null, 40)).toEqual(DEFAULT_WORK_SCHEDULE);
  });

  it("distributes hours and minutes without decimal conversion", () => {
    const schedule = evenlyDistributeWorkMinutes(33 * 60 + 45, [
      "monday", "tuesday", "wednesday", "thursday", "friday",
    ]);

    expect(schedule).toMatchObject({
      monday: 405,
      tuesday: 405,
      wednesday: 405,
      thursday: 405,
      friday: 405,
    });
    expect(formatWorkMinutes(33 * 60 + 45)).toBe("33 Std. 45 Min.");
  });

  it("rejects weekly distributions above ten hours per selected day", () => {
    expect(evenlyDistributeWorkMinutes(40 * 60, ["monday"])).toBeNull();
    expect(evenlyDistributeWorkMinutes(40 * 60, [
      "monday", "tuesday", "wednesday", "thursday",
    ])).not.toBeNull();
  });
});
