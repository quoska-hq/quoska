import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ client: vi.fn(), auth: vi.fn(), status: vi.fn(), absences: vi.fn(), holidays: vi.fn(), monthEntries: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createClient: mocks.client }));
vi.mock("@/config/server/timestamps", () => ({ getNowIso: () => "2026-08-12T18:00:00Z", getTodayDate: () => "2026-08-12", getWeekBounds: () => ({ weekStart: "2026-08-10", weekEnd: "2026-08-16" }), getMonthStart: () => "2026-08-01" }));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: mocks.auth, getClockStatus: mocks.status }));
vi.mock("@/services/absenceService", () => ({ getEmployeeAbsenceDates: mocks.absences }));
vi.mock("@/repos/holidayRepo", () => ({ getHolidayDatesInRange: mocks.holidays }));
vi.mock("@/repos/timeEntryRepo", () => ({ getMonthEntriesBeforeToday: mocks.monthEntries }));
import { GET } from "@/app/api/v1/clock/status/route";

describe("clock absence balances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ data: { tenantId: "t", employeeId: "e" } });
    mocks.status.mockResolvedValue({ data: { activeEntry: null, todayEntries: [], weekEntries: [], lastCompletedEntry: null } });
    mocks.holidays.mockResolvedValue(new Map());
    mocks.monthEntries.mockResolvedValue([]);
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { target_hours_week: 40, employment_start_date: "2026-08-10", created_at: "2026-08-10" } }) };
    mocks.client.mockResolvedValue({ from: vi.fn().mockReturnValue(chain) });
  });
  it("removes absence deficits from today, week and monthly carry-over", async () => {
    mocks.absences.mockResolvedValue(new Set(["2026-08-10", "2026-08-11", "2026-08-12"]));
    const response = await GET();
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.weekSummary).toMatchObject({ totalMinutes: 0, targetMinutes: 0, overtimeMinutes: 0, dailyTargetMinutes: 0 });
    expect(data.monthCarryOverMinutes).toBe(0);
  });
  it("still counts missing work on days without an absence", async () => {
    mocks.absences.mockResolvedValue(new Set(["2026-08-10"]));
    const { data } = await (await GET()).json();
    expect(data.weekSummary.targetMinutes).toBe(960);
    expect(data.weekSummary.dailyTargetMinutes).toBe(480);
    expect(data.monthCarryOverMinutes).toBe(-480);
  });
});
