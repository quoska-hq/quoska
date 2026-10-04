import { z } from "zod";

export const planningModuleSchema = z
  .object({
    enabled: z.boolean(),
    version: z.number().int().nonnegative(),
  })
  .strict();
export type PlanningModuleStatus = z.infer<typeof planningModuleSchema>;

export const planningModuleCommandSchema = planningModuleSchema;
