import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Project,
  TimeEntry,
  TimeEntryAudit,
} from "@/types/database";

export interface CockpitAuditRecord extends TimeEntryAudit {
  timeEntry: Pick<TimeEntry, "employee_id" | "date" | "project_id">;
}

export async function getCockpitTimeEntries(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
  employeeId?: string,
): Promise<TimeEntry[]> {
  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null);

  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data } = await query.order("clock_in", { ascending: true });
  return data ?? [];
}

export async function getCockpitActiveEntries(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId?: string,
): Promise<TimeEntry[]> {
  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("status", ["running", "paused"])
    .is("deleted_at", null);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data } = await query;
  return data ?? [];
}

export async function getCockpitAuditRecords(
  supabase: SupabaseClient,
  tenantId: string,
  changedSince: string,
  employeeId?: string,
): Promise<CockpitAuditRecord[]> {
  let query = supabase
    .from("time_entry_audit")
    .select(
      "*, timeEntry:time_entries!inner(employee_id, date, project_id)",
    )
    .eq("tenant_id", tenantId)
    .gte("changed_at", changedSince);

  if (employeeId) query = query.eq("timeEntry.employee_id", employeeId);

  const { data } = await query
    .order("changed_at", { ascending: false })
    .limit(150);
  return (data as unknown as CockpitAuditRecord[] | null) ?? [];
}

export async function getCockpitProjects(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<Project[]> {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("tenant_id", tenantId);
  return data ?? [];
}

export async function getCockpitTenantState(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const { data } = await supabase
    .from("tenants")
    .select("bundesland")
    .eq("id", tenantId)
    .single();
  return data?.bundesland ?? "berlin";
}
