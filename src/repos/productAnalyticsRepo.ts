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
  const [tenants, employees, entries, projects] = await Promise.all([
    rows<ProductData["tenants"][number]>("tenants", "id,name,created_at,plan,setup_complete"),
    rows<ProductData["employees"][number]>("employees", "id,tenant_id,user_id,role,created_at,deleted_at,first_name,last_name"),
    rows<ProductData["entries"][number]>("time_entries", "id,tenant_id,created_at,date,entry_source,status,clock_in", true),
    rows<ProductData["projects"][number]>("projects", "id,tenant_id,created_at", true),
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
  return { tenants, employees, accounts, entries, projects };
}
