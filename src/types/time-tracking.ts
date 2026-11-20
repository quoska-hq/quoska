import { z } from "zod";

export interface TimeTrackingSettings {
  automaticBreaksEnabled: boolean;
  missingTimeApprovalRequired: boolean;
}

export const updateTimeTrackingSettingsSchema = z.object({
  automaticBreaksEnabled: z.boolean().optional(),
  missingTimeApprovalRequired: z.boolean().optional(),
}).strict().refine((settings) => Object.keys(settings).length > 0);
