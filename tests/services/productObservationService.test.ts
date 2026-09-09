import { beforeEach, afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock("@/repos/productEventRepo", () => ({ recordProductAction: mocks.record }));
vi.mock("@/config/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) }));
import { observeProductAction, outcomeForStatus } from "@/services/productObservationService";
beforeEach(() => { vi.clearAllMocks(); mocks.record.mockReset(); vi.stubEnv("ANALYTICS_HASH_SECRET", "x".repeat(32)); vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "owner@example.test"); });
afterEach(() => vi.unstubAllEnvs());
it("records import row rejection despite HTTP 200 without retaining content", async () => {
  const response = Response.json({ data: { errorCount: 2, rows: [{ secret: "private customer contents" }] } });
  const wrapped = observeProductAction("import", async () => response);
  expect(await wrapped(new Request("https://example.test"))).toBe(response);
  expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ action: "import", outcome: "invalid", count: 1 }));
  expect(JSON.stringify(mocks.record.mock.calls)).not.toContain("private");
});
it("preserves successful business responses if telemetry storage fails", async () => {
  mocks.record.mockImplementation(() => { throw new Error("disk unavailable"); });
  const response = Response.json({ data: { id: "saved" } });
  expect(await observeProductAction("clock_out", async () => response)(new Request("https://example.test"))).toBe(response);
});
it("classifies expected rejections separately from server failures", () => {
  expect([200,400,401,403,409,429,500].map(outcomeForStatus)).toEqual(["ok","invalid","denied","denied","conflict","limited","error"]);
});
it("records thrown failures without changing the original error", async () => {
  const failure = new Error("original");
  await expect(observeProductAction("invite", async () => { throw failure; })(new Request("https://example.test"))).rejects.toBe(failure);
  expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error" }));
});

it("keeps concurrent authenticated company observations isolated", async () => {
  const { setObservedTenant } = await import("@/config/server/product-observation-context");
  const { productTenantKey } = await import("@/config/server/product-analytics-key");
  let resume!: () => void;
  const gate = new Promise<void>(resolve => { resume = resolve; });
  const first = observeProductAction("clock_in", async () => { setObservedTenant("first"); await gate; return new Response(); });
  const second = observeProductAction("clock_out", async () => { setObservedTenant("second"); return new Response(); });
  const pending = first(new Request("https://example.test"));
  await second(new Request("https://example.test")); resume(); await pending;
  expect(mocks.record.mock.calls.map(c => c[0].tenantKey)).toEqual([productTenantKey("second"),productTenantKey("first")]);
});
it("recognizes the controlled import backend failure separately from invalid input", async () => {
  const wrapped = observeProductAction("import", async () => Response.json({ error: "Importprüfung fehlgeschlagen. Bitte versuche es erneut oder wende dich an die Administration." }, { status: 400 }));
  await wrapped(new Request("https://example.test"));
  expect(mocks.record).toHaveBeenCalledWith(expect.objectContaining({ outcome: "error" }));
});
