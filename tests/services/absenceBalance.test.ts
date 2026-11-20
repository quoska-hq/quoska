import { describe, expect, it, vi } from "vitest";
const { ranges, holidays } = vi.hoisted(() => ({ ranges: vi.fn(), holidays: vi.fn() }));
vi.mock("@/repos/employeeAbsenceRepo", () => ({ getEmployeeAbsenceRanges: ranges }));
vi.mock("@/repos/holidayRepo", () => ({ getHolidaysInRange: holidays }));
import { getEmployeeAbsenceDates } from "@/services/absenceService";
import { calculateWorkDaysCount } from "@/services/leaveHelpers";
import { calculateScheduleTargetMinutesForRange } from "@/services/workScheduleService";
import { DEFAULT_WORK_SCHEDULE } from "@/types/work-schedule";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("absence balances", () => {
  it("clips open sickness and overlapping leave, retaining scheduled weekend days", async () => {
    ranges.mockResolvedValue([
      { start_date: "2026-08-01", end_date: "2026-08-11" },
      { start_date: "2026-08-11", end_date: null },
      { start_date: "2026-08-20", end_date: "2026-08-25" },
    ]);
    const dates = await getEmployeeAbsenceDates({} as SupabaseClient, "t", "e", "2026-08-10", "2026-08-16");
    expect([...dates]).toEqual(["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"]);
  });
  it("uses the actual part-time schedule and never credits a holiday twice", async () => {
    ranges.mockResolvedValue([{ start_date: "2026-08-10", end_date: "2026-08-11" }]);
    const dates = await getEmployeeAbsenceDates({} as SupabaseClient, "t", "e", "2026-08-10", "2026-08-16");
    const excluded = new Set([...dates, "2026-08-10"]);
    expect(calculateScheduleTargetMinutesForRange("2026-08-10", "2026-08-16", excluded, {
      monday: 360, tuesday: 120, wednesday: 0, thursday: 240, friday: 0, saturday: 180, sunday: 0,
    })).toBe(420);
  });
  it("counts absence days against the model in force on each day", async () => {
    holidays.mockResolvedValue([{ date: "2026-08-11" }]);
    const weekendSchedule = {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 480, sunday: 0,
    };
    const count = await calculateWorkDaysCount({} as SupabaseClient, "berlin", "2026-08-10", "2026-08-16", {
      work_schedule: DEFAULT_WORK_SCHEDULE,
      work_schedule_history: { "2026-08-12": weekendSchedule },
    });
    expect(count).toBe(2); // Monday under the original model, Saturday under the new one.
  });
});
