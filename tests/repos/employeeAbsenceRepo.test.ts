import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEmployeeAbsenceRanges } from "@/repos/employeeAbsenceRepo";

function client(failTable?: string, paginated = false) {
  const chains: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};
  const from = vi.fn((table: string) => {
    const result = { data: [{ start_date: "2026-08-10", end_date: null }], error: table === failTable ? { message: "unavailable" } : null };
    const chain = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), lte: vi.fn(), gte: vi.fn(), or: vi.fn(), order: vi.fn(), range: vi.fn(), then: vi.fn() };
    for (const key of ["select", "eq", "is", "lte", "gte", "or", "order", "range"] as const) chain[key].mockReturnValue(chain);
    if (paginated) chain.range.mockImplementation((start: number) => {
      result.data = Array.from({ length: start === 0 ? 100 : 1 }, () => ({ start_date: "2026-08-10", end_date: null }));
      return chain;
    });
    chain.then.mockImplementation((resolve) => Promise.resolve(result).then(resolve));
    chains[table] = chain;
    return chain;
  });
  return { supabase: { from } as unknown as SupabaseClient, from, chains };
}

describe("employee absence queries", () => {
  it("scopes both sources and excludes unapproved and deleted records", async () => {
    const { supabase, chains } = client();
    const ranges = await getEmployeeAbsenceRanges(supabase, "tenant", "employee", "2026-08-01", "2026-08-12");
    expect(ranges).toHaveLength(2);
    for (const chain of Object.values(chains)) {
      expect(chain.eq).toHaveBeenCalledWith("tenant_id", "tenant");
      expect(chain.eq).toHaveBeenCalledWith("employee_id", "employee");
      expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
      expect(chain.lte).toHaveBeenCalledWith("start_date", "2026-08-12");
    }
    expect(chains.leave_requests.eq).toHaveBeenCalledWith("status", "approved");
    expect(chains.leave_requests.gte).toHaveBeenCalledWith("end_date", "2026-08-01");
    expect(chains.sick_entries.or).toHaveBeenCalledWith("end_date.is.null,end_date.gte.2026-08-01");
  });
  it.each(["leave_requests", "sick_entries"])("fails instead of returning a false deficit when %s is unavailable", async (table) => {
    await expect(getEmployeeAbsenceRanges(client(table).supabase, "t", "e", "2026-08-01", "2026-08-12")).rejects.toThrow("Abwesenheiten");
  });
  it("loads every page from both sources for long employment histories", async () => {
    const { supabase } = client(undefined, true);
    // Each query creates a fresh chain, with the response determined by its offset.
    expect(await getEmployeeAbsenceRanges(supabase, "t", "e", "2020-01-01", "2026-08-12")).toHaveLength(202);
  });
  it("does not query an empty period", async () => {
    const { supabase, from } = client();
    expect(await getEmployeeAbsenceRanges(supabase, "t", "e", "2026-08-13", "2026-08-12")).toEqual([]);
    expect(from).not.toHaveBeenCalled();
  });
});
