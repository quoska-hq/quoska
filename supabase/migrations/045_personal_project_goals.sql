-- Personal project goals use the signed-in Auth user and the matching active
-- employee in the target's tenant. Existing management policies stay intact.
CREATE POLICY project_weekly_targets_read_own ON public.project_weekly_targets
  FOR SELECT TO authenticated USING (
    cancelled_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.employees AS viewer
        WHERE viewer.tenant_id = project_weekly_targets.tenant_id
          AND viewer.id = project_weekly_targets.employee_id
          AND viewer.user_id = (SELECT auth.uid())
          AND viewer.deleted_at IS NULL
    )
  );
