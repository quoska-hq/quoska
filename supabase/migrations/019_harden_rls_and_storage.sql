-- Migration: 019_harden_rls_and_storage
--
-- Tightens tenant isolation and access to sensitive leave, sickness, and AU
-- certificate data. Earlier migrations intentionally introduced the schema in
-- small steps, but some broad FOR ALL policies were too permissive for a
-- multi-tenant production deployment.

-- ---------------------------------------------------------------------------
-- JWT helper functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_jwt_claim(claim_name TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  SELECT auth.jwt()->'app_metadata'->>claim_name;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_claims(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  emp RECORD;
BEGIN
  SELECT
    e.tenant_id::text,
    e.id::text,
    e.role
  INTO emp
  FROM public.employees e
  WHERE e.user_id = user_uuid
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'tenant_id', emp.tenant_id,
    'employee_id', emp.id,
    'role', emp.role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.set_employee_claims(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  claims JSONB;
BEGIN
  claims := public.get_employee_claims(user_uuid);

  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) || claims
  WHERE id = user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.set_employee_claims(NEW.user_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.get_jwt_claim(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_jwt_claim(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_employee_claims(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_employee_claims(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_employee() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_claims(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_employee_claims(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_employee() TO service_role;

-- ---------------------------------------------------------------------------
-- Tenant and reference data
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_isolation" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_jwt_claim('tenant_id')::uuid);

-- Tenant writes contain billing and plan fields and therefore remain limited
-- to the server-side service role.
REVOKE INSERT, UPDATE, DELETE ON public.tenants FROM anon, authenticated;

ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_holidays_read" ON public.public_holidays
  FOR SELECT TO authenticated
  USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.public_holidays FROM anon, authenticated;

-- Employee mutations are performed by authenticated API handlers using the
-- service role after their own authorization checks. Browser/session clients
-- only need tenant-scoped reads.
DROP POLICY IF EXISTS "employees_tenant_isolation" ON public.employees;
CREATE POLICY "employees_tenant_read" ON public.employees
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_jwt_claim('tenant_id')::uuid);
REVOKE INSERT, UPDATE, DELETE ON public.employees FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Correction requests
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "corrections_tenant" ON public.correction_requests;

CREATE POLICY "corrections_read" ON public.correction_requests
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

CREATE POLICY "corrections_insert_own" ON public.correction_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND employee_id = public.get_jwt_claim('employee_id')::uuid
  );

CREATE POLICY "corrections_review" ON public.correction_requests
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );

-- ---------------------------------------------------------------------------
-- Leave and sickness data
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "leave_tenant_isolation" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_employee_self" ON public.leave_requests;

CREATE POLICY "leave_read" ON public.leave_requests
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

CREATE POLICY "leave_insert_own" ON public.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND employee_id = public.get_jwt_claim('employee_id')::uuid
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

CREATE POLICY "leave_update" ON public.leave_requests
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "entitlement_tenant_isolation" ON public.leave_entitlements;
CREATE POLICY "entitlement_read" ON public.leave_entitlements
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

CREATE POLICY "entitlement_manage" ON public.leave_entitlements
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "sick_tenant_isolation" ON public.sick_entries;
DROP POLICY IF EXISTS "sick_employee_self" ON public.sick_entries;

CREATE POLICY "sick_read" ON public.sick_entries
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

CREATE POLICY "sick_insert" ON public.sick_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

CREATE POLICY "sick_update" ON public.sick_entries
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

-- ---------------------------------------------------------------------------
-- Projects and assignments
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "projects_tenant_isolation" ON public.projects;
CREATE POLICY "projects_read" ON public.projects
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_jwt_claim('tenant_id')::uuid);
CREATE POLICY "projects_manage" ON public.projects
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "assignments_tenant_isolation" ON public.project_assignments;
CREATE POLICY "assignments_read" ON public.project_assignments
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_jwt_claim('tenant_id')::uuid);
CREATE POLICY "assignments_manage" ON public.project_assignments
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );

-- ---------------------------------------------------------------------------
-- Private AU certificate storage
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "au_tenant_access" ON storage.objects;

CREATE POLICY "au_tenant_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'au-certificates'
    AND name LIKE (
      'tenants/' || public.get_jwt_claim('tenant_id') || '/au/%'
    )
    AND (
      public.get_jwt_claim('role') IN ('admin', 'manager')
      OR EXISTS (
        SELECT 1
        FROM public.sick_entries se
        WHERE se.tenant_id = public.get_jwt_claim('tenant_id')::uuid
          AND se.employee_id = public.get_jwt_claim('employee_id')::uuid
          AND name LIKE (
            'tenants/' || se.tenant_id::text || '/au/' || se.id::text || '.%'
          )
      )
    )
  );

CREATE POLICY "au_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'au-certificates'
    AND name LIKE (
      'tenants/' || public.get_jwt_claim('tenant_id') || '/au/%'
    )
    AND EXISTS (
      SELECT 1
      FROM public.sick_entries se
      WHERE se.tenant_id = public.get_jwt_claim('tenant_id')::uuid
        AND (
          se.employee_id = public.get_jwt_claim('employee_id')::uuid
          OR public.get_jwt_claim('role') IN ('admin', 'manager')
        )
        AND name LIKE (
          'tenants/' || se.tenant_id::text || '/au/' || se.id::text || '.%'
        )
    )
  );

CREATE POLICY "au_tenant_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'au-certificates'
    AND name LIKE (
      'tenants/' || public.get_jwt_claim('tenant_id') || '/au/%'
    )
    AND EXISTS (
      SELECT 1
      FROM public.sick_entries se
      WHERE se.tenant_id = public.get_jwt_claim('tenant_id')::uuid
        AND (
          se.employee_id = public.get_jwt_claim('employee_id')::uuid
          OR public.get_jwt_claim('role') IN ('admin', 'manager')
        )
        AND name LIKE (
          'tenants/' || se.tenant_id::text || '/au/' || se.id::text || '.%'
        )
    )
  )
  WITH CHECK (
    bucket_id = 'au-certificates'
    AND name LIKE (
      'tenants/' || public.get_jwt_claim('tenant_id') || '/au/%'
    )
    AND EXISTS (
      SELECT 1
      FROM public.sick_entries se
      WHERE se.tenant_id = public.get_jwt_claim('tenant_id')::uuid
        AND (
          se.employee_id = public.get_jwt_claim('employee_id')::uuid
          OR public.get_jwt_claim('role') IN ('admin', 'manager')
        )
        AND name LIKE (
          'tenants/' || se.tenant_id::text || '/au/' || se.id::text || '.%'
        )
    )
  );
