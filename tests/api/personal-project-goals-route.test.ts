import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/v1/my-times/project-goals/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  maybeSingle: vi.fn(),
  service: vi.fn(),
}));

const client = { auth: { getUser: mocks.auth }, from: mocks.from };
vi.mock("@/config/supabase/server", () => ({ createClient: async () => client }));
vi.mock("@/config/server/timestamps", () => ({ getTodayDate: () => "2026-08-12" }));
vi.mock("@/services/projectBalanceService", () => ({ getPersonalProjectGoals: mocks.service }));

const employee = { id: "employee-db", tenant_id: "tenant-db" };
const monday = "2026-08-10";
function request(query = `weekStart=${monday}`) {
  return new Request(`http://localhost/api/v1/my-times/project-goals?${query}`);
}

describe("GET /api/v1/my-times/project-goals", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ data: { user: { id: "auth-user" } } });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ is: mocks.is });
    mocks.is.mockReturnValue({ maybeSingle: mocks.maybeSingle });
    mocks.maybeSingle.mockResolvedValue({ data: employee, error: null });
    mocks.service.mockResolvedValue([]);
  });

  it("uses the active employee linked to the verified Auth user, regardless of cached claims", async () => {
    mocks.auth.mockResolvedValue({ data: { user: {
      id: "auth-user",
      app_metadata: { tenant_id: "stale-tenant", employee_id: "stale-employee", role: "admin" },
    } } });
    const rows = [{ projectId: "project", projectName: "Planung", targetMinutes: 240, actualMinutes: 60 }];
    mocks.service.mockResolvedValue(rows);

    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ data: rows, error: null });
    expect(mocks.from).toHaveBeenCalledWith("employees");
    expect(mocks.select).toHaveBeenCalledWith("id,tenant_id");
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "auth-user");
    expect(mocks.is).toHaveBeenCalledWith("deleted_at", null);
    expect(mocks.service).toHaveBeenCalledWith(client, employee.tenant_id, employee.id, monday, "2026-08-12");
  });

  it("denies anonymous requests", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null } });
    expect((await GET(request())).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it("denies a session with no active employee in its tenant", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await GET(request())).status).toBe(403);
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "weekStart=",
    "weekStart=2026-08-11",
    "weekStart=2026-02-29",
    `weekStart=${monday}&employeeId=someone-else`,
    `weekStart=${monday}&tenantId=another-team`,
    `weekStart=${monday}&weekStart=2026-08-17`,
  ])("rejects malformed weeks and caller-selected identities (%s)", async (query) => {
    expect((await GET(request(query))).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.service).not.toHaveBeenCalled();
  });
});
