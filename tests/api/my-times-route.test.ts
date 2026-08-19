import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimeEntry } from "@/types/database";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getEmployeeFromAuth: vi.fn(),
  getTimeEntriesByDateRange: vi.fn(),
  getActiveEntry: vi.fn(),
  getHolidayDatesInRange: vi.fn(),
}));

vi.mock("@/config/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/config/server/timestamps", () => ({
  getNowIso: () => "2026-08-12T18:00:00.000Z",
  getTodayDate: () => "2026-08-12",
}));
vi.mock("@/services/timeEntryService", () => ({
  getEmployeeFromAuth: mocks.getEmployeeFromAuth,
}));
vi.mock("@/repos/timeEntryRepo", () => ({
  getTimeEntriesByDateRange: mocks.getTimeEntriesByDateRange,
  getActiveEntry: mocks.getActiveEntry,
}));
vi.mock("@/repos/holidayRepo", () => ({
  getHolidayDatesInRange: mocks.getHolidayDatesInRange,
}));

import { GET } from "@/app/api/v1/my-times/route";

const entries: TimeEntry[] = [
  entry("monday", "2026-08-10", "2026-08-10T06:00:00.000Z", "2026-08-10T14:30:00.000Z"),
  entry("tuesday", "2026-08-11", "2026-08-11T06:00:00.000Z", "2026-08-11T13:30:00.000Z"),
  entry("wednesday", "2026-08-12", "2026-08-12T06:00:00.000Z", "2026-08-12T14:30:00.000Z"),
];

describe("GET /api/v1/my-times", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEmployeeFromAuth.mockResolvedValue({
      data: { tenantId: "tenant-1", employeeId: "employee-1", role: "employee" },
      error: null,
    });
    mocks.getTimeEntriesByDateRange.mockResolvedValue(entries);
    mocks.getActiveEntry.mockResolvedValue(null);
    mocks.getHolidayDatesInRange.mockResolvedValue(new Map());
    mocks.createClient.mockResolvedValue(employeeClient({
      bundesland: "berlin",
      target_hours_week: 40,
      work_schedule: {
        monday: 480, tuesday: 480, wednesday: 480, thursday: 480,
        friday: 480, saturday: 0, sunday: 0,
      },
      employment_start_date: "2026-08-10",
      initial_overtime_minutes: 60,
      created_at: "2026-08-10T00:00:00.000Z",
    }));
  });

  it("uses only accrued weekdays and includes the opening balance", async () => {
    const response = await GET(new Request(
      "http://localhost/api/v1/my-times?startDate=2026-08-10&endDate=2026-08-16",
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.weeklySummaries[0]).toMatchObject({
      workedMinutes: 1380,
      targetMinutes: 1440,
      overtimeMinutes: -60,
    });
    expect(body.data.cumulativeOvertimeMinutes).toBe(0);
    expect(body.data.dailyTargets).toMatchObject({
      "2026-08-12": 480,
      "2026-08-13": 0,
      "2026-08-14": 0,
    });
  });
});

function entry(
  id: string,
  date: string,
  clockIn: string,
  clockOut: string,
): TimeEntry {
  return {
    id,
    tenant_id: "tenant-1",
    employee_id: "employee-1",
    date,
    clock_in: clockIn,
    clock_out: clockOut,
    break_minutes: 30,
    status: "completed",
    notes: null,
    created_at: clockIn,
    updated_at: clockOut,
    deleted_at: null,
  };
}

function employeeClient(employee: Record<string, unknown>) {
  const chain = new Proxy({} as Record<string, unknown>, {
    get(_target, property: string) {
      if (property === "single") {
        return vi.fn().mockResolvedValue({ data: employee, error: null });
      }
      return vi.fn().mockReturnValue(chain);
    },
  });
  return { from: vi.fn().mockReturnValue(chain) };
}
