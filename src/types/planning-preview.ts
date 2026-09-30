export type PlanningSkill = "Backstube" | "Verkauf" | "Schlüssel";
export type PlanningStatus = "fixed" | "announced" | "draft";
export type PlanningTab = "plan" | "team" | "mine";

export interface PlanningEmployee {
  id: string;
  name: string;
  initials: string;
  weeklyHours: number;
  balanceHours: number;
  skills: PlanningSkill[];
  locations: string[];
  color: string;
}

export interface PlanningLocation {
  id: string;
  name: string;
  address: string;
}

export interface PlanningTemplate {
  id: string;
  name: string;
  start: number;
  end: number;
  breakMinutes: number;
  skills: PlanningSkill[];
  tone: "violet" | "blue" | "amber";
}

export interface PlanningShift {
  id: string;
  date: string;
  locationId: string;
  templateId: string;
  employeeId: string | null;
  locked: boolean;
}

export interface PlanningMonth {
  id: string;
  name: string;
  status: PlanningStatus;
}

export interface PlanningAbsence {
  employeeId: string;
  from: string;
  to: string;
  label: string;
}

export interface PlanningState {
  months: PlanningMonth[];
  shifts: PlanningShift[];
}

export interface PlanningChange {
  shiftId: string;
  employeeId: string;
}

export interface PlanningProposal {
  changes: PlanningChange[];
  remaining: number;
}
