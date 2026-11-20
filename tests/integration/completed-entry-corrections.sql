BEGIN;
INSERT INTO public.tenants (id, name) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'Correction test'),
  ('b1000000-0000-4000-8000-000000000002', 'Other team');
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'entry-correction-employee@example.test', now()),
  ('b2000000-0000-4000-8000-000000000002', 'entry-correction-manager@example.test', now());
INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, role, employment_start_date) VALUES
  ('b3000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000001', 'Test', 'Employee', 'entry-correction-employee@example.test', 'employee', '2026-01-01'),
  ('b3000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000002', 'Test', 'Manager', 'entry-correction-manager@example.test', 'manager', '2026-01-01');
INSERT INTO public.projects (id, tenant_id, name) VALUES
  ('b4000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'First project'),
  ('b4000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', 'Second project'),
  ('b4000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000002', 'Other project');
INSERT INTO public.time_entries (id, tenant_id, employee_id, date, status, clock_in, clock_out, break_minutes, project_id) VALUES
  ('b5000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001',
    'b3000000-0000-4000-8000-000000000001', '2026-10-01', 'completed', '2026-10-01 06:00Z', '2026-10-01 10:00Z', 15, NULL),
  ('b5000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001',
    'b3000000-0000-4000-8000-000000000001', '2026-10-01', 'completed', '2026-10-01 10:00Z', '2026-10-01 15:00Z', 15,
    'b4000000-0000-4000-8000-000000000002');
INSERT INTO public.correction_requests (tenant_id, employee_id, time_entry_id, proposed_change, reason)
  VALUES ('b1000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001',
    'b5000000-0000-4000-8000-000000000001', '{"notes":"Geplante Korrektur"}', 'Geplante Korrektur');

SELECT set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000001","app_metadata":{"tenant_id":"b1000000-0000-4000-8000-000000000001","employee_id":"b3000000-0000-4000-8000-000000000001","role":"employee"}}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  t uuid := 'b1000000-0000-4000-8000-000000000001';
  e uuid := 'b3000000-0000-4000-8000-000000000001';
  a uuid := 'b5000000-0000-4000-8000-000000000001';
BEGIN
  BEGIN
    PERFORM public.correct_completed_time_entry(t, e, a, 'Doppelte Buchung', p_cancel => true);
    RAISE EXCEPTION 'employee cancellation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.time_entries SET deleted_at = now() WHERE id = a;
    RAISE EXCEPTION 'unaudited cancellation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.time_entries (tenant_id, employee_id, date, status)
      VALUES (t, e, '2026-09-30', 'completed');
    RAISE EXCEPTION 'unauthorized direct booking accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.time_entries (tenant_id, employee_id, date, status, project_id)
    VALUES (t, e, (now() AT TIME ZONE 'Europe/Berlin')::date, 'running', 'b4000000-0000-4000-8000-000000000002');
  BEGIN
    UPDATE public.time_entries SET date = '2026-09-30' WHERE employee_id = e AND status = 'running';
    RAISE EXCEPTION 'employee live clock start backdated';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.time_entries SET status = 'completed', clock_out = clock_in + interval '1 minute'
    WHERE employee_id = e AND status = 'running';
  ASSERT FOUND;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"sub":"b2000000-0000-4000-8000-000000000002","app_metadata":{"tenant_id":"b1000000-0000-4000-8000-000000000001","employee_id":"b3000000-0000-4000-8000-000000000002","role":"manager"}}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  t uuid := 'b1000000-0000-4000-8000-000000000001';
  m uuid := 'b3000000-0000-4000-8000-000000000002';
  a uuid := 'b5000000-0000-4000-8000-000000000001';
  b uuid := 'b5000000-0000-4000-8000-000000000002';
BEGIN
  BEGIN
    PERFORM public.correct_completed_time_entry(t, m, a, 'Fremdes Projekt', '{"project_id":"b4000000-0000-4000-8000-000000000003"}');
    RAISE EXCEPTION 'cross-tenant project assignment accepted';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM = 'Projekt nicht gefunden'; END;
  PERFORM public.correct_completed_time_entry(t, m, a, 'Projekt ergänzt', '{"project_id":"b4000000-0000-4000-8000-000000000001"}');
  PERFORM public.correct_completed_time_entry(t, m, a, 'Projekt neu zugeordnet', '{"project_id":"b4000000-0000-4000-8000-000000000002"}');
  PERFORM public.correct_completed_time_entry(t, m, a, 'Projekt entfernt', '{"project_id":null}');
  ASSERT (SELECT project_id FROM public.time_entries WHERE id = a) IS NULL;
  ASSERT (SELECT project_id FROM public.time_entries WHERE id = b) = 'b4000000-0000-4000-8000-000000000002';
  ASSERT (SELECT break_minutes FROM public.time_entries WHERE id = a) = 15;
  ASSERT (SELECT count(*) FROM public.time_entry_audit WHERE time_entry_id = a AND field_name = 'project_id') = 3;

  PERFORM public.correct_completed_time_entry(t, m, a, 'Doppelte Buchung', p_cancel => true);
  PERFORM public.correct_completed_time_entry(t, m, a, 'Doppelte Buchung', p_cancel => true);
  ASSERT (SELECT count(*) FROM public.time_entry_audit WHERE time_entry_id = a AND action = 'delete') = 1;
  ASSERT (SELECT deleted_at FROM public.time_entries WHERE id = a) IS NOT NULL;
  ASSERT (SELECT deleted_at FROM public.time_entries WHERE id = b) IS NULL;
  ASSERT (SELECT status FROM public.correction_requests WHERE time_entry_id = a) = 'rejected';
  UPDATE public.time_entries SET notes = 'Alte Bearbeitung' WHERE id = a;
  ASSERT NOT FOUND;
  BEGIN
    PERFORM public.correct_completed_time_entry(t, m, a, 'Alte Bearbeitung', '{"notes":"Rückgängig"}');
    RAISE EXCEPTION 'canceled entry updated';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE '%bereits storniert%'; END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $$
DECLARE
  t uuid := 'b1000000-0000-4000-8000-000000000001';
  e uuid := 'b3000000-0000-4000-8000-000000000001';
  p jsonb := '{"date":"2026-10-02","clock_in":"2026-10-02T06:00:00Z","clock_out":"2026-10-02T14:00:00Z","break_minutes":30,"automatic_break_minutes":0}';
  v_queued jsonb;
  v_booked jsonb;
BEGIN
  v_queued := public.submit_missing_time_request(t, e, p, 'Stempeln vergessen');
  ASSERT v_queued->>'status' = 'pending' AND v_queued->>'time_entry_id' IS NULL;
  UPDATE public.tenants SET missing_time_approval_required = false WHERE id = t;
  BEGIN
    PERFORM public.submit_missing_time_request(t, e, p, 'Gleicher Zeitraum');
    RAISE EXCEPTION 'overlapping pending request bypassed';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE '%bereits eine Nachtragsanfrage offen%'; END;
  p := '{"date":"2026-10-03","clock_in":"2026-10-03T06:00:00Z","clock_out":"2026-10-03T14:00:00Z","break_minutes":30,"automatic_break_minutes":0}';
  v_booked := public.submit_missing_time_request(t, e, p, 'Stempeln vergessen');
  ASSERT v_booked->>'status' = 'approved' AND v_booked->>'reviewed_by' IS NULL;
  ASSERT (SELECT status FROM public.time_entries WHERE id = (v_booked->>'time_entry_id')::uuid) = 'completed';
  ASSERT (SELECT status FROM public.correction_requests WHERE id = (v_queued->>'id')::uuid) = 'pending';
  ASSERT EXISTS (SELECT FROM public.time_entry_audit WHERE time_entry_id = (v_booked->>'time_entry_id')::uuid
    AND changed_by = e AND action = 'create' AND reason LIKE '%Stempeln vergessen');
  BEGIN
    PERFORM public.submit_missing_time_request(t, e, p, 'Doppelte Buchung');
    RAISE EXCEPTION 'overlapping direct booking accepted';
  EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE '%überschneidet%'; END;
END;
$$;
ROLLBACK;
