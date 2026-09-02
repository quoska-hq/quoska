-- Persist privacy-safe signup attribution and per-employee promotion dismissal.

ALTER TABLE public.tenants
  ADD COLUMN signup_attribution JSONB;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_signup_attribution_object
  CHECK (
    signup_attribution IS NULL
    OR jsonb_typeof(signup_attribution) = 'object'
  );

ALTER TABLE public.employees
  ADD COLUMN browser_extension_promo_dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.signup_attribution IS
  'Privacy-safe first/last-touch and signup CTA metadata captured during founder onboarding; never contains an IP address or raw referrer URL.';

COMMENT ON COLUMN public.employees.browser_extension_promo_dismissed_at IS
  'When set, the optional browser-extension promotion stays dismissed for this employee on every device.';
