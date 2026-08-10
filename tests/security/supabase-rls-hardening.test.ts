import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/019_harden_rls_and_storage.sql",
  "utf8",
);

describe("production Supabase RLS hardening", () => {
  it("enables RLS on tenants and reference data", () => {
    expect(migration).toContain(
      "ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY",
    );
    expect(migration).toContain(
      "ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY",
    );
  });

  it("removes broad sickness and leave policies", () => {
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "leave_tenant_isolation"',
    );
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "sick_tenant_isolation"',
    );
    expect(migration).toContain("employee_id = public.get_jwt_claim('employee_id')::uuid");
    expect(migration).toContain(
      "public.get_jwt_claim('role') IN ('admin', 'manager')",
    );
  });

  it("scopes AU certificates to the JWT tenant and matching sickness row", () => {
    expect(migration).toContain(
      "'tenants/' || public.get_jwt_claim('tenant_id') || '/au/%'",
    );
    expect(migration).toContain("FROM public.sick_entries se");
    expect(migration).toContain("se.employee_id = public.get_jwt_claim('employee_id')::uuid");
  });

  it("pins security-definer search paths and restricts helper execution", () => {
    expect(migration.match(/SET search_path = ''/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.set_employee_claims(UUID) FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.set_employee_claims(UUID) TO service_role",
    );
  });
});
