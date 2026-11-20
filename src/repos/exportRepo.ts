/**
 * Export Repo — Database queries for CSV/PDF export and DSGVO data portability.
 *
 * All functions accept a Supabase client so callers can choose
 * between RLS-enforced or admin client.
 *
 * This file is in the Repos layer. It can import from Types and Config only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Employee,
  TimeEntry,
  TimeEntryAudit,
} from "@/types/database";
import type { ReportEntry, ReportEntryFilters } from "@/types/export";
import { UNASSIGNED_PROJECT } from "@/types/project";

// ---------------------------------------------------------------------------
// Manager CSV/PDF export queries
// ---------------------------------------------------------------------------

/**
 * Get time entries for reports and exports with their historical employee and
 * project references, including projects that have since been archived.
 */
export async function getReportEntries(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
  { employeeId, projectId }: ReportEntryFilters = {},
): Promise<ReportEntry[]> {
  let query = supabase
    .from("time_entries")
    .select("*, employee:employees!employee_id(first_name,last_name), project:projects!project_id(name,customer_name)")
    .eq("tenant_id", tenantId)
    .eq("employee.tenant_id", tenantId)
    .eq("project.tenant_id", tenantId)
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: true })
    .order("clock_in", { ascending: true })
    .order("id", { ascending: true });

  if (employeeId) {
    query = query.eq("employee_id", employeeId);
  }
  if (projectId) {
    query = projectId === UNASSIGNED_PROJECT
      ? query.is("project_id", null)
      : query.eq("project_id", projectId);
  }

  const entries: ReportEntry[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data) return entries;
    const page = data as unknown as (TimeEntry & {
      employee: Pick<Employee, "first_name" | "last_name"> | null;
      project: { name: string; customer_name: string | null } | null;
    })[];
    for (const { employee, project, ...entry } of page) {
      entries.push({
        ...entry,
        employee_first_name: employee?.first_name ?? "Unbekannt",
        employee_last_name: employee?.last_name ?? "",
        project_name: project?.name ?? null,
        project_customer_name: project?.customer_name ?? null,
      });
    }
    if (page.length < pageSize) return entries;
  }
}

/**
 * Get all employees for a tenant (used in PDF report headers).
 */
export async function getTenantInfo(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{ name: string } | null> {
  const { data } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  return data;
}

// ---------------------------------------------------------------------------
// DSGVO data portability queries
// ---------------------------------------------------------------------------

/**
 * Get all time entries for an employee including soft-deleted ones.
 * For DSGVO Art 20 data portability — full history required.
 */
export async function getEmployeeAllEntries(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<TimeEntry[]> {
  // Use admin client to bypass deleted_at filter
  const { data } = await supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .order("date", { ascending: true });

  return data ?? [];
}

/**
 * Get all audit records where the employee is either the changer or the subject.
 * For DSGVO data portability.
 */
export async function getEmployeeAuditRecords(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<TimeEntryAudit[]> {
  // Audit records where this employee made changes
  const { data: changedByEmp } = await supabase
    .from("time_entry_audit")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("changed_by", employeeId)
    .order("changed_at", { ascending: true });

  // Audit records for this employee's time entries
  const { data: empEntries } = await supabase
    .from("time_entries")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId);

  const entryIds = (empEntries ?? []).map((e: { id: string }) => e.id);

  let changedForEmp: TimeEntryAudit[] = [];
  if (entryIds.length > 0) {
    const { data } = await supabase
      .from("time_entry_audit")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("time_entry_id", entryIds)
      .order("changed_at", { ascending: true });
    changedForEmp = data ?? [];
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  const all: TimeEntryAudit[] = [];
  for (const record of [...(changedByEmp ?? []), ...changedForEmp]) {
    if (!seen.has(record.id)) {
      seen.add(record.id);
      all.push(record);
    }
  }

  return all.sort((a, b) =>
    a.changed_at < b.changed_at ? -1 : 1,
  );
}

/**
 * Get employee profile data for DSGVO export.
 */
export async function getEmployeeProfile(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<Employee | null> {
  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  return data;
}

// ---------------------------------------------------------------------------
// Retention queries
// ---------------------------------------------------------------------------

/**
 * Find time entries older than the retention period (2 years).
 * Returns IDs for soft-deletion.
 */
export async function getExpiredEntries(
  supabase: SupabaseClient,
  tenantId: string,
  cutoffDate: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("time_entries")
    .select("id")
    .eq("tenant_id", tenantId)
    .lt("clock_in", cutoffDate)
    .is("deleted_at", null);

  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Soft-delete time entries by IDs. Sets deleted_at to the provided timestamp.
 */
export async function softDeleteEntries(
  supabase: SupabaseClient,
  entryIds: string[],
  nowIso: string,
): Promise<number> {
  if (entryIds.length === 0) return 0;

  const { count } = await supabase
    .from("time_entries")
    .update({ deleted_at: nowIso })
    .in("id", entryIds)
    .is("deleted_at", null);

  return count ?? 0;
}

/**
 * Hard-delete all data for a tenant.
 * Used after the 14-day deletion waiting period.
 */
export async function hardDeleteTenantData(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<void> {
  // Delete in dependency order: audit → corrections → breaks → entries → employees → tenant
  const tables = [
    "time_entry_audit",
    "correction_requests",
    "break_sessions",
    "notifications",
    "subscription_events",
    "time_entries",
    "employees",
  ];

  for (const table of tables) {
    await supabase
      .from(table)
      .delete()
      .eq("tenant_id", tenantId);
  }

  await supabase.from("tenants").delete().eq("id", tenantId);
}
