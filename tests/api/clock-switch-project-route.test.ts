import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: mocks.auth }));
vi.mock("@/config/server/product-observation-context", () => ({ setObservedTenant: vi.fn() }));
vi.mock("@/services/productObservationService", () => ({ observeProductAction: (_action: string, handler: unknown) => handler }));
import { POST } from "@/app/api/v1/clock/switch-project/route";

const entryId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";

function request(body: unknown = { entryId, projectId }) {
  return new Request("http://localhost/api/v1/clock/switch-project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("running clock project switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ data: { tenantId: "tenant", employeeId: "employee" } });
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  it("uses only the signed-in employee and makes one database call", async () => {
    const response = await POST(request({ entryId, projectId, employeeId: "ignored" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { success: true }, error: null });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("transition_clock_project", {
      p_tenant_id: "tenant", p_employee_id: "employee", p_entry_id: entryId, p_project_id: projectId,
    });
  });

  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue({ data: null, error: "Nicht authentifiziert" });
    expect((await POST(request())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    { entryId, projectId: null },
    { entryId, projectId: "invalid" },
    { entryId: "invalid", projectId },
    {},
  ])("rejects an invalid input %s before persisting", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "Dieses Projekt ist dir nicht zugewiesen oder nicht mehr aktiv.", 403],
    ["P0001", "Bitte beende zuerst deine Pause.", 409],
    ["P0001", "Bitte stemple zuerst aus und prüfe deine Arbeitszeit.", 409],
    ["P0002", "Die laufende Stempelung hat sich geändert.", 409],
  ])("returns the status and message for database rejection %s", async (code, message, status) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code, message } });

    const response = await POST(request());

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ data: null, error: message });
  });
});
