import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatevSettings, DatevSnapshot } from "@/types/datev";

export async function getDatevSnapshot(client: SupabaseClient, tenantId: string, month: string): Promise<DatevSnapshot> {
  const { data, error } = await client.rpc("datev_month_snapshot", { p_tenant: tenantId, p_month: `${month}-01` });
  if (error || !data) throw new Error("DATEV-Daten konnten nicht geladen werden.");
  return data as DatevSnapshot;
}
export async function saveDatevSettings(client: SupabaseClient, tenantId: string, settings: DatevSettings) {
  const { error } = await client.rpc("save_datev_settings", {
    p_tenant: tenantId, p_config: settings, p_revision: settings.revision,
  });
  if (error) {
    if (error.message.includes("datev_settings_conflict")) throw new Error("Die Einstellungen wurden inzwischen geändert. Bitte neu laden.");
    if (error.message.includes("datev_employee_scope")) throw new Error("Person gehört nicht zu dieser Firma.");
    throw new Error("DATEV-Einstellungen konnten nicht gespeichert werden.");
  }
}
export async function storeDatevExport(client: SupabaseClient, tenantId: string, employeeId: string,
  month: string, fingerprint: string, content: string) {
  const { error } = await client.from("datev_exports").upsert({ tenant_id: tenantId, created_by: employeeId,
    month: `${month}-01`, fingerprint, content }, { onConflict: "tenant_id,month,fingerprint", ignoreDuplicates: true });
  if (error) throw new Error("Export konnte nicht protokolliert werden.");
  const result = await client.from("datev_exports").select("id,content").eq("tenant_id", tenantId)
    .eq("month", `${month}-01`).eq("fingerprint", fingerprint).single();
  if (result.error || !result.data) throw new Error("Export konnte nicht geladen werden.");
  return result.data as { id: string; content: string };
}
