import { z } from "zod";
import type { TimeEntry } from "./database";

export type TimeEntryStatus = TimeEntry["status"];

export interface TimeEntryWithEmployee extends TimeEntry {
  employee_first_name: string;
  employee_last_name: string;
}

export interface TimeEntryWithProject extends TimeEntry {
  project_name: string | null;
  project_color: string | null;
}

const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ungültige Uhrzeit");

function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1]; // eslint-disable-line @quoska/legal/enforce-max-working-hours -- calendar months
}

export const manualTimeEntrySchema = z.object({
  employee_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum")
    .refine(isValidCalendarDate, "Ungültiges Datum"),
  start_time: localTimeSchema,
  end_time: localTimeSchema,
  ends_next_day: z.boolean().optional().default(false),
  break_minutes: z.number().int().min(0).max(720),
  apply_automatic_break: z.boolean().optional().default(true),
  notes: z.string().max(500).nullable().optional(),
  reason: z.string().trim().min(5, "Ein Grund ist erforderlich (mindestens 5 Zeichen)").max(200),
});

export type ManualTimeEntryInput = z.infer<typeof manualTimeEntrySchema>;
