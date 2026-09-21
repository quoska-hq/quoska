import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ record: vi.fn(), account: vi.fn(), checkout: vi.fn(), role: "admin", enabled: true }));
vi.mock("@/repos/productEventRepo", () => ({ recordProductAction: m.record }));
vi.mock("@/repos/productAccountActivityRepo", () => ({ recordAccountActivity: m.account }));
vi.mock("@/lib/stripe", () => ({ isBillingEnabled: () => m.enabled }));
vi.mock("@/services/subscriptionService", () => ({ createCheckout: m.checkout }));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: async () => ({ data: { tenantId: "trusted", employeeId: "actor", role: m.role } }) }));
vi.mock("@/config/supabase/server", () => ({ createClient: async () => ({}), createAdminClient: () => ({
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { name: "Local company", email: "test@example.test" } }) }) }) }),
}) }));
import { POST } from "@/app/api/v1/stripe/checkout/route";
import { productTenantKey } from "@/config/server/product-analytics-key";
const request = () => new Request("http://localhost", { method: "POST", body: JSON.stringify({ tier: "team", tenantId: "forged" }) });
beforeEach(() => {
  vi.clearAllMocks(); m.role = "admin"; m.enabled = true;
  vi.stubEnv("STRIPE_TEAM_PRICE_ID", "price_local");
  vi.stubEnv("ANALYTICS_HASH_SECRET", "s".repeat(32)); vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "operator@example.test");
  m.checkout.mockResolvedValue({ data: { url: "https://checkout.example.test/session" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());
it("counts a server-created checkout for the trusted tenant without inferring payment", async () => {
  expect((await POST(request())).status).toBe(200);
  expect(m.checkout.mock.calls[0][0]).toBe("trusted");
  expect(m.record).toHaveBeenCalledWith(expect.objectContaining({ action: "checkout_start", outcome: "ok", tenantKey: productTenantKey("trusted") }));
  expect(m.record).toHaveBeenCalledTimes(1);
});
it("keeps payment-provider failures distinct from created sessions", async () => {
  m.checkout.mockRejectedValue(new Error("provider unavailable"));
  expect((await POST(request())).status).toBe(500);
  expect(m.record).toHaveBeenCalledWith(expect.objectContaining({ action: "checkout_start", outcome: "error" }));
});
it("does not create a checkout for an employee", async () => {
  m.role = "employee";
  expect((await POST(request())).status).toBe(403);
  expect(m.checkout).not.toHaveBeenCalled();
});
