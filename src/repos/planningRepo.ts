import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee, TimeEntry, PublicHoliday } from "@/types/database";
import type { PlanningAbsence, PlanningState } from "@/types/planning";
import { planningStateSchema } from "@/types/planning-schemas";
import { EMPTY_PLANNING_CONFIG } from "@/config/planning";

export async function readPlanningActor(client: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  const employee = await client
    .from("employees")
    .select("id,tenant_id,role")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (employee.error || !employee.data) return null;
  return {
    userId: user.id,
    employeeId: employee.data.id as string,
    tenantId: employee.data.tenant_id as string,
    role: employee.data.role as string,
  };
}
export async function readPlanningState(
  client: SupabaseClient,
  tenantId: string,
  from: string,
) {
  const [workspace, periods] = await Promise.all([
    client
      .from("planning_workspaces")
      .select("version,config")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .maybeSingle(),
    client
      .from("planning_periods")
      .select("state")
      .eq("tenant_id", tenantId)
      .gte("month", from)
      .is("deleted_at", null)
      .order("month")
      .limit(6),
  ]);
  if (workspace.error || periods.error) throw new Error("Planning read failed");
  return {
    version: Number(workspace.data?.version ?? 0),
    state: planningStateSchema.parse({
      config: workspace.data?.config ?? EMPTY_PLANNING_CONFIG,
      periods: periods.data?.map((p) => p.state) ?? [],
    }),
  };
}
async function pages<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  tenantId: string,
): Promise<T[]> {
  const result: T[] = [];
  for (let page = 0; page < 1000; page++) {
    const response = await client
      .from(table)
      .select(columns)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("id")
      .range(page * 1000, page * 1000 + 999);
    if (response.error) throw new Error(`Planning input read failed: ${table}`);
    const batch = response.data as unknown as T[];
    result.push(...batch);
    if (batch.length < 1000) return result;
  }
  throw new Error("Planning input pagination exceeded");
}
export async function readPlanningInputs(
  client: SupabaseClient,
  tenantId: string,
) {
  const [employees, entries, leaves, sickness, holidays] = await Promise.all([
    pages<Employee>(client, "employees", "*", tenantId),
    pages<TimeEntry>(
      client,
      "time_entries",
      "id,employee_id,date,clock_in,clock_out,break_minutes,status",
      tenantId,
    ),
    pages<{
      employee_id: string;
      start_date: string;
      end_date: string;
      status: string;
    }>(
      client,
      "leave_requests",
      "id,employee_id,start_date,end_date,status",
      tenantId,
    ),
    pages<{ employee_id: string; start_date: string; end_date: string | null }>(
      client,
      "sick_entries",
      "id,employee_id,start_date,end_date",
      tenantId,
    ),
    client
      .from("public_holidays")
      .select("date,bundesland")
      .order("date")
      .limit(10000),
  ]);
  if (holidays.error) throw new Error("Planning holiday read failed");
  const absences: PlanningAbsence[] = [
    ...leaves.filter((l) => l.status === "approved"),
    ...sickness,
  ].map((a) => ({
    employeeId: a.employee_id,
    start: a.start_date,
    end: a.end_date,
  }));
  return {
    employees,
    entries,
    absences,
    holidays: holidays.data as PublicHoliday[],
  };
}
export async function commitPlanning(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  version: number,
  state: PlanningState,
  action: string,
  reason: string,
  jobId?: string,
  swapId?: string,
): Promise<number> {
  const response = await client.rpc("planning_commit", {
    p_tenant: tenantId,
    p_user: userId,
    p_version: version,
    p_state: state,
    p_action: action,
    p_reason: reason,
    p_job: jobId ?? null,
    p_swap: swapId ?? null,
  });
  if (response.error)
    throw Object.assign(new Error("Planning commit failed"), {
      code: response.error.code,
    });
  return Number(response.data);
}
export async function enqueuePlanning(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  version: number,
  month: string,
  payload: unknown,
): Promise<string> {
  const response = await client.rpc("planning_enqueue", {
    p_tenant: tenantId,
    p_user: userId,
    p_version: version,
    p_month: month,
    p_payload: payload,
  });
  if (response.error)
    throw Object.assign(new Error("Planning enqueue failed"), {
      code: response.error.code,
    });
  return response.data as string;
}
export async function readPlanningJobs(
  client: SupabaseClient,
  tenantId: string,
) {
  const result = await client
    .from("planning_jobs")
    .select("id,month,input_version,status,result,created_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);
  if (result.error) throw new Error("Planning jobs read failed");
  return result.data;
}
