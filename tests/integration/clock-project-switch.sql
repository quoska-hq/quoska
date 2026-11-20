BEGIN;

INSERT INTO public.tenants (id, name) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'Clock switch test'),
  ('e1000000-0000-4000-8000-000000000002', 'Other team');
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('e2000000-0000-4000-8000-000000000001', 'switch-clock@example.test', now()),
  ('e2000000-0000-4000-8000-000000000002', 'switch-clock-other@example.test', now());
INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email) VALUES
  ('e3000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001', 'Switch', 'Clock', 'switch-clock@example.test'),
  ('e3000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000002', 'Other', 'Employee', 'switch-clock-other@example.test');
INSERT INTO public.projects (id, tenant_id, name, active) VALUES
  ('e4000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', 'Old', true),
  ('e4000000-0000-4000-8000-000000000002', 'e1000000-0000-4000-8000-000000000001', 'New', true),
  ('e4000000-0000-4000-8000-000000000003', 'e1000000-0000-4000-8000-000000000001', 'Unassigned', true),
  ('e4000000-0000-4000-8000-000000000004', 'e1000000-0000-4000-8000-000000000001', 'Inactive', false),
  ('e4000000-0000-4000-8000-000000000005', 'e1000000-0000-4000-8000-000000000002', 'Foreign', true),
  ('e4000000-0000-4000-8000-000000000006', 'e1000000-0000-4000-8000-000000000001', 'Rollback', true);
INSERT INTO public.project_assignments (tenant_id, employee_id, project_id)
  SELECT tenant_id, 'e3000000-0000-4000-8000-000000000001', id FROM public.projects
    WHERE id IN ('e4000000-0000-4000-8000-000000000001', 'e4000000-0000-4000-8000-000000000002',
      'e4000000-0000-4000-8000-000000000004', 'e4000000-0000-4000-8000-000000000006');

INSERT INTO public.time_entries (id, tenant_id, employee_id, date, clock_in, project_id, notes, break_minutes)
VALUES ('e5000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001',
  'e3000000-0000-4000-8000-000000000001', ((now() - interval '7 hours') AT TIME ZONE 'Europe/Berlin')::date,
  now() - interval '7 hours', 'e4000000-0000-4000-8000-000000000001', 'Original note', 20);
INSERT INTO public.break_sessions (tenant_id, time_entry_id, break_start, break_end, duration_minutes)
VALUES ('e1000000-0000-4000-8000-000000000001', 'e5000000-0000-4000-8000-000000000001',
  now() - interval '5 hours', now() - interval '4 hours 40 minutes', 20);

CREATE FUNCTION pg_temp.fail_test_successor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.project_id = 'e4000000-0000-4000-8000-000000000006' THEN
    RAISE EXCEPTION 'Forced successor insert failure' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fail_test_successor BEFORE INSERT ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_test_successor();

SELECT set_config('request.jwt.claims', '{"sub":"e2000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"tenant_id":"e1000000-0000-4000-8000-000000000001","employee_id":"e3000000-0000-4000-8000-000000000001","role":"employee"}}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  team uuid := 'e1000000-0000-4000-8000-000000000001';
  worker uuid := 'e3000000-0000-4000-8000-000000000001';
  old_entry uuid := 'e5000000-0000-4000-8000-000000000001';
  old_project uuid := 'e4000000-0000-4000-8000-000000000001';
  new_project uuid := 'e4000000-0000-4000-8000-000000000002';
  next_project uuid;
  finished public.time_entries;
  successor public.time_entries;
BEGIN
  FOREACH next_project IN ARRAY ARRAY['e4000000-0000-4000-8000-000000000003',
    'e4000000-0000-4000-8000-000000000004', 'e4000000-0000-4000-8000-000000000005']::uuid[] LOOP
    BEGIN
      PERFORM public.transition_clock_project(team, worker, old_entry, next_project);
      RAISE EXCEPTION 'Unavailable project accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
  BEGIN
    PERFORM public.transition_clock_project(team, 'e3000000-0000-4000-8000-000000000002', old_entry, new_project);
    RAISE EXCEPTION 'Foreign employee accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.time_entries SET clock_session_id = old_entry, clock_session_started_at = now() WHERE id = old_entry;
    RAISE EXCEPTION 'Client wrote protected session metadata';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  UPDATE public.time_entries SET status = 'paused' WHERE id = old_entry;
  BEGIN
    PERFORM public.transition_clock_project(team, worker, old_entry, new_project);
    RAISE EXCEPTION 'Paused clock switched' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  UPDATE public.time_entries SET status = 'running' WHERE id = old_entry;

  BEGIN
    PERFORM public.transition_clock_project(team, worker, old_entry, old_project);
    RAISE EXCEPTION 'Same project accepted' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  BEGIN
    PERFORM public.transition_clock_project(team, worker, old_entry, 'e4000000-0000-4000-8000-000000000006');
    RAISE EXCEPTION 'Successor failure test did not fail';
  EXCEPTION WHEN check_violation THEN NULL; END;
  ASSERT (SELECT status = 'running' AND clock_out IS NULL AND clock_session_id IS NULL
    FROM public.time_entries WHERE id = old_entry);
  ASSERT NOT EXISTS (SELECT FROM public.time_entry_audit WHERE time_entry_id = old_entry);

  ASSERT public.transition_clock_project(team, worker, old_entry, new_project) = '{"success":true}'::jsonb;
  SELECT * INTO STRICT finished FROM public.time_entries WHERE id = old_entry;
  SELECT * INTO STRICT successor FROM public.time_entries WHERE employee_id = worker AND status = 'running';
  ASSERT finished.status = 'completed' AND finished.project_id = old_project;
  ASSERT finished.break_minutes = 20 AND finished.automatic_break_minutes = 0 AND finished.notes = 'Original note';
  ASSERT successor.project_id = new_project AND successor.break_minutes = 0 AND successor.notes IS NULL;
  ASSERT finished.clock_out = successor.clock_in AND successor.date = (successor.clock_in AT TIME ZONE 'Europe/Berlin')::date;
  ASSERT finished.clock_session_id = old_entry AND successor.clock_session_id = old_entry;
  ASSERT finished.clock_session_started_at = finished.clock_in AND successor.clock_session_started_at = finished.clock_in;
  ASSERT (SELECT count(*) FROM public.break_sessions WHERE time_entry_id = old_entry) = 1;
  ASSERT (SELECT count(*) FROM public.time_entry_audit WHERE time_entry_id IN (old_entry, successor.id)) = 3;

  BEGIN
    PERFORM public.transition_clock_project(team, worker, old_entry, old_project);
    RAISE EXCEPTION 'Stale switch accepted';
  EXCEPTION WHEN no_data_found THEN NULL; END;
END;
$$;

RESET ROLE;
UPDATE public.time_entries SET clock_session_started_at = now() - interval '11 hours'
  WHERE clock_session_id = 'e5000000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  worker uuid := 'e3000000-0000-4000-8000-000000000001';
  successor_id uuid;
BEGIN
  SELECT id INTO STRICT successor_id FROM public.time_entries WHERE employee_id = worker AND status = 'running';
  BEGIN
    PERFORM public.transition_clock_project('e1000000-0000-4000-8000-000000000001', worker,
      successor_id, 'e4000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Clock review could be bypassed by switching projects' USING ERRCODE = 'XX000';
  EXCEPTION WHEN raise_exception THEN NULL; END;
  ASSERT (SELECT status = 'running' AND clock_out IS NULL FROM public.time_entries WHERE id = successor_id);
END;
$$;

RESET ROLE;
-- A segment of 1m40s can hold only one whole minute of break.
UPDATE public.time_entries SET clock_out = clock_out - interval '100 seconds'
  WHERE id = 'e5000000-0000-4000-8000-000000000001';
UPDATE public.time_entries SET clock_in = clock_in - interval '100 seconds'
  WHERE clock_session_id = 'e5000000-0000-4000-8000-000000000001' AND status = 'running';

-- The extension uses a server-verified service-role client for clock-out.
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;
DO $$
DECLARE
  team uuid := 'e1000000-0000-4000-8000-000000000001';
  worker uuid := 'e3000000-0000-4000-8000-000000000001';
  session_id uuid := 'e5000000-0000-4000-8000-000000000001';
  successor_id uuid;
  result jsonb;
BEGIN
  SELECT id INTO STRICT successor_id FROM public.time_entries WHERE employee_id = worker AND status = 'running';
  result := public.transition_clock_project(team, worker, successor_id, NULL);
  ASSERT result->>'status' = 'completed' AND (result->>'automatic_break_minutes')::int = 1;
  ASSERT (SELECT sum(break_minutes) FROM public.time_entries WHERE clock_session_id = session_id) = 30;
  ASSERT (SELECT automatic_break_minutes FROM public.time_entries WHERE id = session_id) = 9;
  ASSERT NOT EXISTS (SELECT FROM public.time_entries WHERE clock_session_id = session_id
    AND break_minutes * interval '1 minute' >= clock_out - clock_in);
  ASSERT (SELECT count(*) FROM public.notifications WHERE employee_id = worker AND type = 'automatic_break_added') = 1;
  ASSERT (SELECT count(*) FROM public.time_entry_audit WHERE time_entry_id IN (session_id, successor_id)) = 6;
  BEGIN
    PERFORM public.transition_clock_project(team, worker, successor_id, NULL);
    RAISE EXCEPTION 'Completed clock-out accepted';
  EXCEPTION WHEN no_data_found THEN NULL; END;
END;
$$;

ROLLBACK;
