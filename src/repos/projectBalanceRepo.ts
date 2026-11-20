import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectWeeklyTarget } from "@/types/project-target";

interface BalanceBookingRecord {
  id: string;
  project_id: string;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  break_minutes: number;
}

/** Read completed bookings only for employee/project pairs with target history. */
export async function* getProjectBalanceBookingPages(
  supabase: SupabaseClient,
  tenantId: string,
  targets: readonly ProjectWeeklyTarget[],
  through: string,
): AsyncGenerator<BalanceBookingRecord[]> {
  const scopes = new Map<string, { firstDate: string; employees: Set<string> }>();
  for (const target of targets) {
    if (target.weeklyMinutes === 0 || target.effectiveFrom > through) continue;
    const scope = scopes.get(target.projectId) ?? {
      firstDate: target.effectiveFrom,
      employees: new Set<string>(),
    };
    if (target.effectiveFrom < scope.firstDate) scope.firstDate = target.effectiveFrom;
    scope.employees.add(target.employeeId);
    scopes.set(target.projectId, scope);
  }

  const pageSize = 1000;
  const employeeBatchSize = 100;
  for (const [projectId, { firstDate, employees }] of scopes) {
    const employeeIds = [...employees];
    for (let offset = 0; offset < employeeIds.length; offset += employeeBatchSize) {
      const ids = employeeIds.slice(offset, offset + employeeBatchSize);
      let cursor: Pick<BalanceBookingRecord, "date" | "id"> | undefined;
      for (;;) {
        let query = supabase
          .from("time_entries")
          .select("id, project_id, employee_id, date, clock_in, clock_out, break_minutes")
          .eq("tenant_id", tenantId)
          .eq("project_id", projectId)
          .in("employee_id", ids)
          .eq("status", "completed")
          .is("deleted_at", null)
          .not("clock_out", "is", null)
          .gte("date", firstDate)
          .lte("date", through)
          .order("date")
          .order("id")
          .limit(pageSize);
        if (cursor) {
          query = query.or(`date.gt.${cursor.date},and(date.eq.${cursor.date},id.gt.${cursor.id})`);
        }

        const { data, error } = await query;
        if (error) throw error;
        const page: BalanceBookingRecord[] = data ?? [];
        if (page.length > 0) yield page;
        if (page.length < pageSize) break;
        cursor = page[page.length - 1];
      }
    }
  }
}
