-- Provision email/password signups inside Postgres so the public registration
-- endpoint never needs to trust a caller-supplied auth user ID.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  company_name TEXT;
  new_tenant_id UUID;
BEGIN
  company_name := NULLIF(BTRIM(NEW.raw_user_meta_data ->> 'company_name'), '');

  -- Invitations and OAuth identities without a company name are provisioned
  -- by their existing authenticated flows.
  IF company_name IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tenants (name, plan, setup_complete)
  VALUES (company_name, 'free', FALSE)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.employees (
    tenant_id,
    user_id,
    first_name,
    last_name,
    email,
    role,
    target_hours_week
  ) VALUES (
    new_tenant_id,
    NEW.id,
    'Admin',
    '',
    NEW.email,
    'admin',
    40
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
