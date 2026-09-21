-- Functional onboarding state. Existing tenants/profiles remain unchanged until
-- an administrator answers, dismisses the guide or exports a report.
ALTER TABLE public.tenants
  ADD COLUMN planned_team_size TEXT CHECK (planned_team_size IN ('1-3', '4-10', '11-50', '51+')),
  ADD COLUMN first_report_export_at TIMESTAMPTZ;
ALTER TABLE public.employees ADD COLUMN start_guide_dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.planned_team_size IS 'Optional intended number of people using Quoska; not the current profile count.';
COMMENT ON COLUMN public.tenants.first_report_export_at IS 'First successfully generated non-empty report since migration 036; not proof of a download or payroll handoff.';
