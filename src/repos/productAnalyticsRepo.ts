import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductData, ProductAccount } from "@/types/product-analytics";

// System reporting only: callers must authenticate the operator or cron first.
// Fail on any incomplete source; never turn a database failure into zero customers.
export async function loadProductData(admin: SupabaseClient, now: string): Promise<ProductData> {
  async function rows<T>(table: string, columns: string, active = false): Promise<T[]> {
    const result: T[] = [];
    for (let offset = 0; ; offset += 1000) {
      let query = admin.from(table).select(columns).order("id").range(offset, offset + 999);
      if (active) query = query.is("deleted_at", null);
      const { data, error } = await query;
      if (error || !data) throw new Error("Produktdaten konnten nicht vollständig geladen werden.");
      result.push(...data as unknown as T[]);
      if (data.length < 1000) return result;
    }
  }
  const [tenants, employees, entries, projects, invoices] = await Promise.all([
    rows<ProductData["tenants"][number]>("tenants", "id,name,created_at,plan,setup_complete,planned_team_size,first_report_export_at,stripe_customer_id"),
    rows<ProductData["employees"][number]>("employees", "id,tenant_id,user_id,role,created_at,deleted_at,first_name,last_name,invited_at"),
    rows<ProductData["entries"][number]>("time_entries", "id,tenant_id,created_at,date,entry_source,status,clock_in,clock_out", true),
    rows<ProductData["projects"][number]>("projects", "id,tenant_id,created_at", true),
    rows<PaymentEvidence>("subscription_events", "id,event_type,processed,created_at,customer:payload->>customer,status:payload->>status,amount:payload->>amount_paid,live:payload->>livemode"),
  ]);
  const accounts: ProductAccount[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) throw new Error("Konten konnten nicht vollständig geladen werden.");
    accounts.push(...data.users.map((u) => ({
      id: u.id, created_at: u.created_at, confirmed: Boolean(u.email_confirmed_at),
      banned: Boolean(u.banned_until && Date.parse(u.banned_until) > Date.parse(now)),
      email: u.email ?? null, last_sign_in_at: u.last_sign_in_at ?? null,
    })));
    if (data.users.length < 1000) break;
  }
  return { tenants, employees, accounts, entries, projects, payments: confirmedProductPayments(tenants, invoices) };
}

interface PaymentEvidence {
  event_type: string; processed: boolean; created_at: string;
  customer: string | null; status: string | null; amount: string | null; live: string | null;
}

// Only signature-verified webhook records are written to subscription_events.
// A paid plan, browser return, trial, zero invoice or test payment is not revenue.
export function confirmedProductPayments(tenants: ProductData["tenants"], invoices: PaymentEvidence[]) {
  const customers = new Map(tenants.filter(t => t.stripe_customer_id).map(t => [t.stripe_customer_id, t.id]));
  const first = new Map<string, string>();
  for (const invoice of invoices) {
    const tenantId = customers.get(invoice.customer);
    if (!tenantId || invoice.event_type !== "invoice.paid" || !invoice.processed || invoice.live !== "true" ||
      invoice.status !== "paid" || !Number.isSafeInteger(Number(invoice.amount)) || !(Number(invoice.amount) > 0)) continue;
    const previous = first.get(tenantId);
    if (!previous || invoice.created_at < previous) first.set(tenantId, invoice.created_at);
  }
  return [...first].map(([tenantId, at]) => ({ tenantId, at }));
}
