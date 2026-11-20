import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "@/app/api/v1/projects/[id]/targets/route";

const mocks = vi.hoisted(() => ({
  client: {},
  auth: vi.fn(),
  employee: vi.fn(),
  project: vi.fn(),
  targets: vi.fn(),
  setTarget: vi.fn(),
}));

vi.mock("@/config/supabase/server", () => ({ createClient: async () => mocks.client }));
vi.mock("@/services/timeEntryService", () => ({ getEmployeeFromAuth: mocks.auth }));
vi.mock("@/repos/employeeRepo", () => ({ getEmployeeById: mocks.employee }));
vi.mock("@/repos/projectRepo", () => ({ getProjectById: mocks.project }));
vi.mock("@/repos/projectTargetRepo", () => ({
  getProjectWeeklyTargets: mocks.targets,
  setProjectWeeklyTarget: mocks.setTarget,
}));

const tenantId = "10000000-0000-4000-8000-000000000001";
const actorId = "20000000-0000-4000-8000-000000000001";
const projectId = "30000000-0000-4000-8000-000000000001";
const employeeId = "20000000-0000-4000-8000-000000000002";
const params = { params: Promise.resolve({ id: projectId }) };
const target = { employeeId, effectiveFrom: "2026-11-18", weeklyMinutes: 0 };
const url = `http://localhost/api/v1/projects/${projectId}/targets`;

function patchRequest(body: unknown) {
  return new Request(url, { method: "PATCH", body: JSON.stringify(body) });
}

describe("project weekly target API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ data: { tenantId, employeeId: actorId, role: "admin" }, error: null });
    mocks.employee.mockResolvedValue({ role: "admin", deleted_at: null });
    mocks.project.mockResolvedValue({ id: projectId });
    mocks.targets.mockResolvedValue([]);
    mocks.setTarget.mockResolvedValue(null);
  });

  it("loads only the requested team's project history as a manager", async () => {
    mocks.employee.mockResolvedValue({ role: "manager", deleted_at: null });
    mocks.targets.mockResolvedValue([{ ...target, projectId, projectName: "Planung", employeeName: "Ada Test" }]);
    const response = await GET(new Request(url), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [target], error: null });
    expect(mocks.targets).toHaveBeenCalledWith(mocks.client, tenantId, { projectId });
  });

  it("checks the current employee record before writing, including stale claims", async () => {
    mocks.employee.mockResolvedValue({ role: "manager", deleted_at: null });
    expect((await PATCH(patchRequest(target), params)).status).toBe(403);
    mocks.employee.mockResolvedValue({ role: "admin", deleted_at: "2026-11-19T08:30:00.000Z" });
    expect((await PATCH(patchRequest(target), params)).status).toBe(403);
    expect(mocks.setTarget).not.toHaveBeenCalled();
  });

  it("denies a regular employee a history read", async () => {
    mocks.employee.mockResolvedValue({ role: "employee", deleted_at: null });
    expect((await GET(new Request(url), params)).status).toBe(403);
    expect(mocks.targets).not.toHaveBeenCalled();
  });

  it("returns not found when the project is outside tenant scope", async () => {
    mocks.project.mockResolvedValue(null);
    expect((await GET(new Request(url), params)).status).toBe(404);
    expect(mocks.targets).not.toHaveBeenCalled();
  });

  it("stores an administrator's zero target from the requested midweek date", async () => {
    const response = await PATCH(patchRequest(target), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: target, error: null });
    expect(mocks.setTarget).toHaveBeenCalledWith(mocks.client, tenantId, projectId, target);
  });

  it.each([
    { effectiveFrom: "2026-02-29" }, { effectiveFrom: "0000-01-01" },
    { employeeId: "not-a-uuid" }, { weeklyMinutes: 1.5 },
    { weeklyMinutes: -1 }, { weeklyMinutes: 10_081 },
    { tenantId: "another-tenant" },
  ])("rejects invalid target input %j without writing", async (changes) => {
    expect((await PATCH(patchRequest({ ...target, ...changes }), params)).status).toBe(400);
    expect(mocks.setTarget).not.toHaveBeenCalled();
  });

  it("returns the assignment error from the locked database operation", async () => {
    mocks.setTarget.mockResolvedValue({ code: "22023", message: "Die Person ist diesem Projekt nicht zugeordnet." });
    const response = await PATCH(patchRequest(target), params);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ data: null, error: "Die Person ist diesem Projekt nicht zugeordnet." });
  });
});
