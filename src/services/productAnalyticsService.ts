import { createAdminClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";
import { productTenantKey } from "@/config/server/product-analytics-key";
import { productDay, productWeek, shiftProductDay, isStaleEntry } from "@/config/server/product-analytics-time";
import { loadProductData } from "@/repos/productAnalyticsRepo";
import { getProductActions } from "@/repos/productEventRepo";
import type { ProductData, ProductOverview, ActionCount } from "@/types/product-analytics";

export async function getProductOverview(now: string): Promise<ProductOverview> {
  const data = await loadProductData(createAdminClient(), now);
  const excluded = (serverEnv.PRODUCT_ANALYTICS_EXCLUDED_TENANTS ?? "").split("|").map(v => v.trim()).filter(Boolean);
  return buildProductOverview(data, now, getProductActions(), excluded, productTenantKey);
}

export function buildProductOverview(
  data: ProductData, now: string, events: ActionCount[] = [], excluded: string[] = [],
  tenantKey: (id: string) => string = id => id,
): ProductOverview {
  const today = productDay(now), weekStart = productWeek(today);
  const previousWeekStart = shiftProductDay(weekStart, -7);
  const tenants = data.tenants.filter(t => !excluded.includes(t.name));
  const tenantIds = new Set(tenants.map(t => t.id));
  const keys = new Map(tenants.map(t => [tenantKey(t.id), t.id]));
  const entries = data.entries.filter(e => tenantIds.has(e.tenant_id));
  const employees = data.employees.filter(e => tenantIds.has(e.tenant_id) && !e.deleted_at);
  const users = new Map(data.accounts.map(u => [u.id, u]));
  const linked = new Set(data.employees.map(e => e.user_id));
  const internalUsers = new Set(data.employees.filter(e => !tenantIds.has(e.tenant_id)).map(e => e.user_id));
  const accounts = data.accounts.filter(u => !internalUsers.has(u.id));
  const activeIds = new Set(employees.map(e => e.user_id));
  const usable = (id: string) => Boolean(users.get(id)?.confirmed && !users.get(id)?.banned);
  const actions = events.filter(e => !e.tenantKey || keys.has(e.tenantKey));
  const activity = entries.map(e => ({ tenant: e.tenant_id, day: productDay(e.created_at), kind: e.entry_source === "import" ? "imports" : e.entry_source === "manual" ? "manual" : "clock" }));
  const setup = [...data.projects, ...employees].filter(e => tenantIds.has(e.tenant_id))
    .map(e => ({ tenant: e.tenant_id, day: productDay(e.created_at), kind: "setup" }));
  const observed = actions.filter(e => e.outcome === "ok" && keys.has(e.tenantKey))
    .map(e => ({ tenant: keys.get(e.tenantKey)!, day: e.day, kind: e.action === "app_open" ? "app" : "action" }));
  const allActivity = [...activity, ...setup, ...observed];
  const between = (day: string, from: string, to: string) => day >= from && day < to;
  const stale = entries.filter(e => e.status !== "completed" && isStaleEntry(e.clock_in, now));
  const inPeriod = (from: string, to: string, label: string) => {
    const periodActivity = allActivity.filter(a => between(a.day, from, to));
    const countKind = (kind: string) => activity.filter(a => a.kind === kind && between(a.day, from, to)).length;
    return { label, from, to, companies: tenants.filter(t => between(productDay(t.created_at), from, to)).length,
      active: new Set(periodActivity.map(a => a.tenant)).size,
      clock: countKind("clock"), manual: countKind("manual"), imports: countKind("imports"),
      setup: new Set(periodActivity.filter(a => a.kind === "setup").map(a => a.tenant)).size,
      app: new Set(periodActivity.filter(a => a.kind === "app").map(a => a.tenant)).size };
  };
  const rows = tenants.map(t => {
    const te = entries.filter(e => e.tenant_id === t.id);
    const dates = [...new Set(te.map(e => productDay(e.created_at)))].sort();
    const active = employees.filter(e => e.tenant_id === t.id);
    const days = (from: string, to: string) => new Set(allActivity.filter(a => a.tenant === t.id && between(a.day, from, to)).map(a => a.day)).size;
    return { name: t.name, created: productDay(t.created_at), plan: t.plan,
      accounts: new Set(active.filter(e => usable(e.user_id)).map(e => e.user_id)).size,
      pending: active.filter(e => users.has(e.user_id) && !users.get(e.user_id)!.confirmed && !users.get(e.user_id)!.banned).length,
      entries: te.filter(e => e.entry_source !== "import").length, imports: te.filter(e => e.entry_source === "import").length,
      firstUse: dates[0] ?? null,
      lastUse: allActivity.filter(a => a.tenant === t.id).map(a => a.day).sort().at(-1) ?? null,
      daysThisWeek: days(weekStart, shiftProductDay(today, 1)), daysPreviousWeek: days(previousWeekStart, weekStart),
      stale: stale.filter(e => e.tenant_id === t.id).length };
  }).sort((a,b) => b.created.localeCompare(a.created) || a.name.localeCompare(b.name));
  const cohorts = [...new Set(tenants.map(t => productWeek(productDay(t.created_at))))].sort().reverse().map(week => {
    const members = tenants.filter(t => productWeek(productDay(t.created_at)) === week);
    const ids = new Set(members.map(t => t.id));
    const following = shiftProductDay(week, 7), end = shiftProductDay(week, 14);
    const eligible = end <= today;
    return { week, companies: members.length,
      activated: members.filter(t => entries.some(e => e.tenant_id === t.id)).length,
      eligible, returned: eligible ? new Set(allActivity.filter(a => ids.has(a.tenant) && between(a.day, following, end)).map(a => a.tenant)).size : null };
  });
  // This is an account cohort, not a ratio against optional browser CTA clicks.
  const founders = new Set(tenants.map(t => data.employees.filter(e => e.tenant_id === t.id && e.role === "admin")
    .sort((a,b) => a.created_at.localeCompare(b.created_at))[0]?.user_id).filter(Boolean));
  const registrations = accounts.filter(a => (founders.has(a.id) || !linked.has(a.id)) && between(productDay(a.created_at), shiftProductDay(today, -29), shiftProductDay(today, 1)));
  const signupIds = new Set(registrations.map(a => a.id));
  const signupTenants = tenants.filter(t => data.employees.some(e => e.tenant_id === t.id && founders.has(e.user_id) && signupIds.has(e.user_id)));
  return { at: now, today, weekStart, previousWeekStart,
    totals: { companies: tenants.length, usableAccounts: [...activeIds].filter(usable).length,
      invitations: employees.filter(e => users.has(e.user_id) && !users.get(e.user_id)!.confirmed && !users.get(e.user_id)!.banned).length,
      blocked: [...activeIds].filter(id => users.get(id)?.banned).length,
      incompleteSignups: accounts.filter(a => !linked.has(a.id)).length,
      activated: rows.filter(t => t.entries + t.imports > 0).length,
      paidPlans: tenants.filter(t => t.plan !== "free").length, stale: stale.length },
    registration: { accounts: registrations.length, confirmed: registrations.filter(a => a.confirmed).length,
      companies: signupTenants.length, setup: signupTenants.filter(t => t.setup_complete).length,
      activated: signupTenants.filter(t => entries.some(e => e.tenant_id === t.id)).length },
    weeks: [inPeriod(today, shiftProductDay(today, 1), "Heute · unvollständig"),
      inPeriod(weekStart, shiftProductDay(today, 1), "Laufende Woche · unvollständig"),
      inPeriod(previousWeekStart, weekStart, "Letzte vollständige Woche"),
      inPeriod(shiftProductDay(previousWeekStart, -7), previousWeekStart, "Vorherige vollständige Woche")],
    cohorts, tenants: rows, actions };
}
