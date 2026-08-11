/**
 * Shared local Supabase helpers for E2E tests and marketing asset generation.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const adminClient: SupabaseClient = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
);

/** Generate a unique test email. */
export function testEmail(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@quoska.test`;
}

/** Test password that meets the minimum length requirement. */
export const TEST_PASSWORD = "testpass123";

/** Clean up all test data for a given email. */
export async function cleanupTestUser(email: string) {
  const { data: employees } = await adminClient
    .from("employees")
    .select("id, tenant_id")
    .eq("email", email);

  if (employees && employees.length > 0) {
    for (const employee of employees) {
      await adminClient
        .from("time_entry_audit")
        .delete()
        .eq("tenant_id", employee.tenant_id);
      await adminClient
        .from("correction_requests")
        .delete()
        .eq("tenant_id", employee.tenant_id);
      await adminClient
        .from("break_sessions")
        .delete()
        .eq("tenant_id", employee.tenant_id);
      await adminClient
        .from("time_entries")
        .delete()
        .eq("tenant_id", employee.tenant_id);
      await adminClient
        .from("notifications")
        .delete()
        .eq("employee_id", employee.id);
      await adminClient
        .from("leave_requests")
        .delete()
        .eq("employee_id", employee.id);
      await adminClient
        .from("leave_entitlements")
        .delete()
        .eq("employee_id", employee.id);
      await adminClient
        .from("sick_entries")
        .delete()
        .eq("employee_id", employee.id);
      await adminClient
        .from("project_assignments")
        .delete()
        .eq("employee_id", employee.id);
    }
    await adminClient.from("employees").delete().eq("email", email);

    const tenantIds = [...new Set(employees.map((employee) => employee.tenant_id))];
    for (const tenantId of tenantIds) {
      const { count } = await adminClient
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      if (count === 0) {
        await adminClient
          .from("project_assignments")
          .delete()
          .eq("tenant_id", tenantId);
        await adminClient.from("projects").delete().eq("tenant_id", tenantId);
        await adminClient
          .from("subscription_events")
          .delete()
          .eq("tenant_id", tenantId);
        await adminClient.from("tenants").delete().eq("id", tenantId);
      }
    }
  }

  const { data: users } = await adminClient.auth.admin.listUsers();
  const user = users?.users.find((candidate) => candidate.email === email);
  if (user) await adminClient.auth.admin.deleteUser(user.id);
}

/** Create a fully set-up user with tenant, employee, and JWT claims. */
export async function createTestUser(options: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  role?: "admin" | "manager" | "employee";
  bundesland?: string;
  setupComplete?: boolean;
}) {
  const role = options.role ?? "admin";
  const setupComplete = options.setupComplete ?? true;
  const { data: authData } = await adminClient.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: true,
  });
  const userId = authData.user?.id ?? "";
  if (!userId) throw new Error(`Failed to create auth user for ${options.email}`);

  const { data: tenant, error: tenantError } = await adminClient
    .from("tenants")
    .insert({
      name: options.companyName,
      plan: "free",
      bundesland: options.bundesland ?? null,
      setup_complete: setupComplete,
    })
    .select("id")
    .single();
  if (tenantError || !tenant) {
    throw new Error(`Failed to create tenant: ${tenantError?.message}`);
  }

  const { error: employeeError } = await adminClient.from("employees").insert({
    tenant_id: tenant.id,
    user_id: userId,
    first_name: options.firstName,
    last_name: options.lastName,
    email: options.email,
    role,
  });
  if (employeeError) {
    throw new Error(`Failed to create employee: ${employeeError.message}`);
  }

  await adminClient.rpc("set_employee_claims", { user_uuid: userId });
  return { userId, tenantId: tenant.id };
}
