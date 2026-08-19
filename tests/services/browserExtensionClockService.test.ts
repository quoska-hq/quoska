import { describe, expect, test } from "vitest";
import { calculateTodayWorkedSeconds } from "@/services/browserExtensionClockService";
import type { BreakSession, TimeEntry } from "@/types/database";

function entry(input: Partial<TimeEntry>): TimeEntry {
  return {
    id: "entry",
    tenant_id: "tenant",
    employee_id: "employee",
    date: "2026-08-19",
    clock_in: "2026-08-19T06:00:00.000Z",
    clock_out: "2026-08-19T07:00:00.000Z",
    break_minutes: 0,
    status: "completed",
    notes: null,
    created_at: "2026-08-19T06:00:00.000Z",
    updated_at: "2026-08-19T07:00:00.000Z",
    deleted_at: null,
    ...input,
  };
}

describe("browser extension daily progress", () => {
  test("combines completed and active net time without counting an active break", () => {
    const activeBreak: BreakSession = {
      id: "break",
      tenant_id: "tenant",
      time_entry_id: "active",
      break_start: "2026-08-19T09:45:00.000Z",
      break_end: null,
      duration_minutes: null,
      created_at: "2026-08-19T09:45:00.000Z",
      updated_at: "2026-08-19T09:45:00.000Z",
    };
    const seconds = calculateTodayWorkedSeconds(
      [
        entry({ break_minutes: 10 }),
        entry({
          id: "active",
          clock_in: "2026-08-19T09:00:00.000Z",
          clock_out: null,
          break_minutes: 5,
          status: "paused",
        }),
      ],
      "2026-08-19T10:00:00.000Z",
      activeBreak,
    );

    expect(seconds).toBe(90 * 60);
  });
});
