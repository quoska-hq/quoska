import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), account: vi.fn(), aggregate: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: mocks.auth }));
vi.mock("@/repos/productAccountActivityRepo", () => ({ recordAccountActivity: mocks.account }));
vi.mock("@/repos/productEventRepo", () => ({ recordProductAction: mocks.aggregate }));
vi.mock("@/config/server/timestamps", () => ({ getNowIso: () => "2026-09-12T09:12:34.000Z" }));
import { POST } from "@/app/api/v1/product-activity/route";
import { productEmployeeKey, productTenantKey } from "@/config/server/product-analytics-key";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ANALYTICS_HASH_SECRET", "x".repeat(32));
  vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "owner@example.test");
  mocks.auth.mockResolvedValue({ data: { tenantId: "trusted-tenant", employeeId: "trusted-employee", role: "employee" } });
});
afterEach(() => vi.unstubAllEnvs());

it("derives identity and time exclusively from server authentication, ignoring a spoofed body", async () => {
  const r = await POST(new Request("https://example.test/api/v1/product-activity", { method: "POST", body: JSON.stringify({ employeeId: "victim", tenantId: "other", at: "2099-01-01", path: "private content" }) }));
  expect(r.status).toBe(204);
  expect(r.headers.get("cache-control")).toBe("no-store");
  expect(mocks.account).toHaveBeenCalledWith({ tenantKey: productTenantKey("trusted-tenant"), employeeKey: productEmployeeKey("trusted-employee"), at: "2026-09-12T09:12:34.000Z" });
  expect(JSON.stringify(mocks.account.mock.calls)).not.toMatch(/trusted-|victim|private|2099/);
  expect(productEmployeeKey("same-id")).not.toBe(productTenantKey("same-id"));
});
it.each([{ dnt: "1" }, { "sec-gpc": "1" }])("respects privacy preference %j without authentication or storage", async headers => {
  expect((await POST(new Request("https://example.test", { method: "POST", headers }))).status).toBe(204);
  expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.account).not.toHaveBeenCalled();
});
it("does not collect when disabled, cross-site or unauthenticated", async () => {
  vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "");
  expect((await POST(new Request("https://example.test", { method: "POST" }))).status).toBe(204);
  expect(mocks.auth).not.toHaveBeenCalled();
  vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "owner@example.test");
  expect((await POST(new Request("https://example.test", { method: "POST", headers: { "sec-fetch-site": "cross-site" } }))).status).toBe(403);
  expect(mocks.auth).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ data: null });
  expect((await POST(new Request("https://example.test", { method: "POST" }))).status).toBe(401);
  expect(mocks.account).not.toHaveBeenCalled(); expect(mocks.aggregate).not.toHaveBeenCalled();
});
it("does not break app use when analytics storage fails", async () => {
  mocks.account.mockImplementation(() => { throw new Error("database unavailable"); });
  expect((await POST(new Request("https://example.test", { method: "POST" }))).status).toBe(204);
});
