import { z } from "zod";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;
export const importFields = {
  employee: "Mitarbeiter (E-Mail oder Name)",
  date: "Startdatum",
  start: "Beginn",
  endDate: "Enddatum (optional)",
  end: "Ende",
  duration: "Arbeitsdauer (optional)",
  break: "Pause in Minuten (optional)",
  notes: "Beschreibung (optional)",
  project: "Projekt als Notiz (optional)",
} as const;
export type ImportField = keyof typeof importFields;
export type ImportColumns = Partial<Record<ImportField, number>>;
const column = z.number().int().min(0).max(99).optional();
export const timeImportSchema = z.object({
  csv: z.string().min(1).max(MAX_IMPORT_BYTES),
  delimiter: z.enum([",", ";", "\t"]),
  dateFormat: z.enum(["YYYY-MM-DD", "DD.MM.YYYY", "DD/MM/YYYY", "MM/DD/YYYY"]),
  timezone: z.enum(["Europe/Berlin", "UTC"]),
  durationFormat: z.enum(["clock", "hours", "minutes"]),
  columns: z.object({
    employee: column, date: column, start: column, endDate: column, end: column,
    duration: column, break: column, notes: column, project: column,
  }),
  employees: z.array(z.object({ source: z.string().max(500), employeeId: z.string().uuid() })).max(MAX_IMPORT_ROWS),
  mode: z.enum(["preview", "import"]),
});
export type TimeImportInput = z.infer<typeof timeImportSchema>;

export interface ImportEntry {
  row: number;
  employee_id: string;
  date: string;
  clock_in: string;
  clock_out: string;
  break_minutes: number;
  notes: string | null;
}
export interface ImportPreviewRow extends Partial<ImportEntry> {
  row: number;
  employee_name?: string;
  status: "ready" | "duplicate" | "error";
  message?: string;
}
export interface TimeImportResult {
  rows: ImportPreviewRow[];
  readyCount: number;
  duplicateCount: number;
  errorCount: number;
  importedCount: number;
}
