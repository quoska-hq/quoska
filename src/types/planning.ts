import type { WorkSchedule } from "@/types/work-schedule";
import type {
  EmploymentSchedule,
  EmploymentScheduleChange,
} from "@/types/employment-schedule";
import type { Bundesland } from "@/types/tenant";

export type PlanningStatus = "draft" | "announced" | "fixed" | "closed";
export type PlanningAuthorization =
  "none" | "bakery_production" | "catering" | "documented_permission";
export interface PlanningBreak {
  start: string;
  end: string;
}
export interface PlanningWindow {
  day: number;
  start: string;
  end: string;
}
export interface PlanningLocation {
  id: string;
  name: string;
  bundesland: Bundesland;
  additionalHolidays: string[];
  localHolidaysConfirmed: boolean;
}
export interface PlanningSkill {
  id: string;
  name: string;
}
export interface PlanningProfile {
  employeeId: string;
  locationIds: string[];
  skillIds: string[];
  eligibility: "unconfirmed" | "adult_standard" | "unsupported";
  availability: PlanningWindow[];
  validFrom: string | null;
  validUntil: string | null;
  availabilityExceptions: {
    date: string;
    windows: { start: string; end: string }[];
  }[];
  contractChanges: EmploymentScheduleChange[];
  preferredDays: number[];
  externalWork: { start: string; end: string; breaks: PlanningBreak[] }[];
  externalWorkConfirmed: boolean;
  historyConfirmed: boolean;
  nightWorkConfirmed: boolean;
  maxWeeklyMinutes: number;
}
export interface PlanningTemplate {
  active: boolean;
  id: string;
  name: string;
  locationId: string;
  skillId: string;
  days: number[];
  start: string;
  end: string;
  nextDay: boolean;
  count: number;
  breaks: { offsetMinutes: number; minutes: number }[];
  authorization: PlanningAuthorization;
  authorizationReference: string;
  authorizationFrom: string | null;
  authorizationUntil: string | null;
  holidayMode: "skip" | "include";
}
export interface PlanningDemand {
  id: string;
  locationId: string;
  skillId: string;
  days: number[];
  start: string;
  end: string;
  count: number;
  holidayMode: "skip" | "include";
}
export interface PlanningConfig {
  firstMonth: string | null;
  enabled: boolean;
  locations: PlanningLocation[];
  skills: PlanningSkill[];
  profiles: PlanningProfile[];
  templates: PlanningTemplate[];
  demands: PlanningDemand[];
  travelMinutes: number;
}
export interface PlanningShift {
  id: string;
  templateId: string;
  locationId: string;
  skillId: string;
  date: string;
  start: string;
  end: string;
  breaks: PlanningBreak[];
  employeeId: string | null;
  locked: boolean;
  substituteDate: string | null;
}
export interface PlanningPeriod {
  month: string;
  status: PlanningStatus;
  shifts: PlanningShift[];
  publishedShifts: PlanningShift[];
  revision: number;
}
export interface PlanningState {
  config: PlanningConfig;
  periods: PlanningPeriod[];
}
export interface PlanningEmployee {
  id: string;
  name: string;
  targetHoursWeek: number;
  workSchedule: WorkSchedule;
  employmentSchedule?: EmploymentSchedule | null;
  employmentStart: string;
  openingBalanceMinutes: number;
  balanceMinutes: number;
  balanceComplete: boolean;
  bundesland: string;
}
export interface PlanningAbsence {
  employeeId: string;
  start: string;
  end: string | null;
}
export interface PlanningActual {
  employeeId: string;
  date: string;
  start: string;
  end: string | null;
  netMinutes: number;
}
export interface PlanningContext {
  employees: PlanningEmployee[];
  absences: PlanningAbsence[];
  actual: PlanningActual[];
  today: string;
  now: string;
  holidays: { locationId: string; dates: string[]; complete: boolean }[];
  employeeHolidays: { employeeId: string; dates: string[] }[];
}
export interface PlanningIssue {
  code: string;
  message: string;
  employeeId?: string;
  shiftId?: string;
  date?: string;
  severity: "error" | "warning";
}
export interface PlanningSnapshot {
  version: number;
  state: PlanningState;
  context: PlanningContext;
  issues: PlanningIssue[];
  workerConfigured: boolean;
}
export interface PlanningSwap {
  id: string;
  sourceShiftId: string;
  targetShiftId: string;
  requesterId: string;
  recipientId: string;
  status: "requested" | "accepted" | "approved" | "rejected" | "cancelled";
  version: number;
}
export interface PlanningJobPayload {
  shifts: {
    id: string;
    start: number;
    end: number;
    minutes: number;
    date: string;
    locationId: string;
    candidates: string[];
    fixedEmployeeId: string | null;
    originalEmployeeId: string | null;
    weekend: boolean;
    night: boolean;
  }[];
  employees: {
    id: string;
    weeklyMinutes: number;
    targetMinutes: number;
    initialMinutes: number;
    preferredDays: number[];
  }[];
  conflicts: [string, string][];
  version: number;
  timeLimitSeconds: number;
  reservedDaily: { employeeId: string; date: string; minutes: number }[];
  reservedWeekly: { employeeId: string; week: string; minutes: number }[];
}
export interface PlanningJobResult {
  status: "optimal" | "feasible" | "infeasible" | "timeout" | "failed";
  assignments: { shiftId: string; employeeId: string }[];
  wallSeconds: number;
  message: string;
}
