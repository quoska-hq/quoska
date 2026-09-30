import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executePlanningCommand } from "@/services/planningCommandService";
import { planningFixture } from "../fixtures/planning";
import { FOUR_DAY_WORK_SCHEDULE, WORKDAY_KEYS } from "@/types/work-schedule";
it("accepts an unchanged effective contract regardless of PostgreSQL JSON key ordering", async () => {
  const f = planningFixture();
  const change = { from: "2026-09-01", schedule: FOUR_DAY_WORK_SCHEDULE };
  f.state.config.profiles[0].contractChanges = [change];
  f.context.employees[0].employmentSchedule = {
    baseline: f.context.employees[0].workSchedule,
    changes: [
      {
        ...change,
        schedule: Object.fromEntries(
          [...WORKDAY_KEYS]
            .reverse()
            .map((day) => [day, FOUR_DAY_WORK_SCHEDULE[day]]),
        ) as typeof FOUR_DAY_WORK_SCHEDULE,
      },
    ],
  };
  const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
  const client = { rpc } as unknown as SupabaseClient;
  const snapshot = { ...f, version: 0, issues: [], workerConfigured: true };
  const actor = { role: "admin", tenantId: "tenant", userId: "manager" };
  await expect(
    executePlanningCommand(client, client, actor, snapshot, {
      action: "configure",
      version: 0,
      config: f.state.config,
    }),
  ).resolves.toEqual({ version: 1 });
  const changed = structuredClone(f.state.config);
  changed.profiles[0].contractChanges = [];
  await expect(
    executePlanningCommand(client, client, actor, snapshot, {
      action: "configure",
      version: 0,
      config: changed,
    }),
  ).rejects.toThrow("wirksame Vertragsstände");
  expect(rpc).toHaveBeenCalledTimes(1);
});
