import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCockpitTimeEntryScopes } from "@/repos/cockpitRepo";

function mockClient(pages: { data: { id: string; date: string }[] | null; error: unknown }[]) {
  const range = vi.fn();
  pages.forEach((page) => range.mockResolvedValueOnce(page));
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range };
  return { chain, client: { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient };
}

describe("Cockpit data scopes", () => {
  it("loads the complete previous week without adding it to the current metrics or pause window", async () => {
    const entries = [{ id: "monday", date: "2026-08-10" }, { id: "replacement", date: "2026-08-14" }, { id: "today", date: "2026-08-17" }];
    const { chain, client } = mockClient([{ data: entries, error: null }]);
    const result = await getCockpitTimeEntryScopes(client, "tenant", "2026-08-17", "2026-08-17", "2026-08-10", "employee");
    expect(chain.gte).toHaveBeenCalledWith("date", "2026-08-10");
    expect(chain.eq).toHaveBeenCalledWith("tenant_id", "tenant");
    expect(chain.eq).toHaveBeenCalledWith("employee_id", "employee");
    expect(result.periodEntries).toEqual([entries[2]]);
    expect(result.recentBreakEntries).toEqual(entries.slice(1));
    expect(result.missingEntryEntries).toEqual(entries);
  });

  it("does not create missing-day false positives by truncating larger teams", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, id) => ({ id: String(id), date: "2026-08-10" }));
    const replacement = { id: "late-page", date: "2026-08-14" };
    const { client, chain } = mockClient([{ data: firstPage, error: null }, { data: [replacement], error: null }]);
    const result = await getCockpitTimeEntryScopes(client, "tenant", "2026-08-17", "2026-08-17", "2026-08-10");
    expect(result.missingEntryEntries).toContainEqual(replacement);
    expect(result.missingEntryEntries).toHaveLength(1001);
    expect(chain.range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  });

  it("does not turn failed database reads into missing entries", async () => {
    const error = { message: "connection lost" };
    const { client } = mockClient([{ data: null, error }]);
    await expect(getCockpitTimeEntryScopes(client, "tenant", "2026-08-17", "2026-08-17", "2026-08-10")).rejects.toBe(error);
  });
});
