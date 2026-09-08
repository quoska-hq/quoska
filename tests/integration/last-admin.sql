-- Run against a local database with migration 032 applied. No fixtures persist.
BEGIN;
DO $$
DECLARE
  tenant uuid := gen_random_uuid();
  other_tenant uuid := gen_random_uuid();
  first_admin uuid := gen_random_uuid();
  second_admin uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.tenants (id, name) VALUES (tenant, 'Admin guard test'), (other_tenant, 'Other tenant');
  INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, role) VALUES
    (first_admin, tenant, gen_random_uuid(), 'First', 'Admin', 'first@example.test', 'admin'),
    (second_admin, tenant, gen_random_uuid(), 'Second', 'Admin', 'second@example.test', 'employee'),
    (gen_random_uuid(), other_tenant, gen_random_uuid(), 'Other', 'Admin', 'other@example.test', 'admin');

  BEGIN
    UPDATE public.employees SET role = 'manager' WHERE id = first_admin;
    RAISE EXCEPTION 'demotion was allowed';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'last_active_admin', SQLERRM;
  END;
  BEGIN
    UPDATE public.employees SET deleted_at = now() WHERE id = first_admin;
    RAISE EXCEPTION 'deactivation was allowed';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'last_active_admin', SQLERRM;
  END;
  BEGIN
    UPDATE public.employees SET tenant_id = other_tenant WHERE id = first_admin;
    RAISE EXCEPTION 'tenant transfer was allowed';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'last_active_admin', SQLERRM;
  END;
  UPDATE public.employees SET first_name = 'Renamed' WHERE id = first_admin;
  UPDATE public.employees SET role = 'admin', deleted_at = now() WHERE id = second_admin;
  BEGIN
    UPDATE public.employees SET role = 'employee' WHERE id = first_admin;
    RAISE EXCEPTION 'inactive admin was counted';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM = 'last_active_admin', SQLERRM;
  END;
  UPDATE public.employees SET deleted_at = NULL WHERE id = second_admin;
  UPDATE public.employees SET role = 'employee' WHERE id = first_admin;
  UPDATE public.employees SET role = 'admin' WHERE id = first_admin;
  UPDATE public.employees SET deleted_at = now() WHERE id = second_admin;
  ASSERT (SELECT count(*) FROM public.employees WHERE tenant_id = tenant AND role = 'admin' AND deleted_at IS NULL) = 1;

  -- Keep the existing account-erasure workflow functional.
  DELETE FROM public.employees WHERE tenant_id = tenant;
  DELETE FROM public.tenants WHERE id = tenant;
END;
$$;
ROLLBACK;
