-- Server-only settings and immutable generated-file snapshots; no payroll transmission.
CREATE TABLE public.datev_settings (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  config jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.datev_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  month date NOT NULL CHECK (extract(day from month) = 1),
  fingerprint text NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, month, fingerprint)
);
ALTER TABLE public.datev_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datev_exports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.datev_settings, public.datev_exports FROM anon, authenticated;
GRANT ALL ON public.datev_settings, public.datev_exports TO service_role;

CREATE FUNCTION public.save_datev_settings(p_tenant uuid, p_config jsonb, p_revision integer)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE current_revision integer;
BEGIN
  -- Serialize initial inserts and edits; refuse stale tabs and foreign employee IDs.
  PERFORM 1 FROM public.tenants WHERE id = p_tenant FOR UPDATE;
  SELECT revision INTO current_revision FROM public.datev_settings WHERE tenant_id = p_tenant;
  IF coalesce(current_revision, 0) <> p_revision THEN
    RAISE EXCEPTION 'datev_settings_conflict';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_config->'employees') item
    WHERE NOT EXISTS (SELECT 1 FROM public.employees e
      WHERE e.id = (item->>'employeeId')::uuid AND e.tenant_id = p_tenant)
  ) THEN RAISE EXCEPTION 'datev_employee_scope'; END IF;
  INSERT INTO public.datev_settings(tenant_id, config, revision)
  VALUES(p_tenant, p_config - 'revision', p_revision + 1)
  ON CONFLICT (tenant_id) DO UPDATE SET config = EXCLUDED.config,
    revision = EXCLUDED.revision, updated_at = now();
  RETURN p_revision + 1;
END $$;

-- One SQL statement provides a consistent snapshot, without PostgREST row truncation.
CREATE FUNCTION public.datev_month_snapshot(p_tenant uuid, p_month date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'settings', (SELECT config || jsonb_build_object('revision', revision)
      FROM public.datev_settings WHERE tenant_id = p_tenant),
    'employees', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id,
      'first_name', first_name, 'last_name', last_name, 'deleted_at', deleted_at) ORDER BY id)
      FROM public.employees WHERE tenant_id = p_tenant), '[]'::jsonb),
    'entries', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'employee_id', employee_id,
      'date', date, 'clock_in', clock_in, 'clock_out', clock_out, 'status', status,
      'break_minutes', break_minutes, 'entry_source', entry_source) ORDER BY employee_id, clock_in, id)
      FROM public.time_entries WHERE tenant_id = p_tenant AND deleted_at IS NULL
        AND ((date >= p_month AND date < p_month + interval '1 month')
          OR (clock_in < (p_month::timestamp AT TIME ZONE 'Europe/Berlin')
            AND coalesce(clock_out, now()) > (p_month::timestamp AT TIME ZONE 'Europe/Berlin')))), '[]'::jsonb),
    'pending', coalesce((SELECT jsonb_agg(c.time_entry_id ORDER BY c.time_entry_id)
      FROM public.correction_requests c JOIN public.time_entries t ON t.id = c.time_entry_id
      WHERE c.tenant_id = p_tenant AND t.tenant_id = p_tenant AND c.status = 'pending'
        AND t.deleted_at IS NULL AND t.date >= p_month AND t.date < p_month + interval '1 month'), '[]'::jsonb),
    'history', coalesce((SELECT jsonb_agg(h ORDER BY h.created_at DESC) FROM
      (SELECT id, created_at, fingerprint FROM public.datev_exports WHERE tenant_id = p_tenant
        AND month = p_month ORDER BY created_at DESC LIMIT 20) h), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.save_datev_settings(uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.datev_month_snapshot(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_datev_settings(uuid, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.datev_month_snapshot(uuid, date) TO service_role;
