import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ email: "customer@example.test", overview: vi.fn(), saved: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { email: mocks.email } } }) } }) }));
vi.mock("@/services/productAnalyticsService", () => ({ getProductOverview: mocks.overview }));
vi.mock("@/repos/productEventRepo", () => ({ saveProductSnapshot: mocks.saved }));
import { GET } from "@/app/api/v1/product-analytics/route";
import { POST } from "@/app/api/v1/cron/product-analytics/route";
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
it("does not query cross-tenant data for a customer administrator", async () => {
  vi.stubEnv("ANALYTICS_HASH_SECRET", "x".repeat(32)); vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "owner@example.test");
  mocks.email = "customer@example.test";
  expect((await GET()).status).toBe(404);
  expect(mocks.overview).not.toHaveBeenCalled();
});
it("returns a no-store report only to an allowlisted operator", async () => {
  vi.stubEnv("ANALYTICS_HASH_SECRET", "x".repeat(32)); vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "owner@example.test");
  mocks.email = "owner@example.test"; mocks.overview.mockResolvedValue({ totals: { companies: 1 } });
  const r = await GET(); expect(r.status).toBe(200); expect(r.headers.get("cache-control")).toContain("no-store");
});
it("does not save misleading snapshots when a live data source fails", async () => {
  vi.stubEnv("ANALYTICS_HASH_SECRET", "x".repeat(32)); vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "owner@example.test");
  vi.stubEnv("CRON_SECRET", "s".repeat(32)); mocks.overview.mockRejectedValue(new Error("unavailable"));
  const r = await POST(new Request("http://localhost", { method: "POST", headers: { authorization: "Bearer " + "s".repeat(32) } }));
  expect(r.status).toBe(503); expect(mocks.saved).not.toHaveBeenCalled();
});
it("requires cron authorization before collecting any data", async () => {
  expect((await POST(new Request("http://localhost", { method: "POST" }))).status).toBe(401);
  expect(mocks.overview).not.toHaveBeenCalled();
});
