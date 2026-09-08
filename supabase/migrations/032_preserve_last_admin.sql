-- Prevent role changes and deactivation from leaving a tenant without an admin.
-- Hard deletion remains available to the existing tenant-erasure workflow.
CREATE OR REPLACE FUNCTION public.preserve_last_active_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.role = 'admin' AND OLD.deleted_at IS NULL
     AND (NEW.role <> 'admin' OR NEW.deleted_at IS NOT NULL
          OR NEW.tenant_id <> OLD.tenant_id) THEN
    -- Serialize removals within the tenant. Updating the parent also forces a
    -- serialization failure for a stale REPEATABLE READ snapshot.
    UPDATE public.tenants SET updated_at = now() WHERE id = OLD.tenant_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.employees
      WHERE tenant_id = OLD.tenant_id AND id <> OLD.id
        AND role = 'admin' AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'last_active_admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.preserve_last_active_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER preserve_last_active_admin
  BEFORE UPDATE OF role, deleted_at, tenant_id ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.preserve_last_active_admin();
