import { z } from "zod";

export const registerInputSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const setPasswordInputSchema = z
  .object({
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
    passwordConfirmation: z.string().min(1, "Bitte wiederhole das Passwort"),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Die Passwörter stimmen nicht überein",
    path: ["passwordConfirmation"],
  });

export type SetPasswordInput = z.infer<typeof setPasswordInputSchema>;

export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string;
  employee_id: string;
  role: "admin" | "manager" | "employee";
}
