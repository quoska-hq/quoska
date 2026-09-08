-- Run against a local database with migration 031 installed:
-- docker exec -i supabase_db_stempel psql -U postgres -d postgres -v ON_ERROR_STOP=1 < tests/integration/time-import.sql
-- All fixtures and fault-injection hooks are rolled back.
BEGIN;

DO $$
DECLARE
  tenant uuid := gen_random_uuid();
  foreign_tenant uuid := gen_random_uuid();
  actor uuid := gen_random_uuid();
  employee uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  batch jsonb;
  result jsonb;
  n integer;
BEGIN
  INSERT INTO public.tenants (id, name) VALUES (tenant, 'Import SQL test'), (foreign_tenant, 'Other tenant');
  INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, role) VALUES
    (actor, tenant, gen_random_uuid(), 'Admin', 'Test', actor || '@import.test', 'admin'),
    (employee, tenant, gen_random_uuid(), 'Employee', 'Test', employee || '@import.test', 'employee'),
    (outsider, foreign_tenant, gen_random_uuid(), 'Other', 'Test', outsider || '@import.test', 'employee');
  batch := jsonb_build_array(jsonb_build_object('row', 2, 'employee_id', employee, 'date', '2026-01-12',
    'clock_in', '2026-01-12T07:00:00Z', 'clock_out', '2026-01-12T15:00:00Z', 'break_minutes', 10, 'notes', 'Original'));

  result := public.import_time_entries(tenant, actor, batch, false);
  ASSERT (result->>'readyCount')::integer = 1, 'preview should be ready';
  ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id = tenant) = 0, 'preview wrote entries';

  result := public.import_time_entries(tenant, actor,
    batch || jsonb_set(batch, '{0,row}', '3'), true);
  ASSERT (result->>'importedCount')::integer = 1, 'same-file duplicate should be skipped';
  ASSERT (result->>'duplicateCount')::integer = 1, 'same-file duplicate count';
  ASSERT EXISTS (SELECT 1 FROM public.time_entries WHERE tenant_id = tenant
    AND break_minutes = 10 AND automatic_break_minutes = 0 AND entry_source = 'import'), 'original pause lost';
  ASSERT EXISTS (SELECT 1 FROM public.time_entry_audit WHERE tenant_id = tenant
    AND changed_by = actor AND field_name = 'import_entry' AND action = 'create'), 'missing audit';
  result := public.import_time_entries(tenant, actor, batch, true);
  ASSERT (result->>'importedCount')::integer = 0 AND (result->>'duplicateCount')::integer = 1, 'retry duplicated entries';

  result := public.import_time_entries(tenant, actor, jsonb_set(batch, '{0,notes}', '"Changed"'), true);
  ASSERT (result->>'errorCount')::integer = 1, 'conflicting notes were silently skipped';
  result := public.import_time_entries(tenant, actor, jsonb_set(batch, '{0,employee_id}', to_jsonb(outsider)), true);
  ASSERT (result->>'errorCount')::integer = 1, 'foreign employee allowed';

  -- One invalid row must prevent insertion of a valid neighboring row.
  batch := jsonb_build_array(jsonb_build_object('row', 2, 'employee_id', employee, 'date', '2026-01-13',
    'clock_in', '2026-01-13T07:00:00Z', 'clock_out', '2026-01-13T08:00:00Z', 'break_minutes', 0));
  result := public.import_time_entries(tenant, actor, batch ||
    jsonb_set(jsonb_set(batch, '{0,row}', '3'), '{0,employee_id}', to_jsonb(outsider)), true);
  ASSERT (result->>'importedCount')::integer = 0 AND (result->>'errorCount')::integer = 1, 'partial import occurred';
  ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id = tenant) = 1, 'partial import wrote entries';

  -- Adjacent intervals are allowed, overlaps are blocked (including a running clock).
  result := public.import_time_entries(tenant, actor, batch ||
    jsonb_set(jsonb_set(batch, '{0,row}', '3'), '{0,clock_in}', '"2026-01-13T07:30:00Z"'), true);
  ASSERT (result->>'errorCount')::integer = 2, 'same-file overlap missed';
  INSERT INTO public.time_entries (tenant_id, employee_id, date, clock_in, status)
    VALUES (tenant, employee, '2026-01-13', '2026-01-13T07:30:00Z', 'running');
  result := public.import_time_entries(tenant, actor, batch, true);
  ASSERT (result->>'errorCount')::integer = 1, 'running clock overlap missed';
  UPDATE public.time_entries SET status = 'completed', clock_out = '2026-01-13T08:30:00Z'
    WHERE tenant_id = tenant AND status = 'running';
  batch := jsonb_set(jsonb_set(batch, '{0,clock_in}', '"2026-01-13T08:30:00Z"'), '{0,clock_out}', '"2026-01-13T09:00:00Z"');
  result := public.import_time_entries(tenant, actor, batch, true);
  ASSERT (result->>'importedCount')::integer = 1, 'adjacent interval rejected';
  UPDATE public.time_entries SET deleted_at = now() WHERE tenant_id = tenant AND clock_in = '2026-01-13T08:30:00Z';
  result := public.import_time_entries(tenant, actor, batch, true);
  ASSERT (result->>'importedCount')::integer = 1, 'soft-deleted entry blocked import';

  BEGIN
    PERFORM public.import_time_entries(tenant, employee, batch, true);
    RAISE EXCEPTION 'employee role was authorized';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Transfer administration before testing the former admin's import access.
  UPDATE public.employees SET role = 'admin' WHERE id = employee;
  UPDATE public.employees SET role = 'employee' WHERE id = actor;
  BEGIN
    PERFORM public.import_time_entries(tenant, actor, batch, true);
    RAISE EXCEPTION 'demoted actor was authorized';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SELECT count(*) INTO n FROM public.time_entry_audit WHERE tenant_id = tenant;
  ASSERT n = 3, 'wrong audit count';
  ASSERT NOT has_function_privilege('anon', 'public.import_time_entries(uuid,uuid,jsonb,boolean)', 'EXECUTE'), 'anon can call RPC';
  ASSERT NOT has_function_privilege('authenticated', 'public.import_time_entries(uuid,uuid,jsonb,boolean)', 'EXECUTE'), 'authenticated can bypass API';
END;
$$;

-- Prove that a failure to write the audit rolls back the entry insert too.
CREATE FUNCTION pg_temp.reject_import_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'simulated audit failure'; END;
$$;
CREATE TRIGGER test_reject_import_audit BEFORE INSERT ON public.time_entry_audit
  FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_import_audit();
DO $$
DECLARE
  tenant uuid := gen_random_uuid();
  actor uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.tenants (id, name) VALUES (tenant, 'Atomic rollback test');
  INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, role)
    VALUES (actor, tenant, gen_random_uuid(), 'Admin', 'Test', actor || '@import.test', 'admin');
  BEGIN
    PERFORM public.import_time_entries(tenant, actor, jsonb_build_array(jsonb_build_object(
      'row', 2, 'employee_id', actor, 'date', '2026-01-12', 'clock_in', '2026-01-12T07:00:00Z',
      'clock_out', '2026-01-12T08:00:00Z', 'break_minutes', 0)), true);
    RAISE EXCEPTION 'expected audit failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'simulated audit failure' THEN RAISE; END IF;
  END;
  ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id = tenant) = 0, 'unaudited entry survived';
END;
$$;
ROLLBACK;
