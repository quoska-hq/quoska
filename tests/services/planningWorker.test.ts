import { beforeEach, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanningJobResult } from "@/types/planning";
import { planningFixture } from "../fixtures/planning";
vi.mock("@/services/planningSnapshotService", () => ({
  loadPlanningSnapshot: vi.fn(),
}));
import { loadPlanningSnapshot } from "@/services/planningSnapshotService";
import { validatePlanningWorkerResult } from "@/services/planningWorkerService";
import { generatePlanningPeriod } from "@/services/planningPeriodService";
const result: PlanningJobResult = {
  status: "optimal",
  assignments: [],
  wallSeconds: 0.1,
  message: "",
};
const job = {
  tenant_id: "tenant",
  month: "2026-10-01",
  input_version: 1,
  status: "running",
  result: null as PlanningJobResult | null,
};
function client(data: typeof job | null = job) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data, error: null }),
  };
  return { from: () => query } as unknown as SupabaseClient;
}
beforeEach(() => {
  const f = planningFixture();
  f.state.periods = [
    generatePlanningPeriod(
      f.state,
      job.month,
      f.context.today,
      f.context.holidays,
    ),
  ];
  vi.mocked(loadPlanningSnapshot).mockResolvedValue({
    version: 1,
    state: f.state,
    context: f.context,
    issues: [],
    workerConfigured: true,
  });
  result.assignments = f.state.periods[0].shifts.map((s) => ({
    shiftId: s.id,
    employeeId: f.shift.employeeId!,
  }));
});
it("independently validates a feasible result before storing it", async () => {
  expect(
    await validatePlanningWorkerResult(client(), "job", "lease", result),
  ).toEqual(result);
  result.assignments[0].employeeId = "unregistered";
  const rejected = await validatePlanningWorkerResult(
    client(),
    "job",
    "lease",
    result,
  );
  expect(rejected.status).toBe("failed");
  expect(rejected.assignments).toEqual([]);
});
it("rejects a result from a stale source version", async () => {
  const snapshot = await loadPlanningSnapshot(client(), "tenant");
  vi.mocked(loadPlanningSnapshot).mockResolvedValue({
    ...snapshot,
    version: 2,
  });
  expect(
    (await validatePlanningWorkerResult(client(), "job", "lease", result))
      .status,
  ).toBe("failed");
});
it("requires the current lease nonce and keeps completed responses idempotent", async () => {
  await expect(
    validatePlanningWorkerResult(client(null), "job", "lease", result),
  ).rejects.toMatchObject({ status: 409 });
  const stored = {
    ...result,
    status: "failed" as const,
    assignments: [],
    message: "Regelprüfung gesperrt",
  };
  expect(
    await validatePlanningWorkerResult(
      client({ ...job, status: "completed", result: stored }),
      "job",
      "lease",
      result,
    ),
  ).toEqual(stored);
});
