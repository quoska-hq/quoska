import { beforeEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { CONTACT_CONSENT_TEXT, CONTACT_CONSENT_VERSION } from "@/types/contact-preferences";
const m = vi.hoisted(() => ({ user: { id: "own-user" } as { id: string } | null, rpc: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: m.user }, error: null }) }, rpc: m.rpc,
}) }));
import { GET, PATCH } from "@/app/api/v1/settings/contact/route";
const body = { enabled: true, version: CONTACT_CONSENT_VERSION, source: "settings" };
const request = (value: unknown = body, headers: Record<string, string> = {}) => new Request("https://quoska.test/api/v1/settings/contact", { method: "PATCH", headers, body: JSON.stringify(value) });
beforeEach(() => { vi.clearAllMocks(); m.user = { id: "own-user" }; m.rpc.mockResolvedValue({ data: { enabled: true, eligible: true, canEnable: true }, error: null }); });
it("uses only the user-scoped RPC and makes preferences private", async () => {
  const response = await PATCH(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(m.rpc).toHaveBeenCalledWith("set_admin_contact_preference", { p_enabled: true, p_version: CONTACT_CONSENT_VERSION, p_source: "settings" });
  expect((await GET()).status).toBe(200);
  expect(m.rpc).toHaveBeenLastCalledWith("get_admin_contact_preference");
});
it.each([{ ...body, userId: "other" }, { ...body, email: "other@example.test" }, { ...body, enabled: "true" }, { ...body, version: "old" }, { ...body, source: "import" }, {}])("rejects forged and invalid input %j", async value => {
  expect((await PATCH(request(value))).status).toBe(400);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("rejects anonymous, malformed, oversized and cross-site requests", async () => {
  expect((await PATCH(request(body, { origin: "https://other.test" }))).status).toBe(403);
  expect((await PATCH(request(body, { "sec-fetch-site": "cross-site" }))).status).toBe(403);
  expect((await PATCH(new Request("http://localhost", { method: "PATCH", body: "{" }))).status).toBe(400);
  expect((await PATCH(request({ text: "x".repeat(1100) }))).status).toBe(413);
  m.user = null;
  expect((await GET()).status).toBe(401);
  expect((await PATCH(request())).status).toBe(401);
  expect(m.rpc).not.toHaveBeenCalled();
});
it("honors database role checks and does not claim success on database failure", async () => {
  m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  expect((await PATCH(request())).status).toBe(403);
  m.rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
  expect((await PATCH(request())).status).toBe(500);
  expect((await GET()).status).toBe(500);
});
it("allows an authenticated withdrawal without requiring cached admin claims", async () => {
  expect((await PATCH(request({ ...body, enabled: false }))).status).toBe(200);
  expect(m.rpc).toHaveBeenCalledWith("set_admin_contact_preference", expect.objectContaining({ p_enabled: false }));
});
it("keeps the recorded consent wording equal to the visible text", () => {
  const sql = readFileSync("supabase/migrations/038_admin_contact_preferences.sql", "utf8");
  expect(sql).toContain(`v_text CONSTANT TEXT := '${CONTACT_CONSENT_TEXT}'`);
  expect(sql).toContain(`p_version IS DISTINCT FROM '${CONTACT_CONSENT_VERSION}'`);
});
