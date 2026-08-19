-- Employee balance baseline for installations that start tracking after an
-- employment relationship has already begun.

ALTER TABLE public.employees
  ADD COLUMN employment_start_date DATE,
  ADD COLUMN initial_overtime_minutes INTEGER NOT NULL DEFAULT 0;

UPDATE public.employees
SET employment_start_date = (created_at AT TIME ZONE 'Europe/Berlin')::DATE
WHERE employment_start_date IS NULL;

ALTER TABLE public.employees
  ALTER COLUMN employment_start_date SET NOT NULL,
  ALTER COLUMN employment_start_date SET DEFAULT
    ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Berlin')::DATE),
  ADD CONSTRAINT employees_initial_overtime_minutes_valid CHECK (
    initial_overtime_minutes BETWEEN -600000 AND 600000
  );

COMMENT ON COLUMN public.employees.employment_start_date IS
  'First date on which contractual target time accrues for this employee.';
COMMENT ON COLUMN public.employees.initial_overtime_minutes IS
  'Opening overtime balance in minutes, added to tracked overtime.';
