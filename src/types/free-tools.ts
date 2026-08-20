import type { Bundesland } from "@/types/tenant";
import type { WorkdayKey } from "@/types/work-schedule";

export type FreeToolId =
  | "arbeitszeitrechner"
  | "stundenzettel"
  | "ueberstundenrechner"
  | "monatsarbeitszeit-rechner";

export type FreeToolEventName =
  | "free_tool_view"
  | "free_tool_calculate"
  | "free_tool_export"
  | "free_tool_product_click"
  | "free_tool_signup_start";

export interface FreeToolEventInput {
  event: FreeToolEventName;
  tool: FreeToolId;
  format?: "csv" | "pdf" | "print";
  placement?: "result" | "product_bridge" | "footer";
}

export interface FreeToolAnalyticsEvent {
  occurredAt: string;
  eventKey: string;
  visitorHash: string;
  event: FreeToolEventName;
  tool: FreeToolId;
  format: FreeToolEventInput["format"] | null;
  placement: FreeToolEventInput["placement"] | null;
}

export interface WorkTimeResult {
  grossMinutes: number;
  breakMinutes: number;
  netMinutes: number;
  decimalHours: number;
  balanceMinutes: number | null;
}

export type WorkTimeError =
  | "invalid-time"
  | "overnight-required"
  | "invalid-break"
  | "break-exceeds-presence"
  | "invalid-target";

export interface TimesheetRow {
  date: string;
  start: string;
  end: string;
  breakMinutes: number;
  crossesMidnight: boolean;
}

export interface TimesheetRowResult {
  status: "empty" | "incomplete" | "valid" | "invalid";
  netMinutes: number;
  error: WorkTimeError | null;
}

export interface GermanPublicHoliday {
  date: string;
  name: string;
  scope: "nationwide" | "state";
}

export type AbsenceType = "vacation" | "sickness" | "other";

export interface MonthlyAbsence {
  id: string;
  date: string;
  type: AbsenceType;
}

export interface MonthlyWorkTimeInput {
  year: number;
  month: number;
  state: Bundesland;
  weeklyMinutes: number;
  workdays: readonly WorkdayKey[];
  absences: readonly MonthlyAbsence[];
  actualMinutes: number | null;
}

export interface MonthlyWorkTimeResult {
  calendarDays: number;
  scheduledDays: number;
  scheduledMinutes: number;
  holidays: GermanPublicHoliday[];
  holidaysOnWorkdays: GermanPublicHoliday[];
  recognizedAbsences: MonthlyAbsence[];
  ignoredAbsences: MonthlyAbsence[];
  absenceMinutes: number;
  attendanceTargetMinutes: number;
  balanceMinutes: number | null;
}
