-- Keep future contractual changes separate from the previously used legacy model.
ALTER TABLE public.employees ADD COLUMN employment_schedule jsonb;
ALTER TABLE public.employees ADD CONSTRAINT employee_dated_schedule_object CHECK (
  employment_schedule IS NULL OR (jsonb_typeof(employment_schedule)='object'
    AND jsonb_typeof(employment_schedule->'baseline')='object'
    AND jsonb_typeof(employment_schedule->'changes')='array'));

CREATE FUNCTION public.employee_preserve_schedule_history() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE today text := to_char(timezone('Europe/Berlin',now()),'YYYY-MM-DD'); changes jsonb;
BEGIN
  IF NEW.employment_schedule IS DISTINCT FROM OLD.employment_schedule
    AND current_setting('role',true) NOT IN ('service_role','none')
    THEN RAISE EXCEPTION 'employment_history_forbidden' USING ERRCODE='42501'; END IF;
  IF OLD.employment_schedule IS NOT NULL AND NEW.work_schedule IS DISTINCT FROM OLD.work_schedule THEN
    SELECT COALESCE(jsonb_agg(c ORDER BY c->>'from'),'[]') INTO changes
      FROM jsonb_array_elements(OLD.employment_schedule->'changes') c WHERE c->>'from' <> today;
    changes := changes || jsonb_build_array(jsonb_build_object('from',today,'schedule',NEW.work_schedule));
    SELECT jsonb_agg(c ORDER BY c->>'from') INTO changes FROM jsonb_array_elements(changes) c;
    NEW.employment_schedule := jsonb_build_object('baseline',OLD.employment_schedule->'baseline','changes',changes);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER employee_preserve_schedule_history BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.employee_preserve_schedule_history();

CREATE FUNCTION public.planning_sync_contracts(p_tenant uuid,p_profiles jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE profile jsonb; person public.employees; changes jsonb;
  today text := to_char(timezone('Europe/Berlin',now()),'YYYY-MM-DD');
BEGIN
  FOR profile IN SELECT value FROM jsonb_array_elements(p_profiles) LOOP
    SELECT * INTO person FROM public.employees WHERE tenant_id=p_tenant AND id=(profile->>'employeeId')::uuid AND deleted_at IS NULL FOR UPDATE;
    IF person.id IS NULL THEN RAISE EXCEPTION 'planning_invalid'; END IF;
    changes := COALESCE(profile->'contractChanges','[]'::jsonb);
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(person.employment_schedule->'changes','[]'::jsonb)) old
      WHERE old->>'from' <= today AND NOT changes @> jsonb_build_array(old))
      OR EXISTS (SELECT 1 FROM jsonb_array_elements(changes) c WHERE c->>'from' <= today
        AND NOT COALESCE(person.employment_schedule->'changes','[]'::jsonb) @> jsonb_build_array(c))
      THEN RAISE EXCEPTION 'planning_contract_history_locked'; END IF;
    IF changes <> COALESCE(person.employment_schedule->'changes','[]'::jsonb) THEN
      UPDATE public.employees SET employment_schedule=jsonb_build_object(
        'baseline',COALESCE(person.employment_schedule->'baseline',person.work_schedule),'changes',changes),updated_at=now()
        WHERE tenant_id=p_tenant AND id=person.id;
    END IF;
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.planning_sync_contracts(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.planning_sync_contracts(uuid,jsonb) TO service_role;
