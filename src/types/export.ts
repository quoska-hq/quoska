/**
 * Export types — CSV/PDF export and DSGVO data portability.
 */

import { z } from "zod";
import type { TimeEntry } from "@/types/database";
import { projectFilterSchema } from "@/types/project";

/** Input for manager CSV/PDF export. */
export const exportQuerySchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  employeeId: z.string().uuid().optional(),
  projectId: projectFilterSchema.optional(),
}).refine(({ startDate, endDate }) => startDate <= endDate, {
  message: "Das Enddatum muss am oder nach dem Startdatum liegen.",
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;

export type ReportEntryFilters = Pick<ExportQueryInput, "employeeId" | "projectId">;

export interface ReportEntry extends TimeEntry {
  employee_first_name: string;
  employee_last_name: string;
  project_name?: string | null;
  project_customer_name?: string | null;
}

/** A single row in the CSV export (time entry with employee name). */
export interface ExportRow {
  employeeFirstName: string;
  employeeLastName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  netMinutes: number;
  notes: string | null;
  projectName?: string;
}

/** Full employee data for DSGVO Art 20 portability export. */
export interface EmployeeFullExport {
  employee: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    targetHoursWeek: number;
    bundesland: string | null;
    createdAt: string;
  };
  timeEntries: ExportRow[];
  auditRecords: AuditExportRow[];
}

/** Audit record for DSGVO export. */
export interface AuditExportRow {
  timeEntryId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  changedAt: string;
}

/** Account deletion request input. */
export const accountDeletionSchema = z.object({
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export type AccountDeletionInput = z.infer<typeof accountDeletionSchema>;
