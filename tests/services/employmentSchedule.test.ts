import { expect, it } from "vitest";
import {
  DEFAULT_WORK_SCHEDULE,
  FOUR_DAY_WORK_SCHEDULE,
} from "@/types/work-schedule";
import { normalizeEmploymentScheduleForDate } from "@/types/employment-schedule";
import {
  calculateScheduleTargetMinutesForRange,
  isScheduledWorkday,
} from "@/services/workScheduleService";
import { presentEmploymentSchedule } from "@/services/employeeScheduleService";
import { planningFixture } from "../fixtures/planning";
import { planningShiftIssues } from "@/services/planningShiftRules";
const dated = {
  baseline: DEFAULT_WORK_SCHEDULE,
  changes: [{ from: "2026-10-01", schedule: FOUR_DAY_WORK_SCHEDULE }],
};
it("uses the actual contract date for historical targets and new targets", () => {
  expect(normalizeEmploymentScheduleForDate(dated, "2026-09-30")).toEqual(
    DEFAULT_WORK_SCHEDULE,
  );
  expect(normalizeEmploymentScheduleForDate(dated, "2026-10-02")).toEqual(
    FOUR_DAY_WORK_SCHEDULE,
  );
  expect(
    calculateScheduleTargetMinutesForRange(
      "2026-09-28",
      "2026-10-02",
      new Set(),
      dated,
    ),
  ).toBe(4 * 480);
  expect(isScheduledWorkday(dated, "2026-10-02", new Set())).toBe(false);
  expect(isScheduledWorkday(dated, "2026-09-25", new Set())).toBe(true);
});
it("presents the current contract without losing the dated history", () => {
  const employee = {
    work_schedule: DEFAULT_WORK_SCHEDULE,
    employment_schedule: dated,
    target_hours_week: 40,
  };
  expect(
    presentEmploymentSchedule(employee, "2026-10-02").target_hours_week,
  ).toBe(32);
  expect(
    presentEmploymentSchedule(employee, "2026-09-30").target_hours_week,
  ).toBe(40);
  expect(
    presentEmploymentSchedule(employee, "2026-10-02").employment_schedule,
  ).toEqual(dated);
});
it("enforces time-limited assignment and exceptional availability", () => {
  const f = planningFixture(),
    p = f.state.config.profiles[0];
  p.validUntil = "2026-09-30";
  p.availabilityExceptions = [{ date: f.shift.date, windows: [] }];
  let codes = planningShiftIssues(f.state, f.context, f.shift).map(
    (i) => i.code,
  );
  expect(codes).toContain("qualification_dates");
  expect(codes).toContain("availability");
  p.validUntil = null;
  p.availabilityExceptions[0].windows = [{ start: "06:00", end: "12:00" }];
  codes = planningShiftIssues(f.state, f.context, f.shift).map((i) => i.code);
  expect(codes).not.toContain("qualification_dates");
  expect(codes).not.toContain("availability");
});
