import { z } from "zod";
import {
  normalizeWorkSchedule,
  workScheduleSchema,
  type WorkSchedule,
} from "@/types/work-schedule";
export interface EmploymentScheduleChange {
  from: string;
  schedule: WorkSchedule;
}
export interface EmploymentSchedule {
  baseline: WorkSchedule;
  changes: EmploymentScheduleChange[];
}
export const employmentScheduleChangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    schedule: workScheduleSchema,
  })
  .strict();
const parsedSchedules = new WeakMap<object, EmploymentSchedule>();
/** Resolve a dated model without changing the legacy fallback. */
export function normalizeEmploymentScheduleForDate(
  value: unknown,
  date: string,
  fallbackWeeklyHours = 40,
): WorkSchedule {
  if (!value || typeof value !== "object" || !("baseline" in value))
    return normalizeWorkSchedule(value, fallbackWeeklyHours);
  let parsed = parsedSchedules.get(value);
  if (!parsed) {
    parsed = employmentScheduleSchema.parse(value);
    parsedSchedules.set(value, parsed);
  }
  return (
    parsed.changes.filter((c) => c.from <= date).at(-1)?.schedule ??
    parsed.baseline
  );
}
export const employmentScheduleSchema = z
  .object({
    baseline: workScheduleSchema,
    changes: z
      .array(employmentScheduleChangeSchema)
      .max(50)
      .refine((changes) =>
        changes.every((c, i) => i === 0 || changes[i - 1].from < c.from),
      ),
  })
  .strict();
