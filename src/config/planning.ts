import type { PlanningConfig } from "@/types/planning";

export const EMPTY_PLANNING_CONFIG: PlanningConfig = {
  firstMonth: null,
  enabled: false,
  locations: [],
  skills: [],
  profiles: [],
  templates: [],
  demands: [],
  travelMinutes: 30,
};
export const PLANNING_STATUS_LABELS = {
  draft: "Entwurf",
  announced: "Angekündigt",
  fixed: "Verbindlich",
  closed: "Abgeschlossen",
};
export const PLANNING_RULE_PROFILE = "DE-adult-standard-8h-v1";
export const PLANNING_TIME_ZONE = "Europe/Berlin";

// eslint-disable-next-line @quoska/legal/enforce-max-working-hours -- Replacement-rest windows are calendar days, not daily working hours.
export const PLANNING_SUNDAY_REST_WINDOW_DAYS = 14;
export const PLANNING_HOLIDAY_REST_WINDOW_DAYS = 56;
