CREATE FUNCTION public.planning_set_preferences(p_user uuid,p_days jsonb) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.employees; new_config jsonb; current_version bigint; profile_index integer;
BEGIN
  SELECT * INTO actor FROM public.employees WHERE user_id = p_user AND deleted_at IS NULL;
  IF actor.id IS NULL OR jsonb_typeof(p_days) <> 'array' OR jsonb_array_length(p_days) > 7
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_days) d WHERE d::text !~ '^[0-6]$')
    OR (SELECT count(DISTINCT d) FROM jsonb_array_elements(p_days) d) <> jsonb_array_length(p_days)
    THEN RAISE EXCEPTION 'planning_invalid_preferences'; END IF;
  SELECT w.config,w.version INTO new_config,current_version FROM public.planning_workspaces w
    WHERE w.tenant_id = actor.tenant_id AND w.deleted_at IS NULL FOR UPDATE;
  SELECT (ordinality-1)::integer INTO profile_index FROM jsonb_array_elements(new_config->'profiles') WITH ORDINALITY p
    WHERE p.value->>'employeeId' = actor.id::text;
  IF profile_index IS NULL OR new_config->>'enabled' <> 'true' THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE = '42501'; END IF;
  new_config := jsonb_set(new_config, ARRAY['profiles',profile_index::text,'preferredDays'],p_days);
  UPDATE public.planning_workspaces SET config = new_config,version = version+1,updated_at = now() WHERE tenant_id = actor.tenant_id;
  INSERT INTO public.planning_revisions(tenant_id,actor_id,version,action,reason,rule_profile,snapshot)
    VALUES(actor.tenant_id,actor.id,current_version+1,'preferences','','DE-adult-standard-8h-v1',jsonb_build_object('employeeId',actor.id,'preferredDays',p_days));
  RETURN current_version+1;
END; $$;
REVOKE ALL ON FUNCTION public.planning_set_preferences(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planning_set_preferences(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.planning_claim_job() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE job public.planning_jobs; token uuid := gen_random_uuid();
BEGIN
  UPDATE public.planning_jobs j SET status = 'expired',updated_at = now() FROM public.planning_workspaces w
    WHERE j.tenant_id = w.tenant_id AND j.status IN ('queued','running') AND (j.input_version <> w.version OR w.deleted_at IS NOT NULL);
  UPDATE public.planning_jobs SET status = CASE WHEN attempts < 3 THEN 'queued' ELSE 'expired' END,
    lease_token = NULL,lease_until = NULL,updated_at = now() WHERE status = 'running' AND lease_until < now();
  SELECT * INTO job FROM public.planning_jobs WHERE status = 'queued' AND deleted_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.planning_jobs SET status = 'running',lease_token = token,lease_until = now()+interval '3 minutes',attempts = attempts+1,updated_at = now() WHERE id = job.id;
  RETURN jsonb_build_object('id',job.id,'leaseToken',token,'payload',job.payload);
END; $$;
CREATE OR REPLACE FUNCTION public.planning_finish_job(p_job uuid,p_lease uuid,p_result jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.planning_jobs WHERE id = p_job AND lease_token = p_lease AND status = 'completed' AND result = p_result) THEN RETURN true; END IF;
  UPDATE public.planning_jobs SET result = p_result,status = 'completed',updated_at = now()
    WHERE id = p_job AND lease_token = p_lease AND status = 'running' AND lease_until > now();
  RETURN FOUND;
END; $$;
