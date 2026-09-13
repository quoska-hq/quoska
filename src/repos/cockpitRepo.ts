import type { SupabaseClient } from "@supabase/supabase-js";
import { format, parseISO, subDays } from "date-fns";
import type {
  Project,
  TimeEntry,
  TimeEntryAudit,
} from "@/types/database";
import type { CorrectionRequestWithEntry } from "@/types/correction";

export interface CockpitAuditRecord extends TimeEntryAudit {
  timeEntry: Pick<TimeEntry, "employee_id" | "date" | "project_id">;
}

export async function getCockpitTimeEntryScopes(
  supabase: SupabaseClient,
  tenantId: string,
  startDate: string,
  endDate: string,
  missingEntryStart: string,
  employeeId?: string,
): Promise<{ periodEntries: TimeEntry[]; recentBreakEntries: TimeEntry[]; missingEntryEntries: TimeEntry[] }> {
  const breakLookbackStart = format(subDays(parseISO(endDate), 6), "yyyy-MM-dd");
  const queryStart = [startDate, breakLookbackStart, missingEntryStart].sort()[0];
  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("tenant_id", tenantId)
    .gte("date", queryStart)
    .lte("date", endDate)
    .is("deleted_at", null);

  if (employeeId) query = query.eq("employee_id", employeeId);
  query = query.order("clock_in", { ascending: true }).order("id", { ascending: true });
  const entries: TimeEntry[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    entries.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return {
    periodEntries: entries.filter((entry) => entry.date >= startDate),
    recentBreakEntries: entries.filter((entry) => entry.date >= breakLookbackStart),
    missingEntryEntries: entries.filter((entry) => entry.date >= missingEntryStart),
  };
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

export async function getCockpitCorrectionRecords(
  supabase: SupabaseClient,
  tenantId: string,
  updatedSince: string,
  employeeId?: string,
): Promise<CorrectionRequestWithEntry[]> {
  let query = supabase
    .from("correction_requests")
    .select(
      "*, timeEntry:time_entries!inner(employee_id, date, project_id, clock_in, clock_out, break_minutes, notes)",
    )
    .eq("tenant_id", tenantId)
    .or(`status.eq.pending,updated_at.gte.${updatedSince}`);

  if (employeeId) query = query.eq("timeEntry.employee_id", employeeId);

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(150);
  return (data as unknown as CorrectionRequestWithEntry[] | null) ?? [];
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
