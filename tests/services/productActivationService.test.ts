import { expect, it } from "vitest";
import { buildProductOverview } from "@/services/productAnalyticsService";
import type { ProductData, ProductEntry } from "@/types/product-analytics";

const tenant = (id: string) => ({ id, name: id, created_at: "2026-09-01T10:00:00Z", plan: "free", setup_complete: true });
const entry = (tenant_id: string, created_at: string, entry_source = "clock"): ProductEntry => ({
  id: created_at + tenant_id, tenant_id, created_at, entry_source, date: "2026-01-01", status: "completed",
  clock_in: "2026-01-01T08:00:00Z", clock_out: "2026-01-01T16:00:00Z",
});
const data: ProductData = {
  tenants: [{ ...tenant("regular"), planned_team_size: "4-10", first_report_export_at: "2026-09-17T10:00:00Z" }, tenant("import"), tenant("young"), tenant("internal")],
  employees: [], accounts: [], projects: [], payments: [{ tenantId: "regular", at: "2026-09-17T10:00:00Z" }, { tenantId: "internal", at: "2026-09-17T10:00:00Z" }],
  entries: [entry("regular", "2026-09-01T10:00:00Z"), entry("regular", "2026-09-08T10:00:00Z"), entry("import", "2026-09-01T10:00:00Z", "import"), entry("young", "2026-09-17T10:00:00Z"), entry("internal", "2026-09-01T10:00:00Z")],
};
it("separates imported history, real repeated creation days and young companies, excluding internal data", () => {
  const summary = buildProductOverview(data, "2026-09-19T10:00:00Z", [
    { day: "2026-09-18", action: "checkout_start", outcome: "error", tenantKey: "young", count: 1 },
    { day: "2026-09-18", action: "checkout_start", outcome: "ok", tenantKey: "regular", count: 3 },
    { day: "2026-09-18", action: "checkout_start", outcome: "ok", tenantKey: "internal", count: 1 },
  ], ["internal"]);
  expect(summary.activation).toMatchObject({ companies: 3, completedEntry: 2, returnEligible: 1, returned: 1, exported: 1, checkout: 1, paid: 1 });
  expect(summary.activation.teamSizes.find(s => s.size === "4-10")).toEqual({ size: "4-10", companies: 1, active: 1 });
  expect(summary.activation.teamSizes.find(s => s.size === null)?.companies).toBe(2);
});
it("waits until the entire second week is complete and excludes pending clocks", () => {
  const copy = structuredClone(data);
  copy.entries[0].status = "running"; copy.entries[0].clock_out = null;
  expect(buildProductOverview(copy, "2026-09-19T10:00:00Z", [], ["internal"]).activation).toMatchObject({ returnEligible: 0, returned: 0 });
  expect(buildProductOverview(data, "2026-09-14T10:00:00Z", [], ["internal"]).activation.returnEligible).toBe(0);
  expect(buildProductOverview(data, "2026-09-15T10:00:00Z", [], ["internal"]).activation.returnEligible).toBe(1);
});
it("requires an invited, confirmed, usable profile instead of counting the founder", () => {
  const copy = structuredClone(data);
  copy.employees = [{ id: "e", tenant_id: "regular", user_id: "u", role: "admin", first_name: "Test", last_name: "Person", created_at: "2026-09-01T10:00:00Z", deleted_at: null, invited_at: null }];
  copy.accounts = [{ id: "u", confirmed: true, banned: false, email: null, last_sign_in_at: null, created_at: "2026-09-01T10:00:00Z" }];
  expect(buildProductOverview(copy, "2026-09-19T10:00:00Z").activation.invited).toBe(0);
  copy.employees[0].invited_at = "2026-09-01T10:00:00Z";
  expect(buildProductOverview(copy, "2026-09-19T10:00:00Z").activation.invited).toBe(1);
  copy.accounts[0].banned = true;
  expect(buildProductOverview(copy, "2026-09-19T10:00:00Z").activation.invited).toBe(0);
});
