import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), actor: vi.fn(), run: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({
  createClient: vi.fn(),
  createAdminClient: () => {
    const query = { select: () => query, eq: () => query, is: () => query, maybeSingle: mocks.actor };
    return { from: () => query };
  },
}));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: mocks.auth }));
vi.mock("@/services/timeImportService", () => ({ runTimeImport: mocks.run }));
vi.mock("@/config/server/timestamps", () => ({ getNowIso: () => "2026-09-07T12:00:00Z" }));
import { POST } from "@/app/api/v1/time-entries/import/route";

const body = {
  csv: "Start date,Start time,End time\n2026-01-12,08:00,09:00", delimiter: ",",
  dateFormat: "YYYY-MM-DD", timezone: "Europe/Berlin", durationFormat: "clock",
  columns: { date: 0, start: 1, end: 2 }, employees: [], mode: "preview",
};
const request = (value: unknown = body) => new Request("http://localhost/api/v1/time-entries/import", {
  method: "POST", body: JSON.stringify(value),
});

describe("POST time import permissions and validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ data: { employeeId: "actor", tenantId: "tenant", role: "manager" } });
    mocks.actor.mockResolvedValue({ data: { role: "manager" }, error: null });
    mocks.run.mockResolvedValue({ rows: [], readyCount: 0, errorCount: 0, duplicateCount: 0, importedCount: 0 });
  });
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue({ data: null, error: "Nicht authentifiziert" });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("rejects employees", async () => {
    mocks.auth.mockResolvedValue({ data: { employeeId: "actor", tenantId: "tenant", role: "employee" } });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it.each([null, { role: "employee" }])("rejects removed/demoted managers with stale claims", async (actor) => {
    mocks.actor.mockResolvedValue({ data: actor, error: null });
    expect((await POST(request())).status).toBe(403);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("does not trust caller supplied tenant or actor IDs", async () => {
    expect((await POST(request({ ...body, tenantId: "foreign", actorId: "foreign" }))).status).toBe(200);
    expect(mocks.run).toHaveBeenCalledWith(expect.anything(), "tenant", "actor", body, "2026-09-07T12:00:00Z");
  });
  it("rejects malformed JSON and unsupported settings", async () => {
    expect((await POST(new Request("http://localhost/", { method: "POST", body: "{" }))).status).toBe(400);
    expect((await POST(request({ ...body, timezone: "guess" }))).status).toBe(400);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("bounds the request stream without relying on content-length", async () => {
    expect((await POST(new Request("http://localhost/", { method: "POST", body: "x".repeat(7 * 1024 * 1024) }))).status).toBe(413);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it("fails closed on a failed authorization query", async () => {
    mocks.actor.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect((await POST(request())).status).toBe(500);
    expect(mocks.run).not.toHaveBeenCalled();
  });
});
