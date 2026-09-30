import { z } from "zod";
import { BUNDESLAENDER_ENUM } from "@/types/leave";
import { employmentScheduleChangeSchema } from "@/types/employment-schedule";

export const planningDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [y, m, d] = value.split("-").map(Number);
    const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return (
      // eslint-disable-next-line @quoska/legal/enforce-max-working-hours -- Calendar month validation, not working hours.
      y >= 2020 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1]
    );
  }, "Ungültiges Datum");
const id = z.string().uuid();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const days = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine((values) => new Set(values).size === values.length);
const instant = z
  .string()
  .datetime({ offset: true })
  .refine(
    (v) => Date.parse(v) % 60000 === 0,
    "Schichtzeiten müssen minutengenau sein.",
  );
const breakSchema = z.object({ start: instant, end: instant }).strict();
const uniqueIds = z
  .array(id)
  .max(500)
  .refine((values) => new Set(values).size === values.length);
export const planningProfileSchema = z
  .object({
    employeeId: id,
    locationIds: uniqueIds,
    skillIds: uniqueIds,
    eligibility: z.enum(["unconfirmed", "adult_standard", "unsupported"]),
    validFrom: planningDateSchema.nullable().default(null),
    validUntil: planningDateSchema.nullable().default(null),
    availabilityExceptions: z
      .array(
        z
          .object({
            date: planningDateSchema,
            windows: z
              .array(
                z
                  .object({
                    start: time,
                    end: z.union([time, z.literal("24:00")]),
                  })
                  .strict()
                  .refine((w) => w.start < w.end),
              )
              .max(5),
          })
          .strict(),
      )
      .max(366)
      .refine(
        (values) => new Set(values.map((v) => v.date)).size === values.length,
      )
      .default([]),
    contractChanges: z
      .array(
        employmentScheduleChangeSchema.extend({ from: planningDateSchema }),
      )
      .max(50)
      .refine((changes) =>
        changes.every((c, i) => i === 0 || changes[i - 1].from < c.from),
      )
      .default([]),
    availability: z
      .array(
        z
          .object({
            day: z.number().int().min(0).max(6),
            start: time,
            end: z.union([time, z.literal("24:00")]),
          })
          .strict()
          .refine(
            (w) => w.start < w.end,
            "Verfügbarkeit muss innerhalb eines Tages liegen",
          ),
      )
      .max(35),
    preferredDays: z.array(z.number().int().min(0).max(6)).max(7),
    externalWork: z
      .array(
        z
          .object({
            start: instant,
            end: instant,
            breaks: z.array(breakSchema).max(8),
          })
          .strict()
          .refine((w) => Date.parse(w.start) < Date.parse(w.end)),
      )
      .max(500),
    externalWorkConfirmed: z.boolean(),
    historyConfirmed: z.boolean(),
    nightWorkConfirmed: z.boolean(),
    // eslint-disable-next-line @quoska/legal/enforce-max-working-hours -- Weekly bounds are expressed in minutes.
    maxWeeklyMinutes: z.number().int().min(60).max(2880),
  })
  .strict();
export const planningTemplateSchema = z
  .object({
    active: z.boolean(),
    id,
    name: z.string().trim().min(1).max(100),
    locationId: id,
    skillId: id,
    days,
    start: time,
    end: time,
    nextDay: z.boolean(),
    count: z.number().int().min(1).max(100),
    breaks: z
      .array(
        z
          .object({
            offsetMinutes: z.number().int().min(1).max(720),
            minutes: z.number().int().min(15).max(120),
          })
          .strict(),
      )
      .max(8),
    authorization: z.enum([
      "none",
      "bakery_production",
      "catering",
      "documented_permission",
    ]),
    authorizationReference: z.string().trim().max(1000),
    authorizationFrom: planningDateSchema.nullable(),
    authorizationUntil: planningDateSchema.nullable(),
    holidayMode: z.enum(["skip", "include"]),
  })
  .strict()
  .refine(
    (t) => t.nextDay || t.start < t.end,
    "Schichtende liegt vor dem Beginn",
  );
export const planningConfigSchema = z
  .object({
    firstMonth: planningDateSchema.refine((d) => d.endsWith("-01")).nullable(),
    enabled: z.boolean(),
    locations: z
      .array(
        z
          .object({
            id,
            name: z.string().trim().min(1).max(100),
            bundesland: z.enum(BUNDESLAENDER_ENUM),
            additionalHolidays: z.array(planningDateSchema).max(100),
            localHolidaysConfirmed: z.boolean(),
          })
          .strict(),
      )
      .max(100),
    skills: z
      .array(z.object({ id, name: z.string().trim().min(1).max(100) }).strict())
      .max(100),
    profiles: z.array(planningProfileSchema).max(2000),
    templates: z.array(planningTemplateSchema).max(500),
    demands: z
      .array(
        z
          .object({
            id,
            locationId: id,
            skillId: id,
            days,
            start: time,
            end: time,
            count: z.number().int().min(1).max(100),
            holidayMode: z.enum(["skip", "include"]),
          })
          .strict()
          .refine((d) => d.start < d.end),
      )
      .max(500),
    travelMinutes: z.number().int().min(0).max(240),
  })
  .strict();
export const planningShiftSchema = z
  .object({
    id,
    templateId: id,
    locationId: id,
    skillId: id,
    date: planningDateSchema,
    start: instant,
    end: instant,
    breaks: z.array(breakSchema).max(8),
    employeeId: id.nullable(),
    locked: z.boolean(),
    substituteDate: planningDateSchema.nullable(),
  })
  .strict();
export const planningPeriodSchema = z
  .object({
    month: planningDateSchema.refine((d) => d.endsWith("-01")),
    status: z.enum(["draft", "announced", "fixed", "closed"]),
    shifts: z.array(planningShiftSchema).max(20000),
    publishedShifts: z.array(planningShiftSchema).max(20000),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export const planningStateSchema = z
  .object({
    config: planningConfigSchema,
    periods: z.array(planningPeriodSchema).max(6),
  })
  .strict();
export const planningCommandSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("refresh"),
      version: z.number().int().nonnegative(),
      month: planningDateSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("configure"),
      version: z.number().int().nonnegative(),
      config: planningConfigSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("generate"),
      version: z.number().int().nonnegative(),
      month: planningDateSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("assign"),
      version: z.number().int().nonnegative(),
      shift: planningShiftSchema,
      reason: z.string().trim().max(1000).default(""),
    })
    .strict(),
  z
    .object({
      action: z.literal("publish"),
      version: z.number().int().nonnegative(),
      month: planningDateSchema,
      status: z.enum(["announced", "fixed"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("optimize"),
      version: z.number().int().nonnegative(),
      month: planningDateSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("apply"),
      version: z.number().int().nonnegative(),
      jobId: id,
    })
    .strict(),
  z
    .object({
      action: z.literal("initialize"),
      version: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      action: z.literal("roll"),
      version: z.number().int().nonnegative(),
    })
    .strict(),
]);
export type PlanningCommand = z.infer<typeof planningCommandSchema>;
