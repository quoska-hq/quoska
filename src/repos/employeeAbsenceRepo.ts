import type { SupabaseClient } from "@supabase/supabase-js";

type AbsenceRange = { start_date: string; end_date: string | null };

/** Absences without a work obligation, scoped to one employee and date range. */
export async function getEmployeeAbsenceRanges(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<AbsenceRange[]> {
  if (startDate > endDate) return [];
  async function load(table: "leave_requests" | "sick_entries"): Promise<AbsenceRange[]> {
    const rows: AbsenceRange[] = [];
    const pageSize = 100;
    for (let offset = 0; ; offset += pageSize) {
      let query = supabase.from(table).select("start_date,end_date")
        .eq("tenant_id", tenantId).eq("employee_id", employeeId)
        .is("deleted_at", null).lte("start_date", endDate);
      query = table === "leave_requests"
        ? query.eq("status", "approved").gte("end_date", startDate)
        : query.or(`end_date.is.null,end_date.gte.${startDate}`);
      const { data, error } = await query.order("start_date").order("id")
        .range(offset, offset + pageSize - 1);
      // Failed queries must never silently turn leave into minus hours.
      if (error) throw new Error("Abwesenheiten konnten nicht geladen werden.");
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) return rows;
    }
  }
  const [leaves, sicknesses] = await Promise.all([load("leave_requests"), load("sick_entries")]);
  return [...leaves, ...sicknesses];
}
