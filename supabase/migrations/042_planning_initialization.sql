-- Create the version row before reading source data; first-time setup also needs concurrency protection.
CREATE FUNCTION public.planning_initialize() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tenant uuid;
BEGIN
  SELECT tenant_id INTO tenant FROM public.employees WHERE user_id = auth.uid() AND deleted_at IS NULL AND role IN ('admin','manager');
  IF tenant IS NULL THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.planning_workspaces(tenant_id) VALUES(tenant) ON CONFLICT DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.planning_initialize() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.planning_initialize() TO authenticated;

CREATE FUNCTION public.planning_holidays_changed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.planning_workspaces SET version = version+1,updated_at = now() WHERE deleted_at IS NULL;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.planning_holidays_changed() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER planning_holiday_changed AFTER INSERT OR UPDATE OR DELETE ON public.public_holidays FOR EACH STATEMENT EXECUTE FUNCTION public.planning_holidays_changed();
