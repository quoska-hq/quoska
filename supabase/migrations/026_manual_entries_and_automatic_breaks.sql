-- Manual completed entries and transparent automatic statutory break booking.

ALTER TABLE public.tenants
  ADD COLUMN automatic_breaks_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.time_entries
  ADD COLUMN automatic_break_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (automatic_break_minutes >= 0),
  ADD COLUMN entry_source TEXT NOT NULL DEFAULT 'clock'
    CHECK (entry_source IN ('clock', 'manual'));

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_automatic_break_subset
  CHECK (automatic_break_minutes <= break_minutes);

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'forgot_clockout',
    'break_reminder',
    'automatic_break_added',
    'manual_time_added',
    'correction_request',
    'correction_approved',
    'correction_rejected',
    'leave_request',
    'leave_approved',
    'leave_rejected'
  ));

COMMENT ON COLUMN public.tenants.automatic_breaks_enabled IS
  'When enabled, missing statutory minimum break minutes are visibly added when an entry is completed.';
COMMENT ON COLUMN public.time_entries.automatic_break_minutes IS
  'Subset of break_minutes added by the automatic statutory-break rule; always visible and auditable.';
COMMENT ON COLUMN public.time_entries.entry_source IS
  'Whether the completed entry originated from live clocking or a manual addition.';
