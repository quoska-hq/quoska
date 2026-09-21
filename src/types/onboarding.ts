import { z } from "zod";

export const TEAM_SIZES = ["1-3", "4-10", "11-50", "51+"] as const;
export type PlannedTeamSize = typeof TEAM_SIZES[number];
export const TEAM_SIZE_LABELS: Record<PlannedTeamSize, string> = {
  "1-3": "1–3 Personen", "4-10": "4–10 Personen", "11-50": "11–50 Personen", "51+": "Mehr als 50 Personen",
};
export const onboardingUpdateSchema = z.object({
  plannedTeamSize: z.enum(TEAM_SIZES).nullable().optional(),
  dismissed: z.boolean().optional(),
}).strict().refine(value => Object.keys(value).length > 0, "Keine Änderung angegeben.");

export interface StartGuideStatus {
  plannedTeamSize: PlannedTeamSize | null;
  dismissed: boolean;
  invited: boolean;
  recorded: boolean;
  imported: boolean;
  exported: boolean;
}
