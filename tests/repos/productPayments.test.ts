import { expect, it } from "vitest";
import { confirmedProductPayments } from "@/repos/productAnalyticsRepo";

const tenants = [{ id: "a", name: "Company", plan: "team", setup_complete: true, created_at: "2026-09-01T10:00:00Z", stripe_customer_id: "cus_a" }];
const evidence = { event_type: "invoice.paid", processed: true, created_at: "2026-09-18T10:00:00Z", customer: "cus_a", status: "paid", amount: "900", live: "true" };
it("counts only the first confirmed positive live invoice for a linked customer", () => {
  const rows = [evidence, { ...evidence, created_at: "2026-09-17T10:00:00Z" }, { ...evidence, customer: "unknown" }];
  expect(confirmedProductPayments(tenants, rows)).toEqual([{ tenantId: "a", at: "2026-09-17T10:00:00Z" }]);
});
it.each([{ event_type: "checkout.session.completed" }, { processed: false }, { status: "open" }, { amount: "0" }, { amount: null }, { amount: "NaN" }, { live: "false" }])("does not turn incomplete or non-revenue evidence into payment: %j", patch => {
  expect(confirmedProductPayments(tenants, [{ ...evidence, ...patch }])).toEqual([]);
});
