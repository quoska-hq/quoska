import type {
  PlanningJobResult,
  PlanningLocation,
  PlanningSkill,
  PlanningShift,
  PlanningSnapshot,
} from "@/types/planning";
export interface PlanningJobView {
  id: string;
  month: string;
  input_version: number;
  status: string;
  result: PlanningJobResult | null;
}
export type PlanningBoardData = PlanningSnapshot & { jobs: PlanningJobView[] };
export interface PlanningPersonalData {
  enabled: boolean;
  preferredDays: number[];
  locations: PlanningLocation[];
  skills: PlanningSkill[];
  periods: {
    month: string;
    status: "announced" | "fixed";
    revision: number;
    shifts: PlanningShift[];
  }[];
}
export interface PlanningSwapOption {
  id: string;
  employeeId: string;
  name: string;
  date: string;
  start: string;
  end: string;
  locationId: string;
}
export interface PlanningSwapView {
  id: string;
  source_shift_id: string;
  target_shift_id: string;
  requester_id: string;
  recipient_id: string;
  status: "requested" | "accepted" | "approved" | "rejected" | "cancelled";
}
export interface PlanningSwapData {
  swaps: PlanningSwapView[];
  options: PlanningSwapOption[];
  employeeId: string;
}
