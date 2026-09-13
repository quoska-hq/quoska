import { addDays, getWeekMonday } from "@/services/holidayService";

export function getCockpitDateRange(
  todayDate: string,
  days: 7 | 30,
): { startDate: string; endDate: string } {
  return {
    startDate: days === 7
      ? getWeekMonday(todayDate)
      : addDays(todayDate, -(days - 1)),
    endDate: todayDate,
  };
}

export function getCockpitDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

/** Include full calendar weeks so a shifted workday is never missed at a filter boundary. */
export function getCockpitMissingEntryStart(startDate: string, endDate: string): string {
  const previousMonday = addDays(getWeekMonday(endDate), -7);
  return getWeekMonday(startDate < previousMonday ? startDate : previousMonday);
}
