import { z } from "zod";

export type CockpitActivityCategory = "clock" | "break" | "correction";

export interface CockpitEmployeeOption {
  id: string;
  name: string;
}

export interface CockpitSummary {
  workedMinutes: number;
  targetMinutes: number;
  activeNow: number;
  peopleCount: number;
  completionPercent: number;
}

export interface CockpitDailyPoint {
  date: string;
  workedMinutes: number;
  targetMinutes: number;
}

export interface CockpitEmployeeRow {
  id: string;
  name: string;
  workedMinutes: number;
  targetMinutes: number;
  deltaMinutes: number;
  status: "running" | "paused" | "off";
  projectName: string | null;
  currentProjectName: string | null;
  entryCount: number;
  leaveDays: number;
  sickDays: number;
}

export interface CockpitProjectRow {
  id: string | null;
  name: string;
  color: string | null;
  minutes: number;
  sharePercent: number;
}

export interface CockpitActivityRow {
  id: string;
  occurredAt: string;
  category: CockpitActivityCategory;
  title: string;
  detail: string | null;
  reason: string | null;
  employeeId: string;
  employeeName: string;
  actorName: string;
  projectName: string | null;
  entryDate: string;
}

export type CockpitActionKind =
  | "missing_clock_out"
  | "long_shift"
  | "break_violation"
  | "missing_entry"
  | "pending_correction";

export interface CockpitActionItem {
  id: string;
  kind: CockpitActionKind;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  detail?: string | null;
  employeeId: string;
  employeeName: string;
  date: string;
  href: string | null;
}

export interface CockpitData {
  period: {
    startDate: string;
    endDate: string;
    days: 7 | 30;
  };
  selectedEmployeeId: string | null;
  employees: CockpitEmployeeOption[];
  summary: CockpitSummary;
  daily: CockpitDailyPoint[];
  employeeRows: CockpitEmployeeRow[];
  projects: CockpitProjectRow[];
  activity: CockpitActivityRow[];
  actions: CockpitActionItem[];
}

export const cockpitQuerySchema = z.object({
  days: z.coerce.number().refine((value) => value === 7 || value === 30, {
    message: "Zeitraum muss 7 oder 30 Tage betragen.",
  }),
  employeeId: z.string().uuid().optional(),
});

export type CockpitQuery = z.infer<typeof cockpitQuerySchema>;
