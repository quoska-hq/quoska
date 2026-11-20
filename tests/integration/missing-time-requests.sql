-- Synthetic fixtures only. Verify real permissions and transactional writes.
BEGIN;
INSERT INTO public.tenants(id,name) VALUES
 ('af000000-0000-4000-8000-000000000001','Missing time test'),
 ('af000000-0000-4000-8000-000000000002','Other missing time test');
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('aa000000-0000-4000-8000-000000000001','request-employee@example.test',now()),
 ('aa000000-0000-4000-8000-000000000002','request-manager@example.test',now()),
 ('aa000000-0000-4000-8000-000000000003','request-admin@example.test',now()),
 ('aa000000-0000-4000-8000-000000000004','other-manager@example.test',now());
INSERT INTO public.employees(id,tenant_id,user_id,first_name,last_name,email,role) VALUES
 ('ae000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001','Test','Employee','request-employee@example.test','employee'),
 ('ae000000-0000-4000-8000-000000000002','af000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000002','Test','Manager','request-manager@example.test','manager'),
 ('ae000000-0000-4000-8000-000000000003','af000000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000003','Test','Admin','request-admin@example.test','admin'),
 ('ae000000-0000-4000-8000-000000000004','af000000-0000-4000-8000-000000000002','aa000000-0000-4000-8000-000000000004','Other','Manager','other-manager@example.test','manager');
UPDATE public.employees SET employment_start_date='2026-01-01'
 WHERE tenant_id IN ('af000000-0000-4000-8000-000000000001','af000000-0000-4000-8000-000000000002');

INSERT INTO public.correction_requests(id,tenant_id,employee_id,time_entry_id,request_type,proposed_change,reason)
SELECT ('ac000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
 'af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001',null,'missing_entry',
 jsonb_build_object('date','2026-10-20','clock_in','2026-10-20T06:00:00.000Z',
  'clock_out',CASE WHEN n=2 THEN '2026-10-20T16:00:00.000Z' ELSE '2026-10-20T15:00:00.000Z' END,
  'break_minutes',30,'automatic_break_minutes',30,'notes','Forgotten shift'), 'Stempeln vergessen'
 FROM generate_series(1,2) n;
INSERT INTO public.correction_requests(id,tenant_id,employee_id,time_entry_id,request_type,proposed_change,reason)
VALUES ('ac000000-0000-4000-8000-000000000003','af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001',null,'missing_entry',
 '{"date":"2026-10-21","clock_in":"2026-10-21T06:00:00.000Z","clock_out":"2026-10-21T15:00:00.000Z","break_minutes":30,"automatic_break_minutes":0}', 'Weiterer Nachtrag');
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id='af000000-0000-4000-8000-000000000001')=0;
END $$;

-- A real employee can read their proposal but cannot call approval or directly
-- mark it approved. A different tenant cannot read it.
SELECT set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"tenant_id":"af000000-0000-4000-8000-000000000001","employee_id":"ae000000-0000-4000-8000-000000000001","role":"employee"}}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.correction_requests)=3;
 BEGIN
  PERFORM public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','approve');
  RAISE EXCEPTION 'employee approval allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 UPDATE public.correction_requests SET status='rejected';
 ASSERT NOT FOUND;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"sub":"aa000000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"tenant_id":"af000000-0000-4000-8000-000000000002","employee_id":"ae000000-0000-4000-8000-000000000004","role":"manager"}}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 ASSERT (SELECT count(*) FROM public.correction_requests)=0;
END $$;
RESET ROLE;

-- Even a privileged server call must verify the reviewer's current tenant role.
DO $$ BEGIN
 BEGIN
  PERFORM public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000004','ac000000-0000-4000-8000-000000000001','approve');
  RAISE EXCEPTION 'cross-tenant approval allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','approve');
  RAISE EXCEPTION 'employee server approval allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

SET LOCAL ROLE service_role;
SELECT public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000001','approve');
RESET ROLE;
DO $$ DECLARE v_error text; BEGIN
 ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id='af000000-0000-4000-8000-000000000001')=1;
 ASSERT EXISTS (SELECT 1 FROM public.time_entries WHERE employee_id='ae000000-0000-4000-8000-000000000001'
   AND date='2026-10-20' AND entry_source='manual' AND automatic_break_minutes=30);
 ASSERT EXISTS (SELECT 1 FROM public.time_entry_audit WHERE tenant_id='af000000-0000-4000-8000-000000000001'
   AND changed_by='ae000000-0000-4000-8000-000000000002' AND action='create' AND new_value LIKE '%requested_by%');
 BEGIN
  PERFORM public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000003','ac000000-0000-4000-8000-000000000001','approve');
  RAISE EXCEPTION 'second approval allowed';
 EXCEPTION WHEN raise_exception THEN GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
  ASSERT v_error LIKE '%bereits bearbeitet%'; END;
 BEGIN
  PERFORM public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000003','ac000000-0000-4000-8000-000000000002','approve');
  RAISE EXCEPTION 'overlap approval allowed';
 EXCEPTION WHEN raise_exception THEN GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
  ASSERT v_error LIKE '%überschneidet%'; END;
 ASSERT (SELECT status FROM public.correction_requests WHERE id='ac000000-0000-4000-8000-000000000002')='pending';
 ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id='af000000-0000-4000-8000-000000000001')=1;
END $$;

-- Rejection creates no entry or audit row. It preserves the reviewer response.
SELECT public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000003','ac000000-0000-4000-8000-000000000003','reject','Bitte Datum prüfen');
DO $$ BEGIN
 ASSERT EXISTS (SELECT 1 FROM public.correction_requests WHERE id='ac000000-0000-4000-8000-000000000003'
  AND status='rejected' AND time_entry_id IS NULL AND review_note='Bitte Datum prüfen');
 ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id='af000000-0000-4000-8000-000000000001')=1;
END $$;

-- A failure to write the audit must also roll back the entry and the decision.
INSERT INTO public.correction_requests(id,tenant_id,employee_id,time_entry_id,request_type,proposed_change,reason)
VALUES ('ac000000-0000-4000-8000-000000000004','af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000001',null,'missing_entry',
 '{"date":"2026-10-22","clock_in":"2026-10-22T06:00:00.000Z","clock_out":"2026-10-22T15:00:00.000Z","break_minutes":30,"automatic_break_minutes":0}', 'Nachtrag mit Audit');
CREATE FUNCTION pg_temp.fail_request_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.tenant_id='af000000-0000-4000-8000-000000000001' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER missing_time_audit_failure BEFORE INSERT ON public.time_entry_audit
 FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_request_audit();
DO $$ DECLARE v_error text; BEGIN
 BEGIN
  PERFORM public.review_missing_time_request('af000000-0000-4000-8000-000000000001','ae000000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000004','approve');
  RAISE EXCEPTION 'audit failure ignored';
 EXCEPTION WHEN raise_exception THEN GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
  ASSERT v_error = 'synthetic audit failure'; END;
 ASSERT (SELECT status FROM public.correction_requests WHERE id='ac000000-0000-4000-8000-000000000004')='pending';
 ASSERT (SELECT count(*) FROM public.time_entries WHERE tenant_id='af000000-0000-4000-8000-000000000001')=1;
END $$;
ROLLBACK;
