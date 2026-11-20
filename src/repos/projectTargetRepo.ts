import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectTarget, ProjectWeeklyTarget } from "@/types/project-target";

interface TargetRow {
  project_id: string;
  employee_id: string;
  effective_from: string;
  weekly_minutes: number;
  project: { name: string };
  employee: { first_name: string; last_name: string };
}

interface TargetFilters {
  projectId?: string;
  employeeId?: string;
  through?: string;
}

/** Load dated targets with names retained by archived projects and employees. */
export async function getProjectWeeklyTargets(
  supabase: SupabaseClient,
  tenantId: string,
  { projectId, employeeId, through }: TargetFilters = {},
): Promise<ProjectWeeklyTarget[]> {
  let query = supabase.from("project_weekly_targets")
    .select("project_id,employee_id,effective_from,weekly_minutes,project:projects!project_weekly_targets_project_fkey(name),employee:employees!project_weekly_targets_employee_fkey(first_name,last_name)")
    .eq("tenant_id", tenantId)
    .is("cancelled_at", null);
  if (projectId) query = query.eq("project_id", projectId);
  if (employeeId) query = query.eq("employee_id", employeeId);
  if (through) query = query.lte("effective_from", through);
  query = query.order("project_id").order("employee_id").order("effective_from");

  const rows: ProjectWeeklyTarget[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = (data ?? []) as unknown as TargetRow[];
    for (const row of page) {
      if (!row.project || !row.employee) continue;
      rows.push({
        projectId: row.project_id,
        projectName: row.project.name,
        employeeId: row.employee_id,
        employeeName: `${row.employee.first_name} ${row.employee.last_name}`.trim(),
        effectiveFrom: row.effective_from,
        weeklyMinutes: row.weekly_minutes,
      });
    }
    if (page.length < pageSize) return rows;
  }
}

export async function setProjectWeeklyTarget(
  supabase: SupabaseClient,
  tenantId: string,
  projectId: string,
  target: ProjectTarget,
) {
  const { error } = await supabase.rpc("set_project_weekly_target", {
    p_tenant_id: tenantId,
    p_project_id: projectId,
    p_employee_id: target.employeeId,
    p_effective_from: target.effectiveFrom,
    p_weekly_minutes: target.weeklyMinutes,
  });
  return error;
}
