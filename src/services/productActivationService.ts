import type { ProductData, ProductOverview, ActionCount } from "@/types/product-analytics";
import { TEAM_SIZES } from "@/types/onboarding";
import { productDay, shiftProductDay } from "@/config/server/product-analytics-time";

export function buildProductActivation(data: ProductData, today: string, events: ActionCount[], tenantKey: (id: string) => string): ProductOverview["activation"] {
  const firstDays = new Map<string, string>();
  const completed = data.entries.filter(e => e.entry_source !== "import" && e.status === "completed" && e.clock_out);
  for (const entry of completed) {
    const day = productDay(entry.created_at);
    if (day > today) continue;
    if (!firstDays.has(entry.tenant_id) || day < firstDays.get(entry.tenant_id)!) firstDays.set(entry.tenant_id, day);
  }
  const eligible = [...firstDays].filter(([, day]) => shiftProductDay(day, 14) <= today);
  const returned = eligible.filter(([id, first]) => completed.some(e => e.tenant_id === id &&
    productDay(e.created_at) >= shiftProductDay(first, 7) && productDay(e.created_at) < shiftProductDay(first, 14)));
  const usable = new Set(data.accounts.filter(a => a.confirmed && !a.banned).map(a => a.id));
  return {
    companies: data.tenants.length,
    invited: data.tenants.filter(t => data.employees.some(e => e.tenant_id === t.id &&
      e.invited_at && !e.deleted_at && usable.has(e.user_id))).length,
    completedEntry: firstDays.size, returnEligible: eligible.length, returned: returned.length,
    exported: data.tenants.filter(t => Boolean(t.first_report_export_at)).length,
    checkout: data.tenants.filter(t => events.some(e => e.tenantKey === tenantKey(t.id) && e.action === "checkout_start" && e.outcome === "ok")).length,
    paid: new Set((data.payments ?? []).filter(p => data.tenants.some(t => t.id === p.tenantId)).map(p => p.tenantId)).size,
    teamSizes: [...TEAM_SIZES, null].map(size => ({ size,
      companies: data.tenants.filter(t => (t.planned_team_size ?? null) === size).length,
      active: data.tenants.filter(t => (t.planned_team_size ?? null) === size && firstDays.has(t.id)).length,
    })),
  };
}
