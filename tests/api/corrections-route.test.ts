import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getEmployeeFromAuth: vi.fn(),
  editTimeEntry: vi.fn(),
  submitCorrectionRequest: vi.fn(),
  listPendingCorrections: vi.fn(),
  listMyCorrectionRequests: vi.fn(),
}));

vi.mock("@/config/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/services/timeEntryService", () => ({
  getEmployeeFromAuth: mocks.getEmployeeFromAuth,
}));

vi.mock("@/services/timeEntryEditService", () => ({
  editTimeEntry: mocks.editTimeEntry,
}));

vi.mock("@/services/correctionRequestService", () => ({
  submitCorrectionRequest: mocks.submitCorrectionRequest,
  listPendingCorrections: mocks.listPendingCorrections,
  listMyCorrectionRequests: mocks.listMyCorrectionRequests,
}));

import { POST } from "@/app/api/v1/corrections/route";

const submission = {
  time_entry_id: "33333333-3333-4333-8333-333333333333",
  proposed_change: { clock_out: "2026-08-10T16:00:00.000Z" },
  reason: "Ausstempeln berichtigt",
};

describe("POST /api/v1/corrections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({});
  });

  it("applies an administrator's correction immediately", async () => {
    mocks.getEmployeeFromAuth.mockResolvedValue({
      data: { tenantId: "tenant-1", employeeId: "admin-1", role: "admin" },
      error: null,
    });
    mocks.editTimeEntry.mockResolvedValue({
      data: { id: submission.time_entry_id, clock_out: submission.proposed_change.clock_out },
      error: null,
    });

    const response = await POST(new Request("http://localhost/api/v1/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    }));

    expect(response.status).toBe(200);
    expect(mocks.editTimeEntry).toHaveBeenCalledWith(
      {},
      "tenant-1",
      "admin-1",
      submission.time_entry_id,
      submission.proposed_change,
      submission.reason,
    );
    expect(mocks.submitCorrectionRequest).not.toHaveBeenCalled();
  });

  it("keeps the approval request flow for a non-admin", async () => {
    mocks.getEmployeeFromAuth.mockResolvedValue({
      data: { tenantId: "tenant-1", employeeId: "employee-1", role: "employee" },
      error: null,
    });
    mocks.submitCorrectionRequest.mockResolvedValue({
      data: { id: "request-1", status: "pending" },
      error: null,
    });

    const response = await POST(new Request("http://localhost/api/v1/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    }));

    expect(response.status).toBe(201);
    expect(mocks.submitCorrectionRequest).toHaveBeenCalled();
    expect(mocks.editTimeEntry).not.toHaveBeenCalled();
  });
});
