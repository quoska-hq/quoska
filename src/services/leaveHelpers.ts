/**
 * Leave Helpers — Shared utilities for leave and sick services.
 *
 * Pure functions and DB lookups used by both leaveService and sickEntryService.
 *
 * This file is in the Services layer. It imports from Repos, Types.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getHolidaysInRange } from "@/repos/holidayRepo";
import { addDays } from "@/services/holidayService";
import type { EmployeeWorkSchedule } from "@/types/work-schedule";
import { scheduledEmployeeMinutesForDate } from "@/services/workScheduleService";

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

/** Get the employee's original and dated contractual schedules. */
export async function getEmployeeWorkSchedule(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
): Promise<EmployeeWorkSchedule> {
  const { data } = await supabase
    .from("employees")
    .select("work_schedule, work_schedule_history, target_hours_week")
    .eq("id", employeeId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  return data ?? {};
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
 * Count scheduled days outside public holidays for the given Bundesland.
 */
export async function calculateWorkDaysCount(
  supabase: SupabaseClient,
  bundesland: string,
  startDate: string,
  endDate: string,
  employee?: EmployeeWorkSchedule,
): Promise<number> {
  const holidays = await getHolidaysInRange(supabase, bundesland, startDate, endDate);
  const holidayDates = new Set(holidays.map((h) => h.date));

  let count = 0;
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    if (!holidayDates.has(date) && scheduledEmployeeMinutesForDate(employee, date) > 0) {
      count++;
    }
  }

  return count;
}
