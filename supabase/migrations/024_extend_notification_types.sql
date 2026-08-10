-- Migration: 024_extend_notification_types
-- Vacation workflows already emit these notification types. Keep the
-- database constraint aligned with the application-level type union.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'forgot_clockout',
    'break_reminder',
    'correction_request',
    'correction_approved',
    'correction_rejected',
    'leave_request',
    'leave_approved',
    'leave_rejected'
  ));
