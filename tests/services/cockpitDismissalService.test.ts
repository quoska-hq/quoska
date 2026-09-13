import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CockpitActionItem } from "@/types/cockpit";

const mocks = vi.hoisted(() => ({ getAdminCockpit: vi.fn(), getDismissedCockpitActionIds: vi.fn(), insertCockpitDismissals: vi.fn() }));
vi.mock("@/services/cockpitService", () => ({ getAdminCockpit: mocks.getAdminCockpit }));
vi.mock("@/repos/cockpitDismissalRepo", () => mocks);
import { dismissCockpitActions, filterDismissedCockpitActions } from "@/services/cockpitDismissalService";

const client = {} as SupabaseClient;
const actions = [{ id: "a", employeeId: "employee-1" }, { id: "b", employeeId: "employee-1" }] as CockpitActionItem[];
const dismiss = (actionIds: string[], employeeId?: string) => dismissCockpitActions(client, "tenant-1", "admin-1", { days: 7, actionIds, employeeId }, "2026-08-17", "2026-08-17T12:00:00Z");

describe("Cockpit dismissals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminCockpit.mockResolvedValue({ data: { actions }, error: null });
    mocks.insertCockpitDismissals.mockResolvedValue({ count: 1, dismissedAt: "2026-08-17T12:00:00Z" });
  });

  it("hides only this viewer's acknowledged hints", async () => {
    mocks.getDismissedCockpitActionIds.mockResolvedValue(new Set(["a"]));
    expect(await filterDismissedCockpitActions(client, "tenant-1", "admin-1", actions)).toEqual([actions[1]]);
    expect(mocks.getDismissedCockpitActionIds).toHaveBeenCalledWith(client, "tenant-1", "admin-1", ["a", "b"]);
  });

  it("deduplicates only the explicitly selected current hints", async () => {
    expect(await dismiss(["a", "a"])).toEqual({ data: { dismissedCount: 1, undoToken: expect.any(String), undoExpiresAt: "2026-08-17T12:00:10.000Z" }, error: null });
    expect(mocks.insertCockpitDismissals).toHaveBeenCalledWith(client, "tenant-1", "admin-1", ["a"], expect.any(String));
  });

  it("recomputes the selected employee's scope and refuses hints outside it", async () => {
    expect((await dismiss(["foreign-action"], "employee-1")).data).toBeNull();
    expect(mocks.getAdminCockpit).toHaveBeenCalledWith(client, "tenant-1", "2026-08-17", "2026-08-17", 7, "2026-08-17T12:00:00Z", "employee-1");
    expect(mocks.insertCockpitDismissals).not.toHaveBeenCalled();
  });

  it("does not dismiss new hints that arrived after the user saw the list", async () => {
    mocks.getAdminCockpit.mockResolvedValue({ data: { actions: [...actions, { id: "new" }] }, error: null });
    await dismiss(["a", "b"]);
    expect(mocks.insertCockpitDismissals).toHaveBeenCalledWith(client, "tenant-1", "admin-1", ["a", "b"], expect.any(String));
  });

  it("does not offer undo for hints already hidden by an earlier operation", async () => {
    mocks.insertCockpitDismissals.mockResolvedValue({ count: 0, dismissedAt: null });
    expect((await dismiss(["a"])).data).toEqual({ dismissedCount: 0, undoToken: null, undoExpiresAt: null });
  });

  it("propagates a database failure rather than claiming success", async () => {
    mocks.insertCockpitDismissals.mockRejectedValueOnce(new Error("unavailable"));
    await expect(dismiss(["a"])).rejects.toThrow("unavailable");
  });
});
