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
