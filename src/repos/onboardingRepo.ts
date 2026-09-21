import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlannedTeamSize, StartGuideStatus } from "@/types/onboarding";
import { getNowIso } from "@/config/server/timestamps";

export async function getStartGuide(supabase: SupabaseClient, tenantId: string, employeeId: string): Promise<StartGuideStatus> {
  const [tenant, employee, colleagues, recorded, imported] = await Promise.all([
    supabase.from("tenants").select("planned_team_size,first_report_export_at").eq("id", tenantId).single(),
    supabase.from("employees").select("start_guide_dismissed_at").eq("id", employeeId).eq("tenant_id", tenantId).single(),
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).neq("id", employeeId).is("deleted_at", null),
    supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null).eq("status", "completed").neq("entry_source", "import"),
    supabase.from("time_entries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("deleted_at", null).eq("entry_source", "import"),
  ]);
  if ([tenant, employee, colleagues, recorded, imported].some(result => result.error)) throw new Error("Startliste konnte nicht geladen werden.");
  return {
    plannedTeamSize: tenant.data!.planned_team_size as PlannedTeamSize | null,
    dismissed: Boolean(employee.data!.start_guide_dismissed_at),
    invited: (colleagues.count ?? 0) > 0, recorded: (recorded.count ?? 0) > 0,
    imported: (imported.count ?? 0) > 0, exported: Boolean(tenant.data!.first_report_export_at),
  };
}

export async function updateStartGuide(supabase: SupabaseClient, tenantId: string, employeeId: string,
  input: { plannedTeamSize?: PlannedTeamSize | null; dismissed?: boolean }): Promise<void> {
  if (input.plannedTeamSize !== undefined) {
    const { error } = await supabase.from("tenants").update({ planned_team_size: input.plannedTeamSize }).eq("id", tenantId);
    if (error) throw new Error("Teamgröße konnte nicht gespeichert werden.");
  }
  if (input.dismissed !== undefined) {
    const { error } = await supabase.from("employees").update({ start_guide_dismissed_at: input.dismissed ? getNowIso() : null }).eq("tenant_id", tenantId).eq("id", employeeId);
    if (error) throw new Error("Startliste konnte nicht gespeichert werden.");
  }
}

export async function markFirstReportExport(supabase: SupabaseClient, tenantId: string): Promise<void> {
  const { error } = await supabase.from("tenants").update({ first_report_export_at: getNowIso() })
    .eq("id", tenantId).is("first_report_export_at", null);
  if (error) throw new Error("Exportfortschritt konnte nicht gespeichert werden.");
}
