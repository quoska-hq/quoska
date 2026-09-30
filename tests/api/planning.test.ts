import { afterEach, describe, expect, it, vi } from "vitest";
import { planningFixture } from "../fixtures/planning";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  snapshot: vi.fn(),
  execute: vi.fn(),
  jobs: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/services/planningRequestService", async (original) => ({
  ...(await original<typeof import("@/services/planningRequestService")>()),
  planningRequest: mocks.request,
}));
vi.mock("@/services/planningSnapshotService", () => ({
  loadPlanningSnapshot: mocks.snapshot,
}));
vi.mock("@/services/planningCommandService", () => ({
  executePlanningCommand: mocks.execute,
}));
vi.mock("@/repos/planningRepo", async (original) => ({
  ...(await original<typeof import("@/repos/planningRepo")>()),
  readPlanningJobs: mocks.jobs,
}));
import { GET, POST } from "@/app/api/v1/planning/route";
import {
  GET as mine,
  POST as preferences,
} from "@/app/api/v1/planning/mine/route";
import { GET as swaps } from "@/app/api/v1/planning/swaps/route";
import { POST as worker } from "@/app/api/v1/planning/worker/route";
import { PlanningError } from "@/services/planningPeriodService";
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
describe("Planning endpoints", () => {
  it.each([GET, mine, swaps])("requires a verified actor", async (handler) => {
    mocks.request.mockRejectedValue(new PlanningError("Bitte anmelden.", 401));
    expect((await handler()).status).toBe(401);
  });
  it("rejects invalid commands before reading planning inputs", async () => {
    mocks.request.mockResolvedValue({
      client: {},
      admin: {},
      actor: { tenantId: "t", userId: "u", role: "admin" },
    });
    expect(
      (
        await POST(
          new Request("http://localhost/api/v1/planning", {
            method: "POST",
            body: '{"action":"publish","month":"2026-02-30"}',
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it("returns version conflicts without executing a stale mutation", async () => {
    mocks.request.mockResolvedValue({
      client: {},
      admin: {},
      actor: { tenantId: "t", userId: "u", role: "admin" },
    });
    mocks.snapshot.mockResolvedValue({ ...planningFixture(), version: 2 });
    mocks.execute.mockRejectedValue(new PlanningError("Bitte neu laden.", 409));
    expect(
      (
        await POST(
          new Request("http://localhost/api/v1/planning", {
            method: "POST",
            body: '{"action":"roll","version":1}',
          }),
        )
      ).status,
    ).toBe(409);
  });
  it("rejects malformed preference days", async () => {
    mocks.request.mockResolvedValue({
      admin: { rpc: mocks.rpc },
      actor: { userId: "u" },
    });
    expect(
      (
        await preferences(
          new Request("http://localhost/api/v1/planning/mine", {
            method: "POST",
            body: '{"preferredDays":[1,1]}',
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires the separate strong worker token", async () => {
    vi.stubEnv("PLANNING_WORKER_TOKEN", "a".repeat(32));
    expect(
      (
        await worker(
          new Request("http://localhost/api/v1/planning/worker", {
            method: "POST",
            body: '{"action":"claim"}',
          }),
        )
      ).status,
    ).toBe(401);
  });
  it("rejects oversized worker results before using privileged storage", async () => {
    vi.stubEnv("PLANNING_WORKER_TOKEN", "a".repeat(32));
    expect(
      (
        await worker(
          new Request("http://localhost/api/v1/planning/worker", {
            method: "POST",
            headers: { Authorization: `Bearer ${"a".repeat(32)}` },
            body: "x".repeat(2000001),
          }),
        )
      ).status,
    ).toBe(413);
  });
});
