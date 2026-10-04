import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanningError } from "@/services/planningPeriodService";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  status: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/services/planningRequestService", async (original) => ({
  ...(await original<typeof import("@/services/planningRequestService")>()),
  planningRequest: mocks.request,
}));
vi.mock("@/services/planningModuleService", () => ({
  readPlanningModule: mocks.status,
}));
import { GET, POST } from "@/app/api/v1/modules/planning/route";
afterEach(() => vi.resetAllMocks());
function setup() {
  mocks.request.mockResolvedValue({
    client: {},
    admin: { rpc: mocks.rpc },
    actor: { userId: "verified-user" },
  });
}
function request(body: unknown) {
  return new Request("http://localhost/api/v1/modules/planning", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
describe("Planning module endpoint", () => {
  it.each([GET, POST])("requires authentication", async (handler) => {
    mocks.request.mockRejectedValue(new PlanningError("Bitte anmelden.", 401));
    expect((await handler(request({ enabled: true, version: 0 }))).status).toBe(
      401,
    );
  });
  it("allows employee status reads without initializing a workspace", async () => {
    setup();
    mocks.status.mockResolvedValue({ enabled: false, version: 0 });
    expect((await GET()).status).toBe(200);
    expect(mocks.request).toHaveBeenCalledWith(false, false, true);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires a current manager for mutations", async () => {
    mocks.request.mockRejectedValue(
      new PlanningError("Keine Berechtigung.", 403),
    );
    expect((await POST(request({ enabled: true, version: 0 }))).status).toBe(
      403,
    );
    expect(mocks.request).toHaveBeenCalledWith(true);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    { enabled: "true", version: 0 },
    { enabled: true, version: -1 },
    { enabled: true, version: 0, userId: "attacker" },
  ])("rejects invalid or forged settings", async (body) => {
    setup();
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("uses the verified actor and returns conflicts for stale versions", async () => {
    setup();
    mocks.rpc.mockResolvedValue({ error: { code: "40001" } });
    expect((await POST(request({ enabled: false, version: 42 }))).status).toBe(
      409,
    );
    expect(mocks.rpc).toHaveBeenCalledWith("planning_set_enabled", {
      p_user: "verified-user",
      p_version: 42,
      p_enabled: false,
    });
  });
  it("returns the persisted module status", async () => {
    setup();
    mocks.rpc.mockResolvedValue({
      data: { enabled: true, version: 1 },
      error: null,
    });
    const response = await POST(request({ enabled: true, version: 0 }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: { enabled: true, version: 1 },
      error: null,
    });
  });
});
