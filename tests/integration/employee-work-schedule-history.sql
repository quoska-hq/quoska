-- Exercise permissions and persistence through the real function.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
  ('e4100000-0000-4000-8000-000000000001', 'schedule-history@example.test');
INSERT INTO public.tenants (id, name) VALUES
  ('e4100000-0000-4000-8000-000000000002', 'Schedule history test');
INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, employment_start_date)
VALUES (
  'e4100000-0000-4000-8000-000000000003', 'e4100000-0000-4000-8000-000000000002',
  'e4100000-0000-4000-8000-000000000001', 'Test', 'Person', 'schedule-history@example.test', DATE '2026-01-01'
);

SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.update_employee_work_schedule(NULL, NULL, NULL, NULL, '{}'::JSONB);
    RAISE EXCEPTION 'authenticated role changed a schedule directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $$
DECLARE
  team UUID := 'e4100000-0000-4000-8000-000000000002';
  person UUID := 'e4100000-0000-4000-8000-000000000003';
  result public.employees;
  schedule JSONB := '{"monday":360,"tuesday":360,"wednesday":360,"thursday":360,"friday":360,"saturday":0,"sunday":0}';
BEGIN
  result := public.update_employee_work_schedule(team, person, schedule, DATE '2026-10-01',
    '{"first_name":"Geändert","leave_entitlement":{"total_days":10,"carried_over":2}}');
  ASSERT result.work_schedule ->> 'monday' = '480';
  ASSERT result.target_hours_week = 40;
  ASSERT result.work_schedule_history -> '2026-10-01' = schedule;
  ASSERT result.first_name = 'Geändert';
  ASSERT (SELECT total_days = 10 AND carried_over = 2 FROM public.leave_entitlements WHERE employee_id = person);

  result := public.update_employee_work_schedule(team, person, schedule, DATE '2027-01-01', '{}');
  ASSERT result.work_schedule_history ?& ARRAY['2026-10-01', '2027-01-01'];
  ASSERT result.first_name = 'Geändert';
  ASSERT public.update_employee_work_schedule(gen_random_uuid(), person, schedule, DATE '2028-01-01', '{}') IS NULL;

  BEGIN
    PERFORM public.update_employee_work_schedule(team, person, schedule, DATE '2025-01-01', '{}');
    RAISE EXCEPTION 'schedule was added before employment started';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  BEGIN
    PERFORM public.update_employee_work_schedule(team, person, schedule - 'monday', DATE '2028-01-01', '{"first_name":"Ungültig"}');
    RAISE EXCEPTION 'incomplete schedule was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  BEGIN
    PERFORM public.update_employee_work_schedule(team, person, schedule, DATE '2028-01-01',
      '{"first_name":"Ungültig","leave_entitlement":{"total_days":0,"carried_over":0}}');
    RAISE EXCEPTION 'invalid leave entitlement was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;

  SELECT * INTO result FROM public.employees WHERE id = person;
  ASSERT result.first_name = 'Geändert';
  ASSERT result.work_schedule_history = jsonb_build_object('2026-10-01', schedule, '2027-01-01', schedule);
  ASSERT (SELECT total_days = 10 AND carried_over = 2 FROM public.leave_entitlements WHERE employee_id = person);
END $$;
RESET ROLE;

ROLLBACK;
