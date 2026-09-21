import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ employee: { id: "person", tenant_id: "trusted", role: "admin" } as { id: string; tenant_id: string; role: string } | null, user: { id: "user" } as { id: string } | null, read: vi.fn(), update: vi.fn(), admin: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createAdminClient: m.admin, createClient: async () => {
  const q = { select: () => q, eq: () => q, is: () => q, single: async () => ({ data: m.employee }) };
  return { auth: { getUser: async () => ({ data: { user: m.user } }) }, from: () => q };
} }));
vi.mock("@/repos/onboardingRepo", () => ({ getStartGuide: m.read, updateStartGuide: m.update }));
import { GET, PATCH } from "@/app/api/v1/onboarding/route";
beforeEach(() => { vi.clearAllMocks(); m.employee = { id: "person", tenant_id: "trusted", role: "admin" }; m.user = { id: "user" }; m.read.mockResolvedValue({ plannedTeamSize: null }); });
it("binds settings to the currently authenticated administrator and makes reading private", async () => {
  const result = await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify({ plannedTeamSize: "4-10", dismissed: true }) }));
  expect(result.status).toBe(200);
  expect(m.update).toHaveBeenCalledWith(undefined, "trusted", "person", { plannedTeamSize: "4-10", dismissed: true });
  expect((await GET()).headers.get("cache-control")).toBe("no-store");
});
it.each(["employee", "manager"])("rejects the current %s role without creating a privileged client", async role => {
  m.employee!.role = role;
  expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: '{"dismissed":true}' }))).status).toBe(403);
  expect(m.admin).not.toHaveBeenCalled();
});
it.each([{ tenantId: "forged", plannedTeamSize: "4-10" }, { plannedTeamSize: "1000" }, {}, { dismissed: "true" }])("rejects forged identity and invalid input: %j", async input => {
  expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify(input) }))).status).toBe(400);
  expect(m.update).not.toHaveBeenCalled();
});
it("allows clearing the optional answer and refuses anonymous access", async () => {
  expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: '{"plannedTeamSize":null}' }))).status).toBe(200);
  m.user = null;
  expect((await GET()).status).toBe(403);
});
