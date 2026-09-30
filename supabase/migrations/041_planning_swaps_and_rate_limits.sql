ALTER TABLE public.planning_swaps ADD COLUMN source_snapshot jsonb NOT NULL;
ALTER TABLE public.planning_swaps ADD COLUMN target_snapshot jsonb NOT NULL;

CREATE FUNCTION public.planning_swap_options() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',s->>'id','employeeId',colleague.id,
    'name',colleague.first_name || ' ' || colleague.last_name,'date',s->>'date','start',s->>'start',
    'end',s->>'end','locationId',s->>'locationId')),'[]'::jsonb)
  FROM public.employees viewer JOIN public.planning_periods p ON p.tenant_id = viewer.tenant_id,
    LATERAL jsonb_array_elements(p.state->'publishedShifts') s
    JOIN public.employees colleague ON colleague.id = (s->>'employeeId')::uuid AND colleague.deleted_at IS NULL
  WHERE viewer.user_id = auth.uid() AND viewer.deleted_at IS NULL AND colleague.tenant_id = viewer.tenant_id
    AND p.deleted_at IS NULL AND p.state->>'status' IN ('announced','fixed') AND (s->>'start')::timestamptz > now();
$$;
REVOKE ALL ON FUNCTION public.planning_swap_options() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.planning_swap_options() TO authenticated;

CREATE FUNCTION public.planning_swap_command(p_user uuid,p_action text,p_id uuid DEFAULT NULL,p_source uuid DEFAULT NULL,p_target uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.employees; item public.planning_swaps; current_version bigint; source jsonb; target jsonb; result uuid;
BEGIN
  SELECT * INTO actor FROM public.employees WHERE user_id = p_user AND deleted_at IS NULL;
  IF actor.id IS NULL THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE = '42501'; END IF;
  SELECT version INTO current_version FROM public.planning_workspaces WHERE tenant_id = actor.tenant_id FOR UPDATE;
  IF current_version IS NULL THEN RAISE EXCEPTION 'planning_unavailable'; END IF;
  IF p_action = 'request' THEN
    SELECT s INTO source FROM public.planning_periods p,LATERAL jsonb_array_elements(p.state->'publishedShifts') s
      WHERE p.tenant_id = actor.tenant_id AND p.deleted_at IS NULL AND p.state->>'status' IN ('announced','fixed') AND s->>'id' = p_source::text;
    SELECT s INTO target FROM public.planning_periods p,LATERAL jsonb_array_elements(p.state->'publishedShifts') s
      WHERE p.tenant_id = actor.tenant_id AND p.deleted_at IS NULL AND p.state->>'status' IN ('announced','fixed') AND s->>'id' = p_target::text;
    IF source IS NULL OR target IS NULL OR source->>'employeeId' <> actor.id::text OR target->>'employeeId' = actor.id::text
      OR (source->>'start')::timestamptz <= now() OR (target->>'start')::timestamptz <= now() THEN RAISE EXCEPTION 'planning_invalid_swap'; END IF;
    IF EXISTS (SELECT 1 FROM public.planning_swaps WHERE tenant_id = actor.tenant_id AND status IN ('requested','accepted')
      AND (source_shift_id IN (p_source,p_target) OR target_shift_id IN (p_source,p_target))) THEN RAISE EXCEPTION 'planning_swap_pending' USING ERRCODE = '40001'; END IF;
    INSERT INTO public.planning_swaps(tenant_id,source_shift_id,target_shift_id,requester_id,recipient_id,version,source_snapshot,target_snapshot)
      VALUES(actor.tenant_id,p_source,p_target,actor.id,(target->>'employeeId')::uuid,current_version,source,target) RETURNING id INTO result;
    INSERT INTO public.notifications(tenant_id,employee_id,type,title,message,planning_event_key)
      VALUES(actor.tenant_id,(target->>'employeeId')::uuid,'planning_swap','Schichttausch angefragt','Eine Tauschanfrage wartet unter Meine Dienste auf deine Antwort.',result::text || ':request');
    RETURN result;
  END IF;
  SELECT * INTO item FROM public.planning_swaps WHERE id = p_id AND tenant_id = actor.tenant_id AND deleted_at IS NULL FOR UPDATE;
  IF item.id IS NULL THEN RAISE EXCEPTION 'planning_forbidden' USING ERRCODE = '42501'; END IF;
  IF p_action = 'accept' AND item.recipient_id = actor.id AND item.status = 'requested' THEN
    UPDATE public.planning_swaps SET status = 'accepted',version = current_version,updated_at = now() WHERE id = item.id;
    INSERT INTO public.notifications(tenant_id,employee_id,type,title,message,planning_event_key)
      SELECT actor.tenant_id,id,'planning_swap','Schichttausch zur Freigabe','Beide Personen haben zugestimmt. Bitte den Tausch in der Dienstplanung prüfen.',item.id::text || ':accepted'
      FROM public.employees WHERE tenant_id = actor.tenant_id AND role IN ('admin','manager') AND deleted_at IS NULL ON CONFLICT DO NOTHING;
  ELSIF p_action = 'cancel' AND item.requester_id = actor.id AND item.status IN ('requested','accepted') THEN
    UPDATE public.planning_swaps SET status = 'cancelled',updated_at = now() WHERE id = item.id;
  ELSIF p_action = 'reject' AND (item.recipient_id = actor.id OR actor.role IN ('admin','manager')) AND item.status IN ('requested','accepted') THEN
    UPDATE public.planning_swaps SET status = 'rejected',updated_at = now() WHERE id = item.id;
  ELSE RAISE EXCEPTION 'planning_forbidden' USING ERRCODE = '42501'; END IF;
  RETURN item.id;
END; $$;
REVOKE ALL ON FUNCTION public.planning_swap_command(uuid,text,uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planning_swap_command(uuid,text,uuid,uuid,uuid) TO service_role;

CREATE TABLE public.planning_rate_limits (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id), employee_id uuid NOT NULL, bucket text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(), requests integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  PRIMARY KEY (tenant_id,employee_id,bucket), FOREIGN KEY (tenant_id,employee_id) REFERENCES public.employees(tenant_id,id)
);
ALTER TABLE public.planning_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.planning_rate_limits FROM anon, authenticated;
CREATE FUNCTION public.planning_take_limit(p_user uuid,p_write boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor public.employees; result integer;
BEGIN
  SELECT * INTO actor FROM public.employees WHERE user_id = p_user AND deleted_at IS NULL;
  IF actor.id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.planning_rate_limits(tenant_id,employee_id,bucket,requests) VALUES(actor.tenant_id,actor.id,CASE WHEN p_write THEN 'write' ELSE 'read' END,1)
    ON CONFLICT (tenant_id,employee_id,bucket) DO UPDATE SET
      requests = CASE WHEN planning_rate_limits.window_start < now()-interval '1 minute' THEN 1 ELSE planning_rate_limits.requests+1 END,
      window_start = CASE WHEN planning_rate_limits.window_start < now()-interval '1 minute' THEN now() ELSE planning_rate_limits.window_start END,
      updated_at = now() RETURNING requests INTO result;
  RETURN result <= CASE WHEN p_write THEN 30 ELSE 120 END;
END; $$;
REVOKE ALL ON FUNCTION public.planning_take_limit(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.planning_take_limit(uuid,boolean) TO service_role;
