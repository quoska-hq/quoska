-- Synthetic fixtures cover the effective-dated history and project roles.
BEGIN;
INSERT INTO public.tenants (id, name) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Target test'),
  ('c1000000-0000-4000-8000-000000000002', 'Other team');
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('c2000000-0000-4000-8000-000000000001', 'project-target-admin@example.test', now()),
  ('c2000000-0000-4000-8000-000000000002', 'project-target-manager@example.test', now()),
  ('c2000000-0000-4000-8000-000000000003', 'project-target-employee@example.test', now()),
  ('c2000000-0000-4000-8000-000000000004', 'project-target-other@example.test', now());
INSERT INTO public.employees (id, tenant_id, user_id, first_name, last_name, email, role) VALUES
  ('c3000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000001', 'Test', 'Admin', 'project-target-admin@example.test', 'admin'),
  ('c3000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000002', 'Test', 'Manager', 'project-target-manager@example.test', 'manager'),
  ('c3000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001',
    'c2000000-0000-4000-8000-000000000003', 'Test', 'Employee', 'project-target-employee@example.test', 'employee'),
  ('c3000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000002',
    'c2000000-0000-4000-8000-000000000004', 'Other', 'Admin', 'project-target-other@example.test', 'admin');
INSERT INTO public.projects (id, tenant_id, name) VALUES
  ('c4000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'First project'),
  ('c4000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'Second project'),
  ('c4000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 'Other project');

SELECT set_config('request.jwt.claims','{"sub":"c2000000-0000-4000-8000-000000000001","app_metadata":{"tenant_id":"c1000000-0000-4000-8000-000000000001","employee_id":"c3000000-0000-4000-8000-000000000001","role":"admin"}}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  team uuid := 'c1000000-0000-4000-8000-000000000001';
  project uuid := 'c4000000-0000-4000-8000-000000000001';
  second_project uuid := 'c4000000-0000-4000-8000-000000000002';
  foreign_project uuid := 'c4000000-0000-4000-8000-000000000003';
  worker uuid := 'c3000000-0000-4000-8000-000000000003';
  admin_id uuid := 'c3000000-0000-4000-8000-000000000001';
  foreign_person uuid := 'c3000000-0000-4000-8000-000000000004';
  today date := (statement_timestamp() AT TIME ZONE 'Europe/Berlin')::date;
BEGIN
  BEGIN
    PERFORM public.set_project_weekly_target(team, project, worker, today, 240);
    RAISE EXCEPTION 'unassigned target accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN
    PERFORM public.set_project_weekly_target(team, foreign_project, worker, today, 240);
    RAISE EXCEPTION 'foreign project accepted';
  EXCEPTION WHEN no_data_found THEN NULL; END;

  PERFORM public.replace_project_assignments(team, project, ARRAY[worker, admin_id]);
  PERFORM public.replace_project_assignments(team, second_project, ARRAY[worker]);
  PERFORM public.set_project_weekly_target(team, project, worker, today - 14, 240);
  PERFORM public.set_project_weekly_target(team, project, worker, today - 14, 255);
  PERFORM public.set_project_weekly_target(team, project, worker, today + 8, 600);
  PERFORM public.set_project_weekly_target(team, project, admin_id, today - 14, 120);
  PERFORM public.set_project_weekly_target(team, second_project, worker, today - 14, 360);
  PERFORM public.set_project_weekly_target(team, second_project, worker, today + 8, 420);
  ASSERT (SELECT count(*) FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = worker AND effective_from = today - 14) = 1;
  ASSERT (SELECT weekly_minutes FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = worker AND effective_from = today - 14) = 255;

  PERFORM public.replace_project_assignments(team, project, ARRAY[worker, admin_id]);
  BEGIN
    PERFORM public.replace_project_assignments(team, project, ARRAY[foreign_person]);
    RAISE EXCEPTION 'invalid replacement accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  ASSERT (SELECT count(*) FROM public.project_assignments WHERE project_id = project) = 2;
  ASSERT EXISTS (SELECT FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = worker AND effective_from = today + 8 AND cancelled_at IS NULL);

  PERFORM public.replace_project_assignments(team, project, ARRAY[admin_id]);
  PERFORM public.replace_project_assignments(team, project, ARRAY[worker, admin_id]);
  ASSERT (SELECT weekly_minutes FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = worker AND effective_from = today) = 0;
  ASSERT EXISTS (SELECT FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = worker AND effective_from = today + 8 AND cancelled_at IS NOT NULL);
  ASSERT (SELECT count(*) FROM public.project_weekly_targets WHERE project_id = project AND employee_id = admin_id) = 1;
  ASSERT (SELECT count(*) FROM public.project_weekly_targets
    WHERE project_id = second_project AND employee_id = worker AND cancelled_at IS NULL) = 2;

  UPDATE public.projects SET active = false WHERE id = project;
  ASSERT (SELECT weekly_minutes FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = admin_id AND effective_from = today) = 0;
  BEGIN
    PERFORM public.set_project_weekly_target(team, project, worker, today, 240);
    RAISE EXCEPTION 'target on inactive project accepted';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  UPDATE public.projects SET active = true WHERE id = project;
  PERFORM public.set_project_weekly_target(team, project, admin_id, today + 9, 120);
  PERFORM public.replace_project_assignments(team, project, ARRAY[]::uuid[]);
  ASSERT (SELECT count(*) FROM public.project_assignments WHERE project_id = project) = 0;
  ASSERT EXISTS (SELECT FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = admin_id AND effective_from = today + 9 AND cancelled_at IS NOT NULL);
  BEGIN
    UPDATE public.project_weekly_targets SET weekly_minutes = 30 WHERE project_id = project;
    RAISE EXCEPTION 'direct target update accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"sub":"c2000000-0000-4000-8000-000000000002","app_metadata":{"tenant_id":"c1000000-0000-4000-8000-000000000001","employee_id":"c3000000-0000-4000-8000-000000000002","role":"admin"}}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.project_weekly_targets) > 0;
  BEGIN
    PERFORM public.set_project_weekly_target(
      'c1000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000002',
      'c3000000-0000-4000-8000-000000000003', current_date, 240);
    RAISE EXCEPTION 'manager target update accepted under stale admin claim';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  DELETE FROM public.project_assignments WHERE project_id = 'c4000000-0000-4000-8000-000000000002';
  ASSERT NOT FOUND;
END $$;
RESET ROLE;

-- The Auth subject is authoritative even if the cached role and employee ID are stale.
SELECT set_config('request.jwt.claims','{"sub":"c2000000-0000-4000-8000-000000000003","app_metadata":{"tenant_id":"c1000000-0000-4000-8000-000000000001","employee_id":"c3000000-0000-4000-8000-000000000001","role":"admin"}}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  worker uuid := 'c3000000-0000-4000-8000-000000000003';
BEGIN
  ASSERT EXISTS (SELECT FROM public.project_weekly_targets WHERE employee_id = worker AND weekly_minutes > 0);
  ASSERT NOT EXISTS (SELECT FROM public.project_weekly_targets
    WHERE employee_id <> worker OR cancelled_at IS NOT NULL);
  BEGIN
    PERFORM public.set_project_weekly_target(
      'c1000000-0000-4000-8000-000000000001', 'c4000000-0000-4000-8000-000000000002',
      worker, current_date, 360);
    RAISE EXCEPTION 'own target mutation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"sub":"c2000000-0000-4000-8000-000000000004","app_metadata":{"tenant_id":"c1000000-0000-4000-8000-000000000002","employee_id":"c3000000-0000-4000-8000-000000000004","role":"admin"}}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN ASSERT (SELECT count(*) FROM public.project_weekly_targets) = 0; END $$;
RESET ROLE;

UPDATE public.employees SET deleted_at = now() WHERE id = 'c3000000-0000-4000-8000-000000000003';
SELECT set_config('request.jwt.claims','{"sub":"c2000000-0000-4000-8000-000000000003","app_metadata":{"tenant_id":"c1000000-0000-4000-8000-000000000001","employee_id":"c3000000-0000-4000-8000-000000000003","role":"employee"}}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN ASSERT (SELECT count(*) FROM public.project_weekly_targets) = 0; END $$;
RESET ROLE;
DO $$
DECLARE
  worker uuid := 'c3000000-0000-4000-8000-000000000003';
  project uuid := 'c4000000-0000-4000-8000-000000000002';
  today date := (statement_timestamp() AT TIME ZONE 'Europe/Berlin')::date;
BEGIN
  ASSERT EXISTS (SELECT FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = worker AND effective_from = today AND weekly_minutes = 0);
  ASSERT EXISTS (SELECT FROM public.project_weekly_targets
    WHERE project_id = project AND employee_id = worker AND effective_from = today + 8 AND cancelled_at IS NOT NULL);
  DELETE FROM public.projects WHERE id = project;
  ASSERT NOT EXISTS (SELECT FROM public.project_weekly_targets WHERE project_id = project);
END;
$$;
ROLLBACK;
