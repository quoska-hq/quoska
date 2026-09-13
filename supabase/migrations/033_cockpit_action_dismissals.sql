-- Personal acknowledgements of Cockpit hints. Time records remain unchanged.
CREATE TABLE public.cockpit_action_dismissals (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  dismissed_by UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL CHECK (char_length(action_id) BETWEEN 1 AND 500),
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, dismissed_by, action_id)
);

ALTER TABLE public.cockpit_action_dismissals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cockpit_action_dismissals FROM anon, authenticated;
GRANT SELECT, INSERT ON public.cockpit_action_dismissals TO authenticated;
GRANT ALL ON public.cockpit_action_dismissals TO service_role;

CREATE POLICY cockpit_dismissals_read_own ON public.cockpit_action_dismissals
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = dismissed_by AND e.tenant_id = cockpit_action_dismissals.tenant_id
      AND e.user_id = auth.uid() AND e.role = 'admin' AND e.deleted_at IS NULL
  ));

CREATE POLICY cockpit_dismissals_insert_own ON public.cockpit_action_dismissals
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = dismissed_by AND e.tenant_id = cockpit_action_dismissals.tenant_id
      AND e.user_id = auth.uid() AND e.role = 'admin' AND e.deleted_at IS NULL
  ));
