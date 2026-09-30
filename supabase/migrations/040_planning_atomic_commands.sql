ALTER TABLE public.notifications ADD COLUMN planning_event_key text;
CREATE UNIQUE INDEX planning_notification_dedupe ON public.notifications(tenant_id,employee_id,planning_event_key) WHERE planning_event_key IS NOT NULL;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'forgot_clockout','break_reminder','automatic_break_added','manual_time_added','correction_request',
  'correction_approved','correction_rejected','leave_request','leave_approved','leave_rejected','planning_published','planning_swap'));

CREATE FUNCTION public.planning_commit(p_tenant uuid, p_user uuid, p_version bigint,
  p_state jsonb, p_action text, p_reason text, p_job uuid DEFAULT NULL, p_swap uuid DEFAULT NULL) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid; current_version bigint; period jsonb; previous jsonb; revision_id uuid := gen_random_uuid();
BEGIN
  SELECT id INTO actor FROM public.employees WHERE tenant_id = p_tenant AND user_id = p_user
    AND deleted_at IS NULL AND role IN ('admin','manager');
  IF actor IS NULL THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.planning_workspaces(tenant_id) VALUES (p_tenant) ON CONFLICT DO NOTHING;
  SELECT version INTO current_version FROM public.planning_workspaces WHERE tenant_id = p_tenant AND deleted_at IS NULL FOR UPDATE;
  IF current_version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'planning_conflict' USING ERRCODE = '40001'; END IF;
  IF jsonb_typeof(p_state->'config') <> 'object' OR jsonb_typeof(p_state->'periods') <> 'array'
    OR jsonb_array_length(p_state->'periods') > 6 THEN RAISE EXCEPTION 'planning_invalid'; END IF;
  IF p_job IS NOT NULL THEN
    PERFORM 1 FROM public.planning_jobs WHERE id = p_job AND tenant_id = p_tenant AND input_version = p_version AND status = 'completed' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'planning_job_stale' USING ERRCODE = '40001'; END IF;
    UPDATE public.planning_jobs SET status = 'applied', updated_at = now() WHERE id = p_job AND tenant_id = p_tenant;
  END IF;
  IF p_swap IS NOT NULL THEN
    PERFORM 1 FROM public.planning_swaps WHERE id = p_swap AND tenant_id = p_tenant AND status = 'accepted' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'planning_swap_stale' USING ERRCODE = '40001'; END IF;
    UPDATE public.planning_swaps SET status = 'approved', updated_at = now() WHERE id = p_swap AND tenant_id = p_tenant;
  END IF;
  IF p_action = 'configure' THEN PERFORM public.planning_sync_contracts(p_tenant,p_state->'config'->'profiles'); END IF;
  -- Source invalidation from contract updates is covered by this atomic revision.
  UPDATE public.planning_workspaces SET config = p_state->'config', version = p_version + 1, updated_at = now() WHERE tenant_id = p_tenant;
  FOR period IN SELECT value FROM jsonb_array_elements(p_state->'periods') LOOP
    SELECT state INTO previous FROM public.planning_periods WHERE tenant_id = p_tenant AND month = (period->>'month')::date;
    INSERT INTO public.planning_periods(tenant_id,month,state) VALUES(p_tenant,(period->>'month')::date,period)
      ON CONFLICT (tenant_id,month) DO UPDATE SET state = EXCLUDED.state, updated_at = now();
    IF COALESCE((previous->>'revision')::integer,0) <> (period->>'revision')::integer THEN
      INSERT INTO public.notifications(tenant_id,employee_id,type,title,message,planning_event_key)
        SELECT DISTINCT p_tenant,(s->>'employeeId')::uuid,'planning_published','Dienstplan aktualisiert',
          'Der Dienstplan für ' || to_char((period->>'month')::date,'MM.YYYY') || ' wurde freigegeben. Deine Dienste findest du unter Meine Dienste.',
          revision_id::text || ':' || (period->>'month')
        FROM jsonb_array_elements(COALESCE(previous->'publishedShifts','[]'::jsonb) || (period->'publishedShifts')) s
        WHERE s->>'employeeId' IS NOT NULL ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  INSERT INTO public.planning_revisions(id,tenant_id,actor_id,version,action,reason,rule_profile,snapshot)
    VALUES(revision_id,p_tenant,actor,p_version+1,p_action,p_reason,'DE-adult-standard-8h-v1',p_state);
  RETURN p_version+1;
END; $$;
REVOKE ALL ON FUNCTION public.planning_commit(uuid,uuid,bigint,jsonb,text,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planning_commit(uuid,uuid,bigint,jsonb,text,text,uuid,uuid) TO service_role;

CREATE FUNCTION public.planning_enqueue(p_tenant uuid, p_user uuid, p_version bigint,p_month date,p_payload jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result uuid; current_version bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE tenant_id = p_tenant AND user_id = p_user AND deleted_at IS NULL AND role IN ('admin','manager'))
    THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE = '42501'; END IF;
  SELECT version INTO current_version FROM public.planning_workspaces WHERE tenant_id = p_tenant AND deleted_at IS NULL FOR UPDATE;
  IF current_version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'planning_conflict' USING ERRCODE = '40001'; END IF;
  UPDATE public.planning_jobs SET status = 'expired',updated_at = now() WHERE tenant_id = p_tenant AND status IN ('queued','running')
    AND (input_version <> p_version OR (lease_until IS NOT NULL AND lease_until < now()));
  INSERT INTO public.planning_jobs(tenant_id,month,input_version,payload) VALUES(p_tenant,p_month,p_version,p_payload) RETURNING id INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.planning_enqueue(uuid,uuid,bigint,date,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planning_enqueue(uuid,uuid,bigint,date,jsonb) TO service_role;

CREATE FUNCTION public.planning_claim_job() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE job public.planning_jobs; token uuid := gen_random_uuid();
BEGIN
  UPDATE public.planning_jobs SET status = 'expired',updated_at = now() WHERE status = 'running' AND lease_until < now();
  SELECT * INTO job FROM public.planning_jobs WHERE status = 'queued' AND deleted_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.planning_jobs SET status = 'running',lease_token = token,lease_until = now()+interval '3 minutes',attempts = attempts+1,updated_at = now() WHERE id = job.id;
  RETURN jsonb_build_object('id',job.id,'leaseToken',token,'payload',job.payload);
END; $$;
CREATE FUNCTION public.planning_finish_job(p_job uuid,p_lease uuid,p_result jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.planning_jobs SET result = p_result,status = 'completed',updated_at = now()
    WHERE id = p_job AND lease_token = p_lease AND status = 'running' AND lease_until > now();
  RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.planning_claim_job(), public.planning_finish_job(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planning_claim_job(), public.planning_finish_job(uuid,uuid,jsonb) TO service_role;
