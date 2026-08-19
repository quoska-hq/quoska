import { z } from "zod";
import type { Employee } from "./database";
import { workScheduleSchema } from "./work-schedule";

export type Role = Employee["role"];

export const ROLE_LABELS: Record<Role, string> = {
  employee: "Mitarbeiter",
  manager: "Manager",
  admin: "Admin",
};

export const ROLE_OPTIONS: readonly Role[] = ["employee", "manager", "admin"];

/** Free plan employee limit (for plan enforcement) */
export const FREE_PLAN_EMPLOYEE_LIMIT = 3;

export type EmployeeInsert = Pick<
  Employee,
  | "tenant_id"
  | "user_id"
  | "first_name"
  | "last_name"
  | "email"
  | "role"
  | "target_hours_week"
  | "work_schedule"
  | "employment_start_date"
  | "initial_overtime_minutes"
  | "bundesland"
  | "invitation_token"
>;

export const inviteEmployeeSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  role: z.enum(["admin", "manager", "employee"]).default("employee"),
  targetHoursWeek: z.number().gt(0).max(48).default(40),
  workSchedule: workScheduleSchema.optional(),
  employmentStartDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Ungültiges Eintrittsdatum",
  ).optional(),
  initialOvertimeMinutes: z.number().int().min(-600000).max(600000).default(0),
  bundesland: z
    .enum([
      "baden-wuerttemberg",
      "bayern",
      "berlin",
      "brandenburg",
      "bremen",
      "hamburg",
      "hessen",
      "mecklenburg-vorpommern",
      "niedersachsen",
      "nordrhein-westfalen",
      "rheinland-pfalz",
      "saarland",
      "sachsen",
      "sachsen-anhalt",
      "schleswig-holstein",
      "thueringen",
    ])
    .nullable()
    .default(null),
});

export const updateEmployeeSchema = z.object({
  first_name: z.string().min(1, "Vorname ist erforderlich").optional(),
  last_name: z.string().min(1, "Nachname ist erforderlich").optional(),
  role: z.enum(["admin", "manager", "employee"]).optional(),
  target_hours_week: z.number().gt(0).max(48).optional(),
  work_schedule: workScheduleSchema.optional(),
  employment_start_date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Ungültiges Eintrittsdatum",
  ).optional(),
  initial_overtime_minutes: z.number().int().min(-600000).max(600000).optional(),
  bundesland: z
    .enum([
      "baden-wuerttemberg",
      "bayern",
      "berlin",
      "brandenburg",
      "bremen",
      "hamburg",
      "hessen",
      "mecklenburg-vorpommern",
      "niedersachsen",
      "nordrhein-westfalen",
      "rheinland-pfalz",
      "saarland",
      "sachsen",
      "sachsen-anhalt",
      "schleswig-holstein",
      "thueringen",
    ])
    .nullable()
    .optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
