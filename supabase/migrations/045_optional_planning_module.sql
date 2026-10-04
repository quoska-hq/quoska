-- Module status exposes no planning configuration or colleague data.
CREATE FUNCTION public.planning_module_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tenant uuid; result jsonb;
BEGIN
  SELECT tenant_id INTO tenant FROM public.employees WHERE user_id=auth.uid() AND deleted_at IS NULL;
  IF tenant IS NULL THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE='42501'; END IF;
  SELECT jsonb_build_object('enabled',COALESCE((config->>'enabled')::boolean,false),'version',version)
    INTO result FROM public.planning_workspaces WHERE tenant_id=tenant AND deleted_at IS NULL;
  RETURN COALESCE(result,jsonb_build_object('enabled',false,'version',0));
END; $$;
REVOKE ALL ON FUNCTION public.planning_module_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.planning_module_status() TO authenticated,service_role;

-- Toggle only the module flag, retaining plans and contractual schedules.
CREATE FUNCTION public.planning_set_enabled(p_user uuid,p_version bigint,p_enabled boolean) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor public.employees; workspace public.planning_workspaces; snapshot jsonb;
BEGIN
  SELECT * INTO actor FROM public.employees WHERE user_id=p_user AND deleted_at IS NULL AND role IN ('admin','manager');
  IF actor.id IS NULL THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE='42501'; END IF;
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'planning_invalid'; END IF;
  INSERT INTO public.planning_workspaces(tenant_id) VALUES(actor.tenant_id) ON CONFLICT DO NOTHING;
  SELECT * INTO workspace FROM public.planning_workspaces WHERE tenant_id=actor.tenant_id AND deleted_at IS NULL FOR UPDATE;
  IF workspace.version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'planning_conflict' USING ERRCODE='40001'; END IF;
  IF (workspace.config->>'enabled')::boolean=p_enabled THEN
    RETURN jsonb_build_object('enabled',p_enabled,'version',p_version);
  END IF;
  UPDATE public.planning_workspaces SET config=jsonb_set(config,'{enabled}',to_jsonb(p_enabled)),
    version=p_version+1,updated_at=now() WHERE tenant_id=actor.tenant_id RETURNING * INTO workspace;
  IF NOT p_enabled THEN
    UPDATE public.planning_jobs SET status='expired',lease_token=NULL,lease_until=NULL,updated_at=now()
      WHERE tenant_id=actor.tenant_id AND status IN ('queued','running','completed') AND deleted_at IS NULL;
  END IF;
  SELECT jsonb_build_object('config',workspace.config,'periods',COALESCE(jsonb_agg(state ORDER BY month),'[]'::jsonb))
    INTO snapshot FROM public.planning_periods WHERE tenant_id=actor.tenant_id AND deleted_at IS NULL;
  INSERT INTO public.planning_revisions(tenant_id,actor_id,version,action,reason,rule_profile,snapshot)
    VALUES(actor.tenant_id,actor.id,p_version+1,'module',
      CASE WHEN p_enabled THEN 'Dienstplanung aktiviert' ELSE 'Dienstplanung deaktiviert' END,
      'DE-adult-standard-8h-v1',snapshot);
  RETURN jsonb_build_object('enabled',p_enabled,'version',p_version+1);
END; $$;
REVOKE ALL ON FUNCTION public.planning_set_enabled(uuid,bigint,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.planning_set_enabled(uuid,bigint,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.planning_my_schedule() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('enabled',true,'locations',w.config->'locations','skills',w.config->'skills',
    'preferredDays',COALESCE((SELECT p->'preferredDays' FROM jsonb_array_elements(w.config->'profiles') p WHERE p->>'employeeId'=e.id::text),'[]'::jsonb),
    'periods',COALESCE((SELECT jsonb_agg(jsonb_build_object('month',p.month,'status',p.state->>'status',
      'revision',p.state->'revision','shifts',COALESCE((SELECT jsonb_agg(s) FROM jsonb_array_elements(p.state->'publishedShifts') s
        WHERE s->>'employeeId'=e.id::text),'[]'::jsonb))) FROM public.planning_periods p
      WHERE p.tenant_id=e.tenant_id AND p.deleted_at IS NULL AND p.state->>'status' IN ('announced','fixed')
      AND p.month>=date_trunc('month',now() AT TIME ZONE 'Europe/Berlin')::date),'[]'::jsonb))
  FROM public.employees e JOIN public.planning_workspaces w ON w.tenant_id=e.tenant_id AND w.deleted_at IS NULL
  WHERE e.user_id=auth.uid() AND e.deleted_at IS NULL AND w.config->>'enabled'='true';
$$;

CREATE OR REPLACE FUNCTION public.planning_swap_options() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',s->>'id','employeeId',colleague.id,
    'name',colleague.first_name || ' ' || colleague.last_name,'date',s->>'date','start',s->>'start',
    'end',s->>'end','locationId',s->>'locationId')),'[]'::jsonb)
  FROM public.employees viewer JOIN public.planning_workspaces w ON w.tenant_id=viewer.tenant_id
    JOIN public.planning_periods p ON p.tenant_id=viewer.tenant_id,
    LATERAL jsonb_array_elements(p.state->'publishedShifts') s
    JOIN public.employees colleague ON colleague.id=(s->>'employeeId')::uuid AND colleague.deleted_at IS NULL
  WHERE viewer.user_id=auth.uid() AND viewer.deleted_at IS NULL AND colleague.tenant_id=viewer.tenant_id
    AND w.deleted_at IS NULL AND w.config->>'enabled'='true'
    AND p.deleted_at IS NULL AND p.state->>'status' IN ('announced','fixed') AND (s->>'start')::timestamptz>now();
$$;
