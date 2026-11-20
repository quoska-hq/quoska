import { describe, expect, it, vi } from "vitest";
import { getProjectBalanceBookingPages } from "@/repos/projectBalanceRepo";
import type { ProjectWeeklyTarget } from "@/types/project-target";

const tenantId = "tenant-1";
const through = "2026-10-31";

const target: ProjectWeeklyTarget = {
  projectId: "project-1",
  projectName: "Wartung",
  employeeId: "employee-1",
  employeeName: "Kaya Beispiel",
  effectiveFrom: "2026-10-05",
  weeklyMinutes: 60,
};

function mockPage(data: unknown[], error: Error | null = null) {
  const query = Object.assign(Promise.resolve({ data, error }), {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), is: vi.fn(), not: vi.fn(),
    gte: vi.fn(), lte: vi.fn(), order: vi.fn(), limit: vi.fn(), or: vi.fn(),
  });
  for (const method of Object.values(query)) method.mockReturnValue(query);
  return query;
}

function mockClient(...pages: ReturnType<typeof mockPage>[]) {
  const from = vi.fn();
  for (const page of pages) from.mockReturnValueOnce(page);
  const supabase = { from } as unknown as Parameters<typeof getProjectBalanceBookingPages>[0];
  return { supabase, from };
}

describe("project balance booking queries", () => {
  it("reads all pages through the date/id cursor and scopes the query to eligible tenant pairs", async () => {
    const initialRows = Array.from({ length: 1000 }, (_, index) => ({
      id: String(index).padStart(8, "0"),
      date: "2026-10-09",
    }));
    const finalRows = [{ id: "00001000", date: "2026-10-09" }];
    const first = mockPage(initialRows);
    const second = mockPage(finalRows);
    const { supabase, from } = mockClient(first, second);
    const targets = [
      target,
      { ...target, employeeId: "employee-2", effectiveFrom: "2026-10-01" },
      { ...target, effectiveFrom: "2026-10-11", weeklyMinutes: 0 },
      { ...target, projectId: "zero-only-project", weeklyMinutes: 0 },
      { ...target, projectId: "future-project", effectiveFrom: "2026-11-02" },
    ];
    const pages = getProjectBalanceBookingPages(supabase, tenantId, targets, through);
    const rows = (await pages.next()).value;
    expect(rows).toEqual(initialRows);
    expect((await pages.next()).value).toEqual(finalRows);
    expect((await pages.next()).done).toBe(true);
    expect(from).toHaveBeenCalledTimes(2);
    expect(from).toHaveBeenNthCalledWith(1, "time_entries");
    for (const query of [first, second]) {
      expect(query.eq).toHaveBeenCalledWith("tenant_id", tenantId);
      expect(query.eq).toHaveBeenCalledWith("project_id", target.projectId);
      expect(query.eq).toHaveBeenCalledWith("status", "completed");
      expect(query.in).toHaveBeenCalledWith("employee_id", [target.employeeId, "employee-2"]);
      expect(query.is).toHaveBeenCalledWith("deleted_at", null);
      expect(query.not).toHaveBeenCalledWith("clock_out", "is", null);
      expect(query.gte).toHaveBeenCalledWith("date", "2026-10-01");
      expect(query.lte).toHaveBeenCalledWith("date", through);
      expect(query.order).toHaveBeenNthCalledWith(1, "date");
      expect(query.order).toHaveBeenNthCalledWith(2, "id");
      expect(query.limit).toHaveBeenCalledWith(1000);
    }
    expect(first.or).not.toHaveBeenCalled();
    expect(second.or).toHaveBeenCalledWith("date.gt.2026-10-09,and(date.eq.2026-10-09,id.gt.00000999)");
  });

  it("splits large employee filters into bounded queries", async () => {
    const first = mockPage([]);
    const second = mockPage([]);
    const { supabase } = mockClient(first, second);
    const employeeIds = Array.from({ length: 101 }, (_, index) => `employee-${index}`);
    const targets = employeeIds.map((employeeId) => ({ ...target, employeeId }));

    expect((await getProjectBalanceBookingPages(supabase, tenantId, targets, through).next()).done).toBe(true);
    expect(first.in).toHaveBeenCalledWith("employee_id", employeeIds.slice(0, 100));
    expect(second.in).toHaveBeenCalledWith("employee_id", employeeIds.slice(100));
  });

  it("surfaces database errors instead of treating a failed page as zero hours", async () => {
    const { supabase } = mockClient(mockPage([], new Error("Datenbankfehler")));
    const pages = getProjectBalanceBookingPages(supabase, tenantId, [target], through);
    await expect(pages.next()).rejects.toThrow("Datenbankfehler");
  });
});
