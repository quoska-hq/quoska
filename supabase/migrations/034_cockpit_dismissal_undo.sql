-- A dedicated primary key keeps PostgREST from treating acknowledgements as a
-- second many-to-many relationship between employees and tenants. The unique
-- constraint still makes repeated dismissals idempotent.
ALTER TABLE public.cockpit_action_dismissals
  ADD COLUMN id UUID NOT NULL DEFAULT gen_random_uuid(),
  DROP CONSTRAINT cockpit_action_dismissals_pkey,
  ADD PRIMARY KEY (id),
  ADD CONSTRAINT cockpit_dismissals_identity UNIQUE (tenant_id, dismissed_by, action_id);

-- Each dismissal operation has its own token so undo cannot restore older hints.
ALTER TABLE public.cockpit_action_dismissals
  ADD COLUMN undo_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX cockpit_dismissals_undo ON public.cockpit_action_dismissals (tenant_id, dismissed_by, undo_token);

GRANT DELETE ON public.cockpit_action_dismissals TO authenticated;
CREATE POLICY cockpit_dismissals_undo_recent ON public.cockpit_action_dismissals
  FOR DELETE TO authenticated
  USING (
    dismissed_at >= now() - interval '10 seconds'
    AND dismissed_at <= now()
    AND EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = dismissed_by AND e.tenant_id = cockpit_action_dismissals.tenant_id
        AND e.user_id = auth.uid() AND e.role = 'admin' AND e.deleted_at IS NULL
    )
  );
