import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectBalanceBookingPages } from "@/repos/projectBalanceRepo";
import { getProjectWeeklyTargets } from "@/repos/projectTargetRepo";
import { getWeekSunday } from "@/services/holidayService";
import { buildPersonalProjectGoals, buildProjectBalances, personalProjectTargetsForWeek } from "@/services/projectBalanceBuilder";
import { reportNetMinutes } from "@/services/projectReportBuilder";
import type { PersonalProjectGoal, ProjectBalanceBooking, ProjectBalanceQuery, ProjectBalanceRow } from "@/types/project-balance";
import type { ProjectWeeklyTarget } from "@/types/project-target";
import { UNASSIGNED_PROJECT } from "@/types/project";

export async function getProjectBalances(
  supabase: SupabaseClient,
  tenantId: string,
  query: ProjectBalanceQuery,
  todayDate: string,
): Promise<ProjectBalanceRow[]> {
  const { projectId, employeeId, endDate } = query;
  if (projectId === UNASSIGNED_PROJECT) return [];
  const through = endDate < todayDate ? endDate : todayDate;
  const targets = await getProjectWeeklyTargets(supabase, tenantId, { projectId, employeeId, through });
  const bookings = await loadDailyBookings(supabase, tenantId, targets, through);
  return buildProjectBalances({ ...query, todayDate, targets, bookings });
}

export async function getPersonalProjectGoals(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  weekStart: string,
  todayDate: string,
): Promise<PersonalProjectGoal[]> {
  const weekEnd = getWeekSunday(weekStart);
  const through = weekEnd < todayDate ? weekEnd : todayDate;
  const history = await getProjectWeeklyTargets(supabase, tenantId, { employeeId, through: weekEnd });
  const targets = personalProjectTargetsForWeek({ targets: history, weekStart, employeeId });
  const bookings = await loadDailyBookings(supabase, tenantId, targets, through);
  return buildPersonalProjectGoals({ targets, bookings, weekStart, todayDate, employeeId });
}

async function loadDailyBookings(
  supabase: SupabaseClient,
  tenantId: string,
  targets: readonly ProjectWeeklyTarget[],
  through: string,
): Promise<Iterable<ProjectBalanceBooking>> {
  // Combine the page results by booking day so multiple segments per day can
  // share one entry in memory without changing per-booking minute rounding.
  const dailyBookings = new Map<string, ProjectBalanceBooking>();
  for await (const page of getProjectBalanceBookingPages(supabase, tenantId, targets, through)) {
    for (const entry of page) {
      const key = `${entry.project_id}/${entry.employee_id}/${entry.date}`;
      const netMinutes = reportNetMinutes(entry);
      const booking = dailyBookings.get(key);
      if (booking) booking.netMinutes += netMinutes;
      else {
        dailyBookings.set(key, {
          projectId: entry.project_id,
          employeeId: entry.employee_id,
          date: entry.date,
          netMinutes,
        });
      }
    }
  }

  return dailyBookings.values();
}
