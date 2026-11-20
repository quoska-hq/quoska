import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), submit: vi.fn(), admin: {} }));
vi.mock("@/config/supabase/server", () => ({ createClient: async () => ({}), createAdminClient: () => mocks.admin }));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: mocks.auth }));
vi.mock("@/services/missingTimeRequestService", () => ({ submitMissingTimeRequest: mocks.submit }));
import { POST } from "@/app/api/v1/time-requests/route";

const input = { date: "2026-10-20", start_time: "08:00", end_time: "16:00", break_minutes: 30, reason: "Stempeln vergessen" };
const request = (body: unknown) => new Request("http://localhost/api/v1/time-requests", { method: "POST", body: JSON.stringify(body) });

describe("missing time request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ data: { tenantId: "tenant", employeeId: "employee", role: "employee" } });
    mocks.submit.mockResolvedValue({ data: { id: "request", status: "pending", time_entry_id: null }, error: null });
  });
  it("accepts an employee proposal with identity taken from the session", async () => {
    const response = await POST(request(input));
    expect(response.status).toBe(201);
    expect((await response.json()).data.time_entry_id).toBeNull();
    expect(mocks.submit).toHaveBeenCalledWith(mocks.admin, "tenant", "employee", expect.objectContaining(input));
  });
  it.each(["employee_id", "tenant_id", "status", "reviewed_by"])("rejects a client-controlled %s", async (key) => {
    expect((await POST(request({ ...input, [key]: "forged" }))).status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue({ data: null, error: "Nicht angemeldet" });
    expect((await POST(request(input))).status).toBe(401);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("rejects invalid dates and malformed JSON", async () => {
    expect((await POST(request({ ...input, date: "2026-02-30" }))).status).toBe(400);
    expect((await POST(new Request("http://localhost/api/v1/time-requests", { method: "POST", body: "{" }))).status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
});
