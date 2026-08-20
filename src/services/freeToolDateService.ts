import { addDays } from "@/services/holidayService";
import { workdayForDate } from "@/services/workScheduleService";
import type { TimesheetRow } from "@/types/free-tools";

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 0;
}

export function monthDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function datesInMonth(year: number, month: number): string[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, index) =>
    monthDate(year, month, index + 1),
  );
}

export function createTimesheetRows(month: string): TimesheetRow[] {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return [];
  return datesInMonth(Number(match[1]), Number(match[2])).map((date) => ({
    date,
    start: "",
    end: "",
    breakMinutes: 0,
    crossesMidnight: false,
  }));
}

export function germanDateLabel(date: string): string {
  const labels = {
    monday: "Mo",
    tuesday: "Di",
    wednesday: "Mi",
    thursday: "Do",
    friday: "Fr",
    saturday: "Sa",
    sunday: "So",
  } as const;
  const [, month, day] = date.split("-");
  return `${labels[workdayForDate(date)]}, ${day}.${month}.`;
}

export function offsetDate(date: string, days: number): string {
  return addDays(date, days);
}
