import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockSupabase, createTableMock } from "../legal/helpers/supabase-mock";
import { submitMissingTimeRequest, reviewMissingTimeRequest } from "@/services/missingTimeRequestService";
import { notifyManagers } from "@/services/notificationService";
import { missingTimeRequestSchema } from "@/types/time-entry";
import { approveCorrectionRequest, rejectCorrectionRequest } from "@/services/correctionRequestService";

const server = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createAdminClient: server.admin }));

vi.mock("@/services/notificationService", () => ({ notifyManagers: vi.fn(), sendNotification: vi.fn() }));
vi.mock("@/config/server/timestamps", async (original) => ({
  ...await original<typeof import("@/config/server/timestamps")>(), getNowIso: () => "2026-11-05T16:00:00.000Z",
}));

const input = missingTimeRequestSchema.parse({ date: "2026-10-20", start_time: "08:00", end_time: "17:00", break_minutes: 0, reason: "Stempeln vergessen" });
function fixture() {
  const entries = createTableMock({});
  const admin = createMockSupabase({ time_entries: entries });
  const rpc = vi.fn().mockResolvedValue({ data: { id: "request", status: "pending", time_entry_id: null }, error: null });
  admin.rpc = rpc;
  return { admin, rpc, entries };
}

describe("missing time requests", () => {
  beforeEach(() => vi.clearAllMocks());
  it("passes the proposal, including Berlin time and automatic break, to the atomic workflow", async () => {
    const f = fixture();
    expect((await submitMissingTimeRequest(f.admin, "tenant", "employee", input)).data?.status).toBe("pending");
    expect(f.rpc).toHaveBeenCalledWith("submit_missing_time_request", {
      p_tenant_id: "tenant", p_employee_id: "employee", p_reason: "Stempeln vergessen",
      p_proposal: expect.objectContaining({ clock_in: "2026-10-20T06:00:00.000Z", clock_out: "2026-10-20T15:00:00.000Z",
        break_minutes: 30, automatic_break_minutes: 30 }),
    });
    expect(notifyManagers).toHaveBeenCalledOnce();
  });
  it("returns an immediate booking without asking managers to review it", async () => {
    const f = fixture();
    f.rpc.mockResolvedValue({ data: { id: "request", status: "approved", time_entry_id: "entry" }, error: null });
    expect((await submitMissingTimeRequest(f.admin, "tenant", "employee", input)).data?.time_entry_id).toBe("entry");
    expect(notifyManagers).not.toHaveBeenCalled();
  });
  it("surfaces a database rejection without sending notifications", async () => {
    const f = fixture();
    f.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "Der Zeitraum überschneidet sich" } });
    const result = await submitMissingTimeRequest(f.admin, "tenant", "employee", input);
    expect(result.data).toBeNull();
    expect(result.error).toContain("überschneidet");
    expect(notifyManagers).not.toHaveBeenCalled();
  });
  it.each([
    { date: "2026-11-06" }, { end_time: "07:00" }, { break_minutes: 540 },
    { date: "2026-03-29", start_time: "02:30" }, { date: "2026-10-25", start_time: "02:30" },
  ])("rejects future, invalid or ambiguous times: %j", async (changes) => {
    const f = fixture();
    expect((await submitMissingTimeRequest(f.admin, "tenant", "employee", { ...input, ...changes })).data).toBeNull();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it("supports an overnight shift", async () => {
    const f = fixture();
    await submitMissingTimeRequest(f.admin, "tenant", "employee", { ...input, start_time: "22:00", end_time: "06:00", ends_next_day: true });
    expect(f.rpc).toHaveBeenCalledWith("submit_missing_time_request", expect.objectContaining({ p_proposal: expect.objectContaining({
      date: "2026-10-20", clock_in: "2026-10-20T20:00:00.000Z", clock_out: "2026-10-21T04:00:00.000Z",
    }) }));
  });
  it("reviews through the atomic database function and surfaces overlap errors", async () => {
    const f = fixture();
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "Der Zeitraum überschneidet sich" } });
    f.admin.rpc = rpc;
    expect((await reviewMissingTimeRequest(f.admin, "tenant", "manager", "request", "approve")).error).toContain("überschneidet");
    expect(rpc).toHaveBeenCalledWith("review_missing_time_request", expect.objectContaining({ p_reviewer_id: "manager", p_action: "approve" }));
    expect(f.entries.insert).not.toHaveBeenCalled();
  });
  it.each(["approve", "reject"] as const)("routes %s of a missing-time request through the atomic flow", async (action) => {
    const f = fixture();
    const request = { id: "request", tenant_id: "tenant", employee_id: "employee", time_entry_id: null,
      request_type: "missing_entry", status: "pending", reason: "Stempeln vergessen" };
    const readClient = createMockSupabase({ correction_requests: createTableMock({ selectResolver: async () => ({ data: request }) }) });
    f.admin.rpc = vi.fn().mockResolvedValue({ data: { ...request, status: action === "approve" ? "approved" : "rejected" }, error: null });
    server.admin.mockReturnValue(f.admin);
    const review = action === "approve" ? approveCorrectionRequest : rejectCorrectionRequest;
    expect((await review(readClient, "tenant", "manager", "request")).data?.status).toBe(action === "approve" ? "approved" : "rejected");
    expect(f.admin.rpc).toHaveBeenCalledWith("review_missing_time_request", expect.objectContaining({ p_action: action, p_request_id: "request" }));
    expect(f.entries.insert).not.toHaveBeenCalled();
  });
});
