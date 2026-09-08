import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LAST_ADMIN_ERROR } from "@/types/employee";
import { updateEmployee, deactivateEmployee } from "@/services/employeeService";

vi.mock("@/repos/employeeRepo", () => ({
  getEmployeeById: vi.fn().mockResolvedValue({
    id: "admin-1", tenant_id: "tenant-1", user_id: "user-1", role: "admin", deleted_at: null,
  }),
}));
vi.mock("@/config/server/timestamps", () => ({
  getNowIso: () => "2026-09-08T12:00:00Z",
}));

function client() {
  const result = { data: null, error: { code: "P0001", message: "last_active_admin" } };
  const query = { eq: vi.fn(), select: vi.fn(), single: vi.fn().mockResolvedValue(result), then: vi.fn() };
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.then.mockImplementation((resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve));
  return {
    from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue(query) }),
    rpc: vi.fn(),
    auth: { admin: { updateUserById: vi.fn() } },
  } as unknown as SupabaseClient;
}

describe("last administrator guard", () => {
  test("explains a rejected demotion without refreshing claims", async () => {
    const admin = client();
    const result = await updateEmployee(client(), admin, "tenant-1", "admin-1", { role: "employee" });
    expect(result).toEqual({ data: null, error: LAST_ADMIN_ERROR });
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  test("does not ban the last administrator when deactivation is rejected", async () => {
    const admin = client();
    const result = await deactivateEmployee(client(), admin, "tenant-1", "admin-1", "admin-2");
    expect(result).toEqual({ data: null, error: LAST_ADMIN_ERROR });
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
});
