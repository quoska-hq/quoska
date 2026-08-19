import type { SupabaseClient } from "@supabase/supabase-js";
import { getNowIso, getTodayDate } from "@/config/server/timestamps";
import { getActiveBreak } from "@/repos/breakSessionRepo";
import { getActiveEntry, getTodayEntries } from "@/repos/timeEntryRepo";
import { endBreak, startBreak } from "@/services/breakService";
import { getMyProjects } from "@/services/projectService";
import { clockIn, clockOut } from "@/services/timeEntryService";
import { scheduledMinutesForDate } from "@/services/workScheduleService";
import type { ApiResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { BreakSession, TimeEntry } from "@/types/database";
import type {
  BrowserExtensionClockAction,
  BrowserExtensionStatus,
} from "@/types/browser-extension";

interface EmployeeContext {
  tenantId: string;
  employeeId: string;
}

export function calculateTodayWorkedSeconds(
  entries: TimeEntry[],
  serverNow: string,
  activeBreak: BreakSession | null,
): number {
  const nowMs = Date.parse(serverNow);
  const workedSeconds = entries.reduce((total, entry) => {
    const endMs = entry.clock_out ? Date.parse(entry.clock_out) : nowMs;
    const grossSeconds = Math.max(0, (endMs - Date.parse(entry.clock_in)) / 1000);
    return total + Math.max(0, grossSeconds - entry.break_minutes * 60);
  }, 0);
  const activeBreakSeconds = activeBreak
    ? Math.max(0, (nowMs - Date.parse(activeBreak.break_start)) / 1000)
    : 0;
  return Math.max(0, Math.floor(workedSeconds - activeBreakSeconds));
}

export async function getBrowserExtensionStatus(
  supabase: SupabaseClient,
  context: EmployeeContext,
): Promise<ApiResponse<BrowserExtensionStatus>> {
  const serverNow = getNowIso();
  const todayDate = getTodayDate();
  const [activeEntry, projectsResult, employeeResult, todayEntries] = await Promise.all([
    getActiveEntry(supabase, context.tenantId, context.employeeId),
    getMyProjects(supabase, context.tenantId, context.employeeId),
    supabase
      .from("employees")
      .select("first_name, last_name, target_hours_week, work_schedule")
      .eq("id", context.employeeId)
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .single(),
    getTodayEntries(supabase, context.tenantId, context.employeeId, todayDate),
  ]);

  if (!employeeResult.data) {
    return failure("Mitarbeiterprofil nicht gefunden.");
  }

  const activeBreak = activeEntry?.status === "paused"
    ? await getActiveBreak(supabase, context.tenantId, activeEntry.id)
    : null;
  const employeeName = [
    employeeResult.data.first_name,
    employeeResult.data.last_name,
  ].filter(Boolean).join(" ") || "Quoska-Nutzer";

  return success({
    employeeName,
    serverNow,
    todayWorkedSeconds: calculateTodayWorkedSeconds(
      todayEntries,
      serverNow,
      activeBreak,
    ),
    todayTargetMinutes: scheduledMinutesForDate(
      employeeResult.data.work_schedule,
      todayDate,
      employeeResult.data.target_hours_week,
    ),
    activeEntry: activeEntry
      ? {
          id: activeEntry.id,
          clockIn: activeEntry.clock_in,
          breakMinutes: activeEntry.break_minutes,
          status: activeEntry.status as "running" | "paused",
          notes: activeEntry.notes,
          projectId: activeEntry.project_id ?? null,
        }
      : null,
    activeBreak: activeBreak
      ? { id: activeBreak.id, breakStart: activeBreak.break_start }
      : null,
    projects: projectsResult.data ?? [],
  });
}

export async function performBrowserExtensionClockAction(
  supabase: SupabaseClient,
  context: EmployeeContext,
  input: BrowserExtensionClockAction,
): Promise<ApiResponse<BrowserExtensionStatus>> {
  const activeEntry = await getActiveEntry(
    supabase,
    context.tenantId,
    context.employeeId,
  );
  let error: string | null = null;

  if (input.action === "clock-in") {
    if (input.projectId) {
      const projects = await getMyProjects(
        supabase,
        context.tenantId,
        context.employeeId,
      );
      if (!projects.data?.some((project) => project.id === input.projectId)) {
        return failure("Dieses Projekt ist dir nicht zugewiesen.");
      }
    }
    const result = await clockIn(
      supabase,
      context.tenantId,
      context.employeeId,
      getTodayDate(),
      input.notes || undefined,
      input.projectId,
    );
    error = result.error;
  } else if (!activeEntry) {
    return failure("Du bist nicht eingestempelt.");
  } else if (input.action === "clock-out") {
    const result = await clockOut(
      supabase,
      context.tenantId,
      context.employeeId,
      activeEntry.id,
      getNowIso(),
    );
    error = result.error;
  } else if (input.action === "pause") {
    const result = await startBreak(
      supabase,
      context.tenantId,
      context.employeeId,
      activeEntry.id,
    );
    error = result.error;
  } else {
    const activeBreak = await getActiveBreak(
      supabase,
      context.tenantId,
      activeEntry.id,
    );
    if (!activeBreak) return failure("Keine aktive Pause gefunden.");
    const result = await endBreak(
      supabase,
      context.tenantId,
      context.employeeId,
      activeBreak.id,
      getNowIso(),
    );
    error = result.error;
  }

  if (error) return failure(error);
  return getBrowserExtensionStatus(supabase, context);
}
