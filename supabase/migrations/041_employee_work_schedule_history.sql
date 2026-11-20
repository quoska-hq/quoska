ALTER TABLE public.employees
  ADD COLUMN work_schedule_history JSONB NOT NULL DEFAULT '{}'::JSONB;

COMMENT ON COLUMN public.employees.work_schedule IS
  'Original contractual target minutes by weekday, used before the first dated change.';
COMMENT ON COLUMN public.employees.work_schedule_history IS
  'Contractual schedules keyed by their inclusive effective date (YYYY-MM-DD).';
COMMENT ON COLUMN public.employees.target_hours_week IS
  'Weekly target in hours for the original work_schedule.';

CREATE FUNCTION public.employee_work_schedule_history_valid(p_history JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  change RECORD;
  day TEXT;
  minutes INTEGER;
  total INTEGER;
  weekdays CONSTANT TEXT[] := ARRAY[
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];
BEGIN
  IF jsonb_typeof(p_history) <> 'object' THEN RETURN FALSE; END IF;

  FOR change IN SELECT * FROM jsonb_each(p_history) LOOP
    IF change.key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       OR to_char(change.key::DATE, 'YYYY-MM-DD') <> change.key
       OR jsonb_typeof(change.value) <> 'object'
       OR NOT (change.value ?& weekdays)
       OR (change.value - weekdays) <> '{}'::JSONB THEN
      RETURN FALSE;
    END IF;

    total := 0;
    FOREACH day IN ARRAY weekdays LOOP
      IF jsonb_typeof(change.value -> day) <> 'number'
         OR (change.value ->> day) !~ '^[0-9]{1,3}$' THEN
        RETURN FALSE;
      END IF;
      minutes := (change.value ->> day)::INTEGER;
      IF minutes > 600 THEN RETURN FALSE; END IF;
      total := total + minutes;
    END LOOP;
    IF total NOT BETWEEN 1 AND 2880 THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
  RETURN FALSE;
END;
$$;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_work_schedule_history_valid
  CHECK (public.employee_work_schedule_history_valid(work_schedule_history));

CREATE OR REPLACE FUNCTION public.update_employee_work_schedule(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_schedule JSONB,
  p_effective_from DATE,
  p_profile JSONB
)
RETURNS public.employees
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  employee public.employees;
  profile public.employees;
  starts_on DATE;
  entitlement JSONB := p_profile -> 'leave_entitlement';
BEGIN
  SELECT * INTO employee FROM public.employees
  WHERE tenant_id = p_tenant_id AND id = p_employee_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  profile := jsonb_populate_record(employee, p_profile);
  starts_on := COALESCE(
    p_effective_from,
    GREATEST((now() AT TIME ZONE 'Europe/Berlin')::DATE, profile.employment_start_date)
  );
  IF p_schedule IS NOT NULL AND starts_on < profile.employment_start_date THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'work_schedule_before_employment';
  END IF;

  UPDATE public.employees AS e SET
    first_name = profile.first_name,
    last_name = profile.last_name,
    role = profile.role,
    employment_start_date = profile.employment_start_date,
    initial_overtime_minutes = profile.initial_overtime_minutes,
    bundesland = profile.bundesland,
    work_schedule_history = CASE WHEN p_schedule IS NULL THEN e.work_schedule_history
      ELSE e.work_schedule_history || jsonb_build_object(to_char(starts_on, 'YYYY-MM-DD'), p_schedule) END
  WHERE e.tenant_id = p_tenant_id AND e.id = p_employee_id
  RETURNING e.* INTO employee;
  IF entitlement IS NOT NULL THEN
    IF NOT COALESCE((entitlement->>'total_days')::integer BETWEEN 1 AND 40
      AND (entitlement->>'carried_over')::integer BETWEEN 0 AND 20, false) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid_leave_entitlement';
    END IF;
    INSERT INTO public.leave_entitlements (tenant_id, employee_id, year, total_days, carried_over)
    VALUES (p_tenant_id, p_employee_id, EXTRACT(YEAR FROM now() AT TIME ZONE 'Europe/Berlin'),
      (entitlement->>'total_days')::integer, (entitlement->>'carried_over')::integer)
    ON CONFLICT (employee_id, year) DO UPDATE SET total_days = EXCLUDED.total_days,
      carried_over = EXCLUDED.carried_over, updated_at = now();
  END IF;
  RETURN employee;
END;
$$;

REVOKE ALL ON FUNCTION public.update_employee_work_schedule(UUID, UUID, JSONB, DATE, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_employee_work_schedule(UUID, UUID, JSONB, DATE, JSONB)
  TO service_role;
