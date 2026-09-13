import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTimeEntriesThroughDate } from "@/repos/timeEntryRepo";

function clientForPages(pages: { data: unknown[] | null; error: unknown }[]) {
  const range = vi.fn();
  for (const page of pages) range.mockResolvedValueOnce(page);
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range,
  };
  const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
  return { client, chain };
}

describe("getTimeEntriesThroughDate", () => {
  it("loads beyond the API row limit and scopes non-deleted work through today", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, id) => ({ id: String(id) }));
    const lastPage = [{ id: "1000" }];
    const { client, chain } = clientForPages([
      { data: firstPage, error: null }, { data: lastPage, error: null },
    ]);
    expect(await getTimeEntriesThroughDate(client, "tenant", "employee", "2026-08-12"))
      .toEqual([...firstPage, ...lastPage]);
    expect(chain.eq).toHaveBeenCalledWith("tenant_id", "tenant");
    expect(chain.eq).toHaveBeenCalledWith("employee_id", "employee");
    expect(chain.lte).toHaveBeenCalledWith("date", "2026-08-12");
    expect(chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(chain.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it("rejects a failed page instead of returning a partial balance", async () => {
    const error = { message: "Database unavailable" };
    const { client } = clientForPages([{ data: null, error }]);
    await expect(getTimeEntriesThroughDate(client, "tenant", "employee", "2026-08-12"))
      .rejects.toBe(error);
  });
});
