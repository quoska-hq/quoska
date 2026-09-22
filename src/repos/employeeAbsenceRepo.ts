import type { SupabaseClient } from "@supabase/supabase-js";

/** Dates without a work obligation, scoped to one employee and the requested range. */
export async function getEmployeeAbsenceRanges(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<{ start_date: string; end_date: string | null }[]> {
  if (startDate > endDate) return [];
  const [leaves, sicknesses] = await Promise.all([
    supabase.from("leave_requests").select("start_date,end_date")
      .eq("tenant_id", tenantId).eq("employee_id", employeeId)
      .eq("status", "approved").is("deleted_at", null)
      .lte("start_date", endDate).gte("end_date", startDate),
    supabase.from("sick_entries").select("start_date,end_date")
      .eq("tenant_id", tenantId).eq("employee_id", employeeId)
      .is("deleted_at", null).lte("start_date", endDate)
      .or(`end_date.is.null,end_date.gte.${startDate}`),
  ]);
  // A failed absence query must never silently turn leave into minus hours.
  if (leaves.error || sicknesses.error) throw new Error("Abwesenheiten konnten nicht geladen werden.");
  return [...(leaves.data ?? []), ...(sicknesses.data ?? [])];
}
