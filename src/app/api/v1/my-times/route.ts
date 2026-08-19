/**
 * GET /api/v1/my-times?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Employee self-service: time entries with overtime calculation
 * for a given date range. Holiday-aware target hours.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso, getTodayDate } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getTimeEntriesByDateRange, getActiveEntry } from "@/repos/timeEntryRepo";
import { getHolidayDatesInRange } from "@/repos/holidayRepo";
import {
  addDays,
  getWeekMonday,
  getWeekSunday,
} from "@/services/holidayService";
import {
  employmentStartDate,
  calculateRunningOvertimeBalance,
  netMinutesForEntry,
  netMinutesForRunningEntry,
  formatOvertime,
} from "@/services/overtimeService";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";
import { weekQuerySchema } from "@/types/holiday";
import {
  calculateScheduleTargetMinutesForRange,
  scheduledMinutesForDate,
} from "@/services/workScheduleService";

export interface TimeEntryWithNet extends TimeEntry {
  netMinutes: number;
}

export interface WeekOvertimeSummary {
  weekStart: string;
  weekEnd: string;
  workedMinutes: number;
  targetMinutes: number;
  overtimeMinutes: number;
  overtimeDisplay: string;
}

export interface MyTimesResponse {
  entries: TimeEntryWithNet[];
  weeklySummaries: WeekOvertimeSummary[];
  cumulativeOvertimeMinutes: number;
  dailyTargets: Record<string, number>;
  initialOvertimeMinutes: number;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<MyTimesResponse>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json<ApiResponse<MyTimesResponse>>(
        { data: null, error: "startDate und endDate sind erforderlich." },
        { status: 400 },
      );
    }

    const parsed = weekQuerySchema.safeParse({
      weekStart: startDate,
      weekEnd: endDate,
    });
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<MyTimesResponse>>(
        { data: null, error: "Ungültiges Datumsformat." },
        { status: 400 },
      );
    }

    const nowIso = getNowIso();
    const todayDate = getTodayDate();

    // Get employee config
    const { data: employee } = await supabase
      .from("employees")
      .select("bundesland, target_hours_week, work_schedule, employment_start_date, initial_overtime_minutes, created_at")
      .eq("id", employeeId)
      .is("deleted_at", null)
      .single();

    const bundesland = employee?.bundesland ?? "berlin";
    const targetHoursWeek = employee?.target_hours_week ?? 40;
    const employeeStart = employee
      ? employmentStartDate(employee)
      : startDate;
    const hasBalancePeriod = employeeStart <= todayDate;

    // Fetch data in parallel
    const [entries, activeEntry, holidayMap, balanceEntries, balanceHolidayMap] = await Promise.all([
      getTimeEntriesByDateRange(supabase, tenantId, employeeId, startDate, endDate),
      getActiveEntry(supabase, tenantId, employeeId),
      getHolidayDatesInRange(supabase, bundesland, startDate, endDate),
      hasBalancePeriod
        ? getTimeEntriesByDateRange(supabase, tenantId, employeeId, employeeStart, todayDate)
        : Promise.resolve([]),
      hasBalancePeriod
        ? getHolidayDatesInRange(supabase, bundesland, employeeStart, todayDate)
        : Promise.resolve(new Map<string, string>()),
    ]);

    // Add net minutes to each entry
    const entriesWithNet: TimeEntryWithNet[] = entries.map((entry) => ({
      ...entry,
      netMinutes: entry.clock_out
        ? netMinutesForEntry(entry)
        : netMinutesForRunningEntry(entry, nowIso),
    }));

    // Group entries by week and calculate overtime per week
    const weekGroups = groupEntriesByWeek(entries, activeEntry, startDate, endDate);
    const weeklySummaries: WeekOvertimeSummary[] = [];

    for (const [weekMonday, weekEntries] of weekGroups) {
      const weekSunday = getWeekSunday(weekMonday);
      const targetStart = [weekMonday, startDate, employeeStart].sort().at(-1)!;
      const targetEnd = [weekSunday, endDate, todayDate].sort()[0]!;
      const targetMin = calculateScheduleTargetMinutesForRange(
        targetStart,
        targetEnd,
        holidayMap,
        employee?.work_schedule,
        targetHoursWeek,
      );

      let workedMinutes = weekEntries
        .filter((e) => e.status === "completed" && e.clock_out)
        .reduce((sum, e) => sum + netMinutesForEntry(e), 0);

      if (
        activeEntry &&
        getWeekMonday(activeEntry.date) === weekMonday
      ) {
        workedMinutes += netMinutesForRunningEntry(activeEntry, nowIso);
      }

      const overtime = workedMinutes - targetMin;

      weeklySummaries.push({
        weekStart: weekMonday,
        weekEnd: weekSunday,
        workedMinutes,
        targetMinutes: targetMin,
        overtimeMinutes: overtime,
        overtimeDisplay: formatOvertime(overtime),
      });
    }

    const balanceTargetMinutes = hasBalancePeriod
      ? calculateScheduleTargetMinutesForRange(
          employeeStart,
          todayDate,
          balanceHolidayMap,
          employee?.work_schedule,
          targetHoursWeek,
        )
      : 0;
    const cumulativeOvertimeMinutes = calculateRunningOvertimeBalance(
      balanceEntries,
      balanceTargetMinutes,
      employee?.initial_overtime_minutes ?? 0,
      nowIso,
    );

    const dailyTargets: Record<string, number> = {};
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      dailyTargets[date] = date < employeeStart || date > todayDate || holidayMap.has(date)
        ? 0
        : scheduledMinutesForDate(employee?.work_schedule, date, targetHoursWeek);
    }

    const response: MyTimesResponse = {
      entries: entriesWithNet,
      weeklySummaries,
      cumulativeOvertimeMinutes,
      dailyTargets,
      initialOvertimeMinutes: employee?.initial_overtime_minutes ?? 0,
    };

    return NextResponse.json<ApiResponse<MyTimesResponse>>(
      { data: response, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("My times error:", error);
    return NextResponse.json<ApiResponse<MyTimesResponse>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

/** Group entries by ISO week (Monday key). */
function groupEntriesByWeek(
  entries: TimeEntry[],
  activeEntry: TimeEntry | null,
  startDate: string,
  endDate: string,
): Map<string, TimeEntry[]> {
  const weekMap = new Map<string, TimeEntry[]>();

  for (
    let week = getWeekMonday(startDate);
    week <= endDate;
    week = addDays(week, 7)
  ) {
    weekMap.set(week, []);
  }

  for (const entry of entries) {
    const key = getWeekMonday(entry.date);
    if (!weekMap.has(key)) weekMap.set(key, []);
    weekMap.get(key)!.push(entry);
  }

  if (activeEntry && activeEntry.date >= startDate && activeEntry.date <= endDate) {
    const key = getWeekMonday(activeEntry.date);
    if (!weekMap.has(key)) weekMap.set(key, []);
  }

  return weekMap;
}
