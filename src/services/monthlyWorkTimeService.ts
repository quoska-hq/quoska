import { datesInMonth } from "@/services/freeToolDateService";
import { germanPublicHolidays } from "@/services/publicHolidayService";
import {
  scheduledMinutesForDate,
  workdayForDate,
} from "@/services/workScheduleService";
import type {
  MonthlyAbsence,
  MonthlyWorkTimeInput,
  MonthlyWorkTimeResult,
} from "@/types/free-tools";
import { evenlyDistributeWorkMinutes } from "@/types/work-schedule";

export function calculateMonthlyWorkTime(
  input: MonthlyWorkTimeInput,
): MonthlyWorkTimeResult | null {
  const schedule = evenlyDistributeWorkMinutes(input.weeklyMinutes, input.workdays);
  if (!schedule || input.month < 1 || input.month > 12) return null;

  const dates = datesInMonth(input.year, input.month);
  const monthPrefix = `${input.year}-${String(input.month).padStart(2, "0")}-`;
  const holidays = germanPublicHolidays(input.year, input.state).filter((holiday) =>
    holiday.date.startsWith(monthPrefix),
  );
  const holidayDates = new Set(holidays.map((holiday) => holiday.date));
  const workdaySet = new Set(input.workdays);
  const holidaysOnWorkdays = holidays.filter((holiday) =>
    workdaySet.has(workdayForDate(holiday.date)),
  );

  let scheduledDays = 0;
  let scheduledMinutes = 0;
  for (const date of dates) {
    const minutes = scheduledMinutesForDate(schedule, date);
    if (minutes > 0 && !holidayDates.has(date)) {
      scheduledDays += 1;
      scheduledMinutes += minutes;
    }
  }

  const recognizedAbsences: MonthlyAbsence[] = [];
  const ignoredAbsences: MonthlyAbsence[] = [];
  const seenDates = new Set<string>();
  let absenceMinutes = 0;
  for (const absence of input.absences) {
    const minutes = scheduledMinutesForDate(schedule, absence.date);
    const valid =
      absence.date.startsWith(monthPrefix) &&
      minutes > 0 &&
      !holidayDates.has(absence.date) &&
      !seenDates.has(absence.date);
    if (valid) {
      recognizedAbsences.push(absence);
      seenDates.add(absence.date);
      absenceMinutes += minutes;
    } else {
      ignoredAbsences.push(absence);
    }
  }

  const attendanceTargetMinutes = Math.max(0, scheduledMinutes - absenceMinutes);
  return {
    calendarDays: dates.length,
    scheduledDays,
    scheduledMinutes,
    holidays,
    holidaysOnWorkdays,
    recognizedAbsences,
    ignoredAbsences,
    absenceMinutes,
    attendanceTargetMinutes,
    balanceMinutes:
      input.actualMinutes === null
        ? null
        : input.actualMinutes + absenceMinutes - scheduledMinutes,
  };
}
