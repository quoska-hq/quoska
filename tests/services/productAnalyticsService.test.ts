import { describe, expect, it } from "vitest";
import { buildProductOverview } from "@/services/productAnalyticsService";
import { productDay, productWeek, isStaleEntry } from "@/config/server/product-analytics-time";
import type { ProductData } from "@/types/product-analytics";
const data: ProductData = {
  tenants: [
    { id: "a", name: "Customer", created_at: "2026-08-24T10:00:00Z", plan: "free", setup_complete: true },
    { id: "b", name: "New", created_at: "2026-09-09T10:00:00Z", plan: "team", setup_complete: true },
    { id: "internal", name: "Internal", created_at: "2026-08-24T10:00:00Z", plan: "pro", setup_complete: true },
  ],
  employees: [
    { id: "e1", tenant_id: "a", user_id: "u1", role: "admin", first_name: "Test", last_name: "Admin", created_at: "2026-08-24T10:00:00Z", deleted_at: null },
    { id: "e2", tenant_id: "a", user_id: "u2", role: "employee", first_name: "Test", last_name: "Employee", created_at: "2026-09-08T10:00:00Z", deleted_at: null },
    { id: "e3", tenant_id: "b", user_id: "u3", role: "admin", first_name: "Test", last_name: "Admin", created_at: "2026-09-09T10:00:00Z", deleted_at: null },
    { id: "e4", tenant_id: "internal", user_id: "u4", role: "admin", first_name: "Test", last_name: "Admin", created_at: "2026-08-24T10:00:00Z", deleted_at: null },
  ],
  accounts: [
    { id: "u1", created_at: "2026-08-24T09:00:00Z", confirmed: true, banned: false, email: "active@example.test", last_sign_in_at: "2026-08-24T10:00:00Z" },
    { id: "u2", created_at: "2026-09-08T09:00:00Z", confirmed: false, banned: false, email: "invited@example.test", last_sign_in_at: null },
    { id: "u3", created_at: "2026-09-09T09:00:00Z", confirmed: true, banned: true, email: "blocked@example.test", last_sign_in_at: null },
    { id: "u4", created_at: "2026-08-24T09:00:00Z", confirmed: true, banned: false, email: "active@example.test", last_sign_in_at: "2026-08-24T10:00:00Z" },
    { id: "orphan", created_at: "2026-09-09T09:00:00Z", confirmed: false, banned: false, email: "invited@example.test", last_sign_in_at: null },
  ],
  entries: [
    { id: "t1", tenant_id: "a", created_at: "2026-09-01T10:00:00Z", date: "2026-01-01", entry_source: "import", status: "completed", clock_in: "2026-01-01T10:00:00Z" },
    { id: "t2", tenant_id: "a", created_at: "2026-09-08T22:30:00Z", date: "2026-09-09", entry_source: "clock", status: "paused", clock_in: "2026-09-07T10:00:00Z" },
  ], projects: [],
};
describe("product overview", () => {
  it("reconciles usable, invited, blocked and orphan accounts and excludes internal tenants", () => {
    const s = buildProductOverview(data, "2026-09-09T15:00:00Z", [], ["Internal"]);
    expect(s.totals).toEqual({ companies: 2, usableAccounts: 1, invitations: 1, blocked: 1, incompleteSignups: 1, activated: 1, paidPlans: 1, stale: 1 });
    expect(s.registration).toEqual({ accounts: 3, confirmed: 2, companies: 2, setup: 2, activated: 1 });
  });
  it("uses creation days, separates historical imports, and leaves young cohorts unscored", () => {
    const s = buildProductOverview(data, "2026-09-09T15:00:00Z", [], ["Internal"]);
    expect(s.weeks[0]).toMatchObject({ clock: 1, imports: 0 });
    expect(s.weeks[2]).toMatchObject({ clock: 0, imports: 1 });
    expect(s.cohorts.find(c => c.week === "2026-08-24")).toMatchObject({ eligible: true, returned: 1 });
    expect(s.cohorts.find(c => c.week === "2026-09-07")).toMatchObject({ eligible: false, returned: null });
    expect(s.tenants.find(t => t.name === "Customer")?.firstUse).toBe("2026-09-01");
  });
  it("counts repeat use without new entries and ignores internal or unknown tenant events", () => {
    const events = ["a", "internal", "unknown"].map(tenantKey => ({ day: "2026-09-08", action: "app_open", outcome: "ok", tenantKey, count: 1 }));
    const s = buildProductOverview(data, "2026-09-09T15:00:00Z", events, ["Internal"]);
    expect(s.actions).toHaveLength(1);
    expect(s.tenants.find(t => t.name === "Customer")?.daysThisWeek).toBe(2);
  });
  it("handles empty datasets and Berlin week boundaries across DST", () => {
    expect(buildProductOverview({ tenants: [], employees: [], accounts: [], entries: [], projects: [] }, "2026-09-09T15:00:00Z").totals.companies).toBe(0);
    expect(productDay("2026-10-25T23:30:00Z")).toBe("2026-10-26");
    expect(productWeek("2026-10-25")).toBe("2026-10-19");
    expect(productWeek("2026-10-26")).toBe("2026-10-26");
    expect(isStaleEntry("2026-09-08T15:00:00Z", "2026-09-09T15:00:00Z")).toBe(false);
    expect(isStaleEntry("2026-09-08T14:59:59Z", "2026-09-09T15:00:00Z")).toBe(true);
  });
  it("separates login from account activity without inferring app use from imported or company records", () => {
    const s = buildProductOverview(data, "2026-09-12T12:00:00Z", [], ["Internal"]);
    expect(s.accounts).toHaveLength(3);
    expect(s.accounts.find(a => a.id === "e1")).toMatchObject({ lastSignInAt: "2026-08-24T10:00:00Z", lastActiveAt: null, lastActionAt: null });
    expect(s.accounts.find(a => a.id === "e2")?.status).toBe("invited");
    expect(s.accounts.find(a => a.id === "e3")?.status).toBe("blocked");
    expect(s.accounts.find(a => a.id === "e4")).toBeUndefined();
  });
  it("joins both company and actor keys, sorts activity, and distinguishes deactivated accounts", () => {
    const copy = structuredClone(data);
    copy.employees[1].deleted_at = "2026-09-11T10:00:00Z";
    const s = buildProductOverview(copy, "2026-09-12T12:00:00Z", [], ["Internal"], id => `t-${id}`, [
      { tenantKey: "t-a", employeeKey: "e-e1", lastActiveAt: "2026-09-12T11:00:00Z", lastActionAt: "2026-09-12T09:00:00Z", lastAction: "invite" },
      { tenantKey: "t-a", employeeKey: "e-e2", lastActiveAt: "2026-09-10T11:00:00Z", lastActionAt: null, lastAction: null },
      { tenantKey: "t-a", employeeKey: "e-e3", lastActiveAt: "2026-09-12T12:00:00Z", lastActionAt: null, lastAction: null },
      { tenantKey: "t-internal", employeeKey: "e-e4", lastActiveAt: "2026-09-12T12:00:00Z", lastActionAt: null, lastAction: null },
    ], id => `e-${id}`);
    expect(s.accounts.map(a => a.id)).toEqual(["e1", "e2", "e3"]);
    expect(s.accounts[0]).toMatchObject({ lastSignInAt: "2026-08-24T10:00:00Z", lastActiveAt: "2026-09-12T11:00:00Z", lastAction: "invite" });
    expect(s.accounts[1]).toMatchObject({ status: "deactivated", lastActiveAt: "2026-09-10T11:00:00Z" });
    expect(s.accounts[2].lastActiveAt).toBeNull();
  });
});
