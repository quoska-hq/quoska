import { z } from "zod";
import { workScheduleSchema } from "@/types/work-schedule";

export const setupProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  employmentStartDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Eintrittsdatum ist erforderlich",
  ),
  initialOvertimeHours: z.number().min(-10000).max(10000).default(0),
});

export type SetupProfileInput = z.infer<typeof setupProfileSchema>;

export const setupCompanySchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  bundesland: z.string().min(1, "Bundesland ist erforderlich"),
});

export type SetupCompanyInput = z.infer<typeof setupCompanySchema>;

export const setupScheduleSchema = z.object({
  workSchedule: workScheduleSchema,
});

export type SetupScheduleInput = z.infer<typeof setupScheduleSchema>;

export const inviteEmployeeSchema = z.object({
  employees: z
    .array(
      z.object({
        firstName: z.string().min(1, "Vorname erforderlich"),
        lastName: z.string().min(1, "Nachname erforderlich"),
        email: z.string().email("Ungültige E-Mail"),
        employmentStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        initialOvertimeHours: z.number().min(-10000).max(10000).default(0),
      }),
    )
    .min(0)
    .max(2, "Maximal 2 weitere Mitarbeiter im kostenlosen Tarif"),
});

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
