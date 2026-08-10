-- Store the employee's contractual target per weekday. This is the canonical
-- source for overtime, missing entries and absence-day calculations.

ALTER TABLE public.employees
  ALTER COLUMN target_hours_week TYPE NUMERIC(5,2)
  USING target_hours_week::NUMERIC(5,2);

ALTER TABLE public.employees
  ADD COLUMN work_schedule JSONB;

ALTER TABLE public.tenants
  ADD COLUMN default_work_schedule JSONB NOT NULL DEFAULT
    '{"monday":480,"tuesday":480,"wednesday":480,"thursday":480,"friday":480,"saturday":0,"sunday":0}'::JSONB;

UPDATE public.employees
SET work_schedule = jsonb_build_object(
  'monday', ROUND(target_hours_week * 60 / 5)::INTEGER,
  'tuesday', ROUND(target_hours_week * 60 / 5)::INTEGER,
  'wednesday', ROUND(target_hours_week * 60 / 5)::INTEGER,
  'thursday', ROUND(target_hours_week * 60 / 5)::INTEGER,
  'friday', ROUND(target_hours_week * 60 / 5)::INTEGER,
  'saturday', 0,
  'sunday', 0
);

ALTER TABLE public.employees
  ALTER COLUMN work_schedule SET DEFAULT
    '{"monday":480,"tuesday":480,"wednesday":480,"thursday":480,"friday":480,"saturday":0,"sunday":0}'::JSONB,
  ALTER COLUMN work_schedule SET NOT NULL;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_work_schedule_valid CHECK (
    jsonb_typeof(work_schedule) = 'object'
    AND work_schedule ?& ARRAY[
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    ]
    AND (work_schedule ->> 'monday')::INTEGER BETWEEN 0 AND 600
    AND (work_schedule ->> 'tuesday')::INTEGER BETWEEN 0 AND 600
    AND (work_schedule ->> 'wednesday')::INTEGER BETWEEN 0 AND 600
    AND (work_schedule ->> 'thursday')::INTEGER BETWEEN 0 AND 600
    AND (work_schedule ->> 'friday')::INTEGER BETWEEN 0 AND 600
    AND (work_schedule ->> 'saturday')::INTEGER BETWEEN 0 AND 600
    AND (work_schedule ->> 'sunday')::INTEGER BETWEEN 0 AND 600
    AND (
      (work_schedule ->> 'monday')::INTEGER
      + (work_schedule ->> 'tuesday')::INTEGER
      + (work_schedule ->> 'wednesday')::INTEGER
      + (work_schedule ->> 'thursday')::INTEGER
      + (work_schedule ->> 'friday')::INTEGER
      + (work_schedule ->> 'saturday')::INTEGER
      + (work_schedule ->> 'sunday')::INTEGER
    ) BETWEEN 1 AND 2880
  );

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_default_work_schedule_valid CHECK (
    jsonb_typeof(default_work_schedule) = 'object'
    AND default_work_schedule ?& ARRAY[
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    ]
    AND (default_work_schedule ->> 'monday')::INTEGER BETWEEN 0 AND 600
    AND (default_work_schedule ->> 'tuesday')::INTEGER BETWEEN 0 AND 600
    AND (default_work_schedule ->> 'wednesday')::INTEGER BETWEEN 0 AND 600
    AND (default_work_schedule ->> 'thursday')::INTEGER BETWEEN 0 AND 600
    AND (default_work_schedule ->> 'friday')::INTEGER BETWEEN 0 AND 600
    AND (default_work_schedule ->> 'saturday')::INTEGER BETWEEN 0 AND 600
    AND (default_work_schedule ->> 'sunday')::INTEGER BETWEEN 0 AND 600
    AND (
      (default_work_schedule ->> 'monday')::INTEGER
      + (default_work_schedule ->> 'tuesday')::INTEGER
      + (default_work_schedule ->> 'wednesday')::INTEGER
      + (default_work_schedule ->> 'thursday')::INTEGER
      + (default_work_schedule ->> 'friday')::INTEGER
      + (default_work_schedule ->> 'saturday')::INTEGER
      + (default_work_schedule ->> 'sunday')::INTEGER
    ) BETWEEN 1 AND 2880
  );

CREATE OR REPLACE FUNCTION public.sync_employee_weekly_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.target_hours_week := (
    (NEW.work_schedule ->> 'monday')::NUMERIC
    + (NEW.work_schedule ->> 'tuesday')::NUMERIC
    + (NEW.work_schedule ->> 'wednesday')::NUMERIC
    + (NEW.work_schedule ->> 'thursday')::NUMERIC
    + (NEW.work_schedule ->> 'friday')::NUMERIC
    + (NEW.work_schedule ->> 'saturday')::NUMERIC
    + (NEW.work_schedule ->> 'sunday')::NUMERIC
  ) / 60;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_employee_weekly_target_before_write
  BEFORE INSERT OR UPDATE OF work_schedule ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.sync_employee_weekly_target();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  company_name TEXT;
  founder_first_name TEXT;
  founder_last_name TEXT;
  new_tenant_id UUID;
BEGIN
  company_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'company_name'), '');

  IF company_name IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  founder_first_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'first_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'Profil'
  );
  founder_last_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'last_name'), ''),
    ''
  );

  INSERT INTO public.tenants (name, plan, setup_complete)
  VALUES (company_name, 'free', FALSE)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.employees (
    tenant_id, user_id, first_name, last_name, email, role,
    target_hours_week
  ) VALUES (
    new_tenant_id, NEW.id, founder_first_name, founder_last_name,
    NEW.email, 'admin', 40
  );

  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.employees.work_schedule IS
  'Contract target minutes by weekday; canonical source for target calculations.';
COMMENT ON COLUMN public.tenants.default_work_schedule IS
  'Default contract schedule preselected for new employees.';
COMMENT ON COLUMN public.employees.target_hours_week IS
  'Derived weekly target in hours, synchronized from work_schedule.';
