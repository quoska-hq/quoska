import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/config/supabase/server";
import { getEmployeeById } from "@/repos/employeeRepo";
import { getProjectById } from "@/repos/projectRepo";
import { getProjectWeeklyTargets, setProjectWeeklyTarget } from "@/repos/projectTargetRepo";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { projectTargetSchema } from "@/types/project-target";

type Params = { params: Promise<{ id: string }> };
const projectIdSchema = z.string().uuid();

function reject(status: number, error: string) {
  return NextResponse.json({ data: null, error }, { status });
}

async function getScope({ params }: Params, writing = false) {
  const supabase = await createClient();
  const auth = await getEmployeeFromAuth(supabase);
  if (!auth.data) return reject(401, auth.error ?? "Nicht authentifiziert.");
  const { tenantId, employeeId } = auth.data;
  const employee = await getEmployeeById(supabase, tenantId, employeeId);
  if (!employee || employee.deleted_at || (
    employee.role !== "admin" && (writing || employee.role !== "manager")
  )) return reject(403, "Zugriff verweigert.");

  const { id } = await params;
  const projectId = projectIdSchema.safeParse(id);
  if (!projectId.success) return reject(400, "Ungültiges Projekt.");
  return { supabase, tenantId, projectId: projectId.data };
}

export async function GET(_request: Request, params: Params) {
  try {
    const scope = await getScope(params);
    if (scope instanceof NextResponse) return scope;
    const { supabase, tenantId, projectId } = scope;
    if (!await getProjectById(supabase, tenantId, projectId)) {
      return reject(404, "Projekt nicht gefunden.");
    }
    const targets = await getProjectWeeklyTargets(supabase, tenantId, { projectId });
    const data = targets.map(({ employeeId, effectiveFrom, weeklyMinutes }) => ({
      employeeId, effectiveFrom, weeklyMinutes,
    }));
    return NextResponse.json({ data, error: null });
  } catch (error) {
    console.error("Project target history lookup failed:", error);
    return reject(500, "Wochenziele konnten nicht geladen werden.");
  }
}

export async function PATCH(request: Request, params: Params) {
  try {
    const scope = await getScope(params, true);
    if (scope instanceof NextResponse) return scope;
    const { supabase, tenantId, projectId } = scope;
    const input = projectTargetSchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return reject(400, input.error.issues[0]?.message ?? "Ungültiges Wochenziel.");
    }
    const error = await setProjectWeeklyTarget(supabase, tenantId, projectId, input.data);
    if (error?.code === "42501") return reject(403, "Zugriff verweigert.");
    if (error?.code === "P0002") return reject(404, "Aktives Projekt nicht gefunden.");
    if (error?.code === "22023") return reject(400, error.message);
    if (error) throw error;
    return NextResponse.json({ data: input.data, error: null });
  } catch (error) {
    console.error("Project target update failed:", error);
    return reject(500, "Wochenziel konnte nicht gespeichert werden.");
  }
}
