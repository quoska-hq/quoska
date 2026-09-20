import { z } from "zod";

export const datevMonthSchema = z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/);
const optionalNumber = (min: number, max: number) => z.number().int().min(min).max(max).nullable();
export const datevEmployeeSchema = z.object({
  employeeId: z.string().uuid(),
  mode: z.enum(["unconfigured", "include", "exclude"]),
  personnelNumber: optionalNumber(1, 99999),
  wageType: optionalNumber(1, 9999),
}).strict();
export const datevSettingsSchema = z.object({
  revision: z.number().int().min(0),
  advisorNumber: optionalNumber(1000, 9999999),
  clientNumber: optionalNumber(1, 99999),
  employees: z.array(datevEmployeeSchema).max(1000),
}).strict().superRefine((value, ctx) => {
  const ids = new Set<string>();
  const numbers = new Set<number>();
  for (const employee of value.employees) {
    if (ids.has(employee.employeeId)) ctx.addIssue({ code: "custom", message: "Person mehrfach angegeben." });
    ids.add(employee.employeeId);
    if (employee.mode !== "include") continue;
    if (employee.personnelNumber === null || employee.wageType === null)
      ctx.addIssue({ code: "custom", message: "Für eingeschlossene Personen sind Personalnummer und Lohnart erforderlich." });
    if (employee.personnelNumber !== null && numbers.has(employee.personnelNumber))
      ctx.addIssue({ code: "custom", message: "Jede Personalnummer darf nur einmal vergeben werden." });
    if (employee.personnelNumber !== null) numbers.add(employee.personnelNumber);
  }
});
export const datevDownloadSchema = z.object({
  month: datevMonthSchema,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  confirmed: z.literal(true),
  repeatConfirmed: z.boolean(),
}).strict();
export type DatevSettings = z.infer<typeof datevSettingsSchema>;
export type DatevEmployeeSetting = z.infer<typeof datevEmployeeSchema>;
export interface DatevEmployee { id: string; first_name: string; last_name: string; deleted_at: string | null }
export interface DatevEntry {
  id: string; employee_id: string; date: string; clock_in: string; clock_out: string | null;
  status: string; break_minutes: number; entry_source: string;
}
export interface DatevHistory { id: string; created_at: string; fingerprint: string }
export interface DatevSnapshot {
  settings: DatevSettings | null;
  employees: DatevEmployee[];
  entries: DatevEntry[];
  pending: string[];
  history: DatevHistory[];
}
export interface DatevRow {
  employeeId: string; name: string; personnelNumber: number; wageType: number;
  hours: string; seconds: number; entries: number;
}
export interface DatevPreview {
  month: string; fingerprint: string; rows: DatevRow[]; errors: string[]; warnings: string[];
  history: DatevHistory[];
}
