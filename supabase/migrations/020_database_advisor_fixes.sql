-- Migration: 020_database_advisor_fixes
-- Resolves the actionable security and performance findings reported by the
-- Supabase database advisors after the initial production schema deployment.

-- The trigger function contains no object lookups, so an empty search_path is
-- both safe and removes the mutable-search-path warning.
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Cover foreign-key columns used during parent updates/deletes and joins.
CREATE INDEX idx_break_sessions_tenant_time_entry
  ON public.break_sessions (tenant_id, time_entry_id);
CREATE INDEX idx_correction_requests_time_entry
  ON public.correction_requests (time_entry_id);
CREATE INDEX idx_leave_entitlements_tenant
  ON public.leave_entitlements (tenant_id);
CREATE INDEX idx_leave_requests_reviewed_by
  ON public.leave_requests (reviewed_by)
  WHERE reviewed_by IS NOT NULL;
CREATE INDEX idx_notifications_tenant
  ON public.notifications (tenant_id);
CREATE INDEX idx_project_assignments_tenant
  ON public.project_assignments (tenant_id);
CREATE INDEX idx_sick_entries_created_by
  ON public.sick_entries (created_by);
CREATE INDEX idx_subscription_events_tenant
  ON public.subscription_events (tenant_id)
  WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_time_entries_tenant_employee
  ON public.time_entries (tenant_id, employee_id);

-- FOR ALL also participates in SELECT checks. Split write policies by action
-- so each SELECT has only one permissive policy to evaluate.
DROP POLICY IF EXISTS "entitlement_manage" ON public.leave_entitlements;
CREATE POLICY "entitlement_insert" ON public.leave_entitlements
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );
CREATE POLICY "entitlement_update" ON public.leave_entitlements
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );
CREATE POLICY "entitlement_delete" ON public.leave_entitlements
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "projects_manage" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "assignments_manage" ON public.project_assignments;
CREATE POLICY "assignments_insert" ON public.project_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );
CREATE POLICY "assignments_update" ON public.project_assignments
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );
CREATE POLICY "assignments_delete" ON public.project_assignments
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
  );
