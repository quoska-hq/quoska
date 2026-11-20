import { describe, expect, it, vi } from "vitest";
import { getProjectBalanceBookingPages } from "@/repos/projectBalanceRepo";
import { getProjectWeeklyTargets } from "@/repos/projectTargetRepo";
import { getPersonalProjectGoals } from "@/services/projectBalanceService";
import type { ProjectWeeklyTarget } from "@/types/project-target";

vi.mock("@/repos/projectBalanceRepo", () => ({ getProjectBalanceBookingPages: vi.fn() }));
vi.mock("@/repos/projectTargetRepo", () => ({ getProjectWeeklyTargets: vi.fn() }));

describe("getPersonalProjectGoals", () => {
  it("loads target changes through Sunday and makes one scoped booking scan through today", async () => {
    const supabase = {} as Parameters<typeof getPersonalProjectGoals>[0];
    const tenantId = "tenant-1";
    const employeeId = "employee-1";
    const goal: ProjectWeeklyTarget = {
      projectId: "project-1",
      projectName: "Wartung",
      employeeId,
      employeeName: "Kaya Beispiel",
      effectiveFrom: "2026-10-05",
      weeklyMinutes: 100,
    };
    const scheduled = { ...goal, effectiveFrom: "2026-10-15", weeklyMinutes: 200 };
    vi.mocked(getProjectWeeklyTargets).mockResolvedValue([
      goal,
      scheduled,
      { ...goal, projectId: "closed" },
      { ...goal, projectId: "closed", effectiveFrom: "2026-10-12", weeklyMinutes: 0 },
      { ...goal, employeeId: "employee-2", projectId: "other-person" },
    ]);
    vi.mocked(getProjectBalanceBookingPages).mockImplementation(async function* () {
      const entry = {
        id: "entry-1",
        project_id: goal.projectId,
        employee_id: employeeId,
        date: "2026-10-12",
        clock_in: "2026-10-12T08:00:00Z",
        clock_out: "2026-10-12T08:30:00Z",
        break_minutes: 10,
      };
      yield [entry];
      yield [{ ...entry, id: "entry-2", clock_in: "2026-10-12T09:00:00Z", clock_out: "2026-10-12T09:30:00Z" }];
    });

    const result = await getPersonalProjectGoals(supabase, tenantId, employeeId, "2026-10-12", "2026-10-14");
    expect(getProjectWeeklyTargets).toHaveBeenCalledExactlyOnceWith(supabase, tenantId, {
      employeeId, through: "2026-10-18",
    });
    expect(getProjectBalanceBookingPages).toHaveBeenCalledExactlyOnceWith(
      supabase, tenantId, [goal, scheduled], "2026-10-14",
    );
    expect(result).toEqual([{
      projectId: goal.projectId,
      projectName: goal.projectName,
      plannedMinutes: 140,
      actualMinutes: 40,
      balanceMinutes: -120,
    }]);
  });
});
