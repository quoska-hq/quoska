import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/reports/project-balances/route";
import { createClient } from "@/config/supabase/server";
import { getTodayDate } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getProjectBalances } from "@/services/projectBalanceService";
import { failure, success } from "@/types/api";

vi.mock("@/config/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/config/server/timestamps", () => ({ getTodayDate: vi.fn() }));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: vi.fn() }));
vi.mock("@/services/projectBalanceService", () => ({ getProjectBalances: vi.fn() }));

const supabase = { marker: "RLS session client" } as unknown as Awaited<ReturnType<typeof createClient>>;
const auth = { tenantId: "tenant-1", employeeId: "actor-1", role: "manager" };
const base = "http://localhost/api/v1/reports/project-balances";
const startDate = "2026-10-12";
const endDate = "2026-10-18";
const todayDate = "2026-10-14";
const projectId = "77777777-7777-4777-8777-777777777777";
const employeeId = "66666666-6666-4666-8666-666666666666";

describe("GET project balances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockResolvedValue(supabase);
    vi.mocked(getTodayDate).mockReturnValue(todayDate);
    vi.mocked(getEmployeeFromAuth).mockResolvedValue(success(auth));
    vi.mocked(getProjectBalances).mockResolvedValue([]);
  });

  it("passes validated dates, filters and the authenticated tenant to the balance service", async () => {
    const params = new URLSearchParams({ startDate, endDate, projectId, employeeId, tenantId: "ignored" });
    const response = await GET(new Request(`${base}?${params}`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(success([]));
    expect(getProjectBalances).toHaveBeenCalledWith(
      supabase, auth.tenantId, { startDate, endDate, projectId, employeeId }, todayDate,
    );
  });

  it("allows the unassigned filter and rejects reversed or invalid dates", async () => {
    const unassigned = await GET(new Request(`${base}?startDate=${startDate}&endDate=${endDate}&projectId=none`));
    const reversed = await GET(new Request(`${base}?startDate=${endDate}&endDate=${startDate}`));
    const invalid = await GET(new Request(`${base}?startDate=2026-02-30&endDate=${endDate}`));
    expect(unassigned.status).toBe(200);
    expect(reversed.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(getProjectBalances).toHaveBeenCalledTimes(1);
  });

  it("rejects requests without a manager or administrator session before reading balances", async () => {
    const request = new Request(`${base}?startDate=${startDate}&endDate=${endDate}`);
    vi.mocked(getEmployeeFromAuth).mockResolvedValueOnce(failure("Nicht angemeldet."));
    expect((await GET(request)).status).toBe(401);
    vi.mocked(getEmployeeFromAuth).mockResolvedValueOnce(success({ ...auth, role: "employee" }));
    expect((await GET(request)).status).toBe(403);
    expect(getProjectBalances).not.toHaveBeenCalled();
  });
});
