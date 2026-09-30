-- Planning reads use live employee authorization rather than cached JWT roles.
CREATE FUNCTION public.planning_is_manager(p_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees WHERE user_id = auth.uid()
    AND tenant_id = p_tenant AND role IN ('admin','manager') AND deleted_at IS NULL);
$$;
REVOKE ALL ON FUNCTION public.planning_is_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.planning_is_manager(uuid) TO authenticated, service_role;

CREATE TABLE public.planning_workspaces (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id),
  version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
  config jsonb NOT NULL DEFAULT '{"firstMonth":null,"enabled":false,"locations":[],"skills":[],"profiles":[],"templates":[],"demands":[],"travelMinutes":30}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE public.planning_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.planning_workspaces(tenant_id),
  month date NOT NULL CHECK (extract(day FROM month) = 1),
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  UNIQUE (tenant_id, month), UNIQUE (tenant_id, id)
);
CREATE TABLE public.planning_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.planning_workspaces(tenant_id),
  actor_id uuid NOT NULL, version bigint NOT NULL, action text NOT NULL, reason text NOT NULL,
  rule_profile text NOT NULL, snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  FOREIGN KEY (tenant_id, actor_id) REFERENCES public.employees(tenant_id, id), UNIQUE (tenant_id, version)
);
CREATE TABLE public.planning_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.planning_workspaces(tenant_id),
  month date NOT NULL, input_version bigint NOT NULL, payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','expired','applied')),
  result jsonb, lease_token uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  FOREIGN KEY (tenant_id, month) REFERENCES public.planning_periods(tenant_id, month), UNIQUE (tenant_id, id)
);
CREATE UNIQUE INDEX planning_one_active_job ON public.planning_jobs(tenant_id) WHERE status IN ('queued','running') AND deleted_at IS NULL;
CREATE INDEX planning_job_queue ON public.planning_jobs(created_at) WHERE status = 'queued' AND deleted_at IS NULL;
CREATE TABLE public.planning_swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.planning_workspaces(tenant_id),
  source_shift_id uuid NOT NULL, target_shift_id uuid NOT NULL, requester_id uuid NOT NULL, recipient_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','approved','rejected','cancelled')),
  version bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
  FOREIGN KEY (tenant_id, requester_id) REFERENCES public.employees(tenant_id, id),
  FOREIGN KEY (tenant_id, recipient_id) REFERENCES public.employees(tenant_id, id),
  CHECK (requester_id <> recipient_id), CHECK (source_shift_id <> target_shift_id)
);

ALTER TABLE public.planning_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY planning_workspace_read ON public.planning_workspaces FOR SELECT TO authenticated USING (deleted_at IS NULL AND public.planning_is_manager(tenant_id));
CREATE POLICY planning_period_read ON public.planning_periods FOR SELECT TO authenticated USING (deleted_at IS NULL AND public.planning_is_manager(tenant_id));
CREATE POLICY planning_revision_read ON public.planning_revisions FOR SELECT TO authenticated USING (public.planning_is_manager(tenant_id));
CREATE POLICY planning_job_read ON public.planning_jobs FOR SELECT TO authenticated USING (deleted_at IS NULL AND public.planning_is_manager(tenant_id));
CREATE POLICY planning_swap_read ON public.planning_swaps FOR SELECT TO authenticated USING (deleted_at IS NULL AND
  (public.planning_is_manager(tenant_id) OR EXISTS (SELECT 1 FROM public.employees e WHERE e.user_id = auth.uid()
    AND e.tenant_id = planning_swaps.tenant_id AND e.id IN (requester_id,recipient_id) AND e.deleted_at IS NULL)));
REVOKE ALL ON public.planning_workspaces, public.planning_periods, public.planning_revisions, public.planning_jobs, public.planning_swaps FROM anon, authenticated;
GRANT SELECT ON public.planning_workspaces, public.planning_periods, public.planning_revisions, public.planning_jobs, public.planning_swaps TO authenticated;
GRANT ALL ON public.planning_workspaces, public.planning_periods, public.planning_jobs, public.planning_swaps TO service_role;
GRANT SELECT, INSERT ON public.planning_revisions TO service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON public.planning_revisions FROM service_role;

-- Relevant source changes invalidate jobs and proposals before they can be committed.
CREATE FUNCTION public.planning_invalidate_source() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.planning_workspaces SET version = version + 1, updated_at = now()
    WHERE tenant_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END AND deleted_at IS NULL;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;
REVOKE ALL ON FUNCTION public.planning_invalidate_source() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER planning_employee_changed AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.planning_invalidate_source();
CREATE TRIGGER planning_leave_changed AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.planning_invalidate_source();
CREATE TRIGGER planning_sick_changed AFTER INSERT OR UPDATE OR DELETE ON public.sick_entries FOR EACH ROW EXECUTE FUNCTION public.planning_invalidate_source();
CREATE TRIGGER planning_actual_changed AFTER INSERT OR UPDATE OR DELETE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.planning_invalidate_source();

-- Employee projection never exposes colleagues' shifts, availability or balances.
CREATE FUNCTION public.planning_my_schedule() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('enabled', COALESCE((w.config->>'enabled')::boolean,false),
    'locations', w.config->'locations', 'skills', w.config->'skills',
    'preferredDays',COALESCE((SELECT p->'preferredDays' FROM jsonb_array_elements(w.config->'profiles') p WHERE p->>'employeeId' = e.id::text),'[]'::jsonb),
    'periods', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', p.month, 'status', p.state->>'status',
      'revision', p.state->'revision', 'shifts', COALESCE((SELECT jsonb_agg(s) FROM jsonb_array_elements(p.state->'publishedShifts') s
        WHERE s->>'employeeId' = e.id::text),'[]'::jsonb))) FROM public.planning_periods p
      WHERE p.tenant_id = e.tenant_id AND p.deleted_at IS NULL AND p.state->>'status' IN ('announced','fixed')
      AND p.month >= date_trunc('month',now() AT TIME ZONE 'Europe/Berlin')::date),'[]'::jsonb))
  FROM public.employees e JOIN public.planning_workspaces w ON w.tenant_id = e.tenant_id AND w.deleted_at IS NULL
  WHERE e.user_id = auth.uid() AND e.deleted_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.planning_my_schedule() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.planning_my_schedule() TO authenticated;
