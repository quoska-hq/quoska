import { z } from "zod";
import { projectFilterSchema, projectReportQuerySchema } from "@/types/project";

export const projectBalanceQuerySchema = projectReportQuerySchema.and(z.object({
  projectId: projectFilterSchema.optional(),
  employeeId: z.string().uuid().optional(),
})).refine(({ startDate }) => !startDate.startsWith("0000"));

export type ProjectBalanceQuery = z.infer<typeof projectBalanceQuerySchema>;

export const personalProjectWeekQuerySchema = z.object({
  weekStart: z.string().date().refine(
    (date) => date >= "0001-01-01" && date < "9999-12-27" && (Date.parse(date) / 86_400_000 + 3) % 7 === 0,
    "Bitte einen Montag als Wochenbeginn angeben.",
  ),
}).strict();

export interface PersonalProjectGoal {
  projectId: string;
  projectName: string;
  plannedMinutes: number;
  actualMinutes: number;
  balanceMinutes: number;
}

export interface ProjectBalanceRow {
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  targetMinutes: number;
  actualMinutes: number;
  balanceMinutes: number;
}

export interface ProjectBalanceBooking {
  projectId: string;
  employeeId: string;
  date: string;
  netMinutes: number;
}
