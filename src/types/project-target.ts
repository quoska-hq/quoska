import { z } from "zod";

export const MAX_PROJECT_WEEKLY_MINUTES = 10_080;

export const projectTargetSchema = z.object({
  employeeId: z.string().uuid("Ungültige Person"),
  effectiveFrom: z.string().date("Ungültiges Datum").refine(
    (date) => !date.startsWith("0000"),
    "Ungültiges Datum",
  ),
  weeklyMinutes: z.number().int("Bitte ganze Minuten angeben")
    .min(0).max(MAX_PROJECT_WEEKLY_MINUTES),
}).strict();

export type ProjectTarget = z.infer<typeof projectTargetSchema>;

export interface ProjectWeeklyTarget extends ProjectTarget {
  projectId: string;
  projectName: string;
  employeeName: string;
}
