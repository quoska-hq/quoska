import { z } from "zod";
export const planningWorkerResultSchema = z
  .object({
    jobId: z.string().uuid(),
    leaseToken: z.string().uuid(),
    result: z
      .object({
        status: z.enum([
          "optimal",
          "feasible",
          "infeasible",
          "timeout",
          "failed",
        ]),
        assignments: z
          .array(
            z
              .object({
                shiftId: z.string().uuid(),
                employeeId: z.string().uuid(),
              })
              .strict(),
          )
          .max(20000),
        wallSeconds: z.number().finite().min(0).max(180),
        message: z.string().max(1000),
      })
      .strict(),
  })
  .strict();
