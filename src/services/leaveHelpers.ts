/**
 * Leave Helpers — Shared utilities for leave and sick services.
 *
 * Pure functions and DB lookups used by both leaveService and sickEntryService.
 *
 * This file is in the Services layer. It imports from Repos, Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getHolidaysInRange } from "@/repos/holidayRepo";
import { isWeekend } from "@/services/holidayService";
import { normalizeWorkSchedule, type WorkSchedule } from "@/types/work-schedule";
import { isScheduledWorkday } from "@/services/workScheduleService";

/** Get employee's bundesland from DB. */
export async function getEmployeeBundesland(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("employees")
    .select("bundesland")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.bundesland ?? null;
}

/** Get an employee's contractual weekday schedule. */
export async function getEmployeeWorkSchedule(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<WorkSchedule> {
  const { data } = await supabase
    .from("employees")
    .select("work_schedule, target_hours_week")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  return normalizeWorkSchedule(data?.work_schedule, data?.target_hours_week ?? 40);
}

/** Get employee display name. */
export async function getEmployeeName(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<string> {
  const { data } = await supabase
    .from("employees")
    .select("first_name, last_name")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data ? `${data.first_name} ${data.last_name}` : "Mitarbeiter";
}

/** Format YYYY-MM-DD to DD.MM.YYYY for display. */
export function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/** Extract year from YYYY-MM-DD string. */
export function getYear(dateStr: string): number {
  return parseInt(dateStr.substring(0, 4), 10);
}

/**
 * Calculate the number of work days in a date range.
 * Excludes weekends and public holidays for the given Bundesland.
 */
export async function calculateWorkDaysCount(
  supabase: SupabaseClient,
  bundesland: string,
  startDate: string,
  endDate: string,
  workSchedule?: WorkSchedule,
): Promise<number> {
  const holidays = await getHolidaysInRange(supabase, bundesland, startDate, endDate);
  const holidayDates = new Set(holidays.map((h) => h.date));

  let count = 0;
  let current = startDate;

  while (current <= endDate) {
    const isWorkday = workSchedule
      ? isScheduledWorkday(workSchedule, current, holidayDates)
      : !isWeekend(current) && !holidayDates.has(current);
    if (isWorkday) {
      count++;
    }
    const ms = Date.parse(current + "T12:00:00Z") + 86_400_000;
    const d = new Date(ms); // eslint-disable-line @quoska/legal/no-client-timestamps
    current = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  return count;
}
