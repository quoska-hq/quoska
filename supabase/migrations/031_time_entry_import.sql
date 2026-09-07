-- Historical CSV imports: atomic validation + entries + immutable audit records.
ALTER TABLE public.time_entries DROP CONSTRAINT time_entries_entry_source_check;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_entry_source_check
  CHECK (entry_source IN ('clock', 'manual', 'import'));

CREATE OR REPLACE FUNCTION public.import_time_entries(
  p_tenant_id uuid, p_actor_id uuid, p_rows jsonb, p_commit boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_rows jsonb;
  v_ready integer;
  v_errors integer;
  v_duplicates integer;
  v_imported integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = p_actor_id AND tenant_id = p_tenant_id
      AND role IN ('admin', 'manager') AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Import not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array'
    OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Invalid import batch';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_rows) AS r(
      row integer, employee_id uuid, date date, clock_in timestamptz,
      clock_out timestamptz, break_minutes integer, notes text
    ) WHERE r.row IS NULL OR r.employee_id IS NULL OR r.date IS NULL
      OR r.clock_in IS NULL OR r.clock_out IS NULL OR r.break_minutes IS NULL
      OR NOT isfinite(r.clock_in) OR NOT isfinite(r.clock_out)
      OR r.clock_out <= r.clock_in OR r.clock_out > now()
      OR r.clock_out - r.clock_in > interval '24 hours'
      OR r.break_minutes < 0
      OR r.break_minutes * interval '1 minute' >= r.clock_out - r.clock_in
      OR r.date <> (r.clock_in AT TIME ZONE 'Europe/Berlin')::date
      OR length(r.notes) > 500
  ) OR (SELECT count(DISTINCT (r->>'row')::integer) FROM jsonb_array_elements(p_rows) r) <> jsonb_array_length(p_rows) THEN
    RAISE EXCEPTION 'Invalid import entries';
  END IF;

  IF p_commit THEN
    -- Serialize this bounded, set-based commit with every writer (including the
    -- live clock and manual edits), closing the preview/insert overlap race.
    -- Dry-run previews never lock the table. Lock ends with the RPC transaction.
    LOCK TABLE public.time_entries IN SHARE ROW EXCLUSIVE MODE;
  END IF;

  WITH incoming AS (
    SELECT * FROM jsonb_to_recordset(p_rows) AS r(
      row integer, employee_id uuid, date date, clock_in timestamptz,
      clock_out timestamptz, break_minutes integer, notes text
    )
  ), checked AS (
    SELECT r.*, e.first_name || ' ' || e.last_name AS employee_name,
      CASE
        WHEN e.id IS NULL THEN 'Mitarbeiter ist in diesem Unternehmen nicht verfügbar.'
        WHEN EXISTS (
          SELECT 1 FROM incoming other
          WHERE other.row <> r.row AND other.employee_id = r.employee_id
            AND other.clock_in < r.clock_out AND other.clock_out > r.clock_in
            AND NOT (other.clock_in = r.clock_in AND other.clock_out = r.clock_out
              AND other.break_minutes = r.break_minutes AND other.notes IS NOT DISTINCT FROM r.notes)
        ) THEN 'Überschneidung mit einem anderen Eintrag in der Datei.'
        WHEN EXISTS (
          SELECT 1 FROM public.time_entries existing
          WHERE existing.tenant_id = p_tenant_id AND existing.employee_id = r.employee_id
            AND existing.deleted_at IS NULL
            AND existing.clock_in < r.clock_out
            AND (existing.clock_out IS NULL OR existing.clock_out > r.clock_in)
            AND NOT (existing.clock_in = r.clock_in AND existing.clock_out IS NOT DISTINCT FROM r.clock_out
              AND existing.break_minutes = r.break_minutes AND existing.notes IS NOT DISTINCT FROM r.notes
              AND existing.project_id IS NULL AND existing.status = 'completed')
        ) THEN 'Überschneidung oder abweichende Daten zu einem vorhandenen Eintrag.'
        ELSE NULL
      END AS issue,
      EXISTS (
        SELECT 1 FROM incoming other WHERE other.row < r.row AND other.employee_id = r.employee_id
          AND other.clock_in = r.clock_in AND other.clock_out = r.clock_out
          AND other.break_minutes = r.break_minutes AND other.notes IS NOT DISTINCT FROM r.notes
      ) OR EXISTS (
        SELECT 1 FROM public.time_entries existing
        WHERE existing.tenant_id = p_tenant_id AND existing.employee_id = r.employee_id
          AND existing.deleted_at IS NULL AND existing.status = 'completed'
          AND existing.clock_in = r.clock_in AND existing.clock_out = r.clock_out
          AND existing.break_minutes = r.break_minutes AND existing.notes IS NOT DISTINCT FROM r.notes
          AND existing.project_id IS NULL
      ) AS duplicate
    FROM incoming r LEFT JOIN public.employees e
      ON e.id = r.employee_id AND e.tenant_id = p_tenant_id AND e.deleted_at IS NULL
  )
  SELECT jsonb_agg(
    (to_jsonb(checked) - 'issue' - 'duplicate') || jsonb_build_object(
      'status', CASE WHEN issue IS NOT NULL THEN 'error' WHEN duplicate THEN 'duplicate' ELSE 'ready' END,
      'message', CASE WHEN issue IS NOT NULL THEN issue WHEN duplicate THEN 'Identischer Eintrag wird übersprungen.' ELSE NULL END
    ) ORDER BY row
  ) INTO v_rows FROM checked;

  SELECT count(*) FILTER (WHERE r->>'status' = 'ready'),
    count(*) FILTER (WHERE r->>'status' = 'error'),
    count(*) FILTER (WHERE r->>'status' = 'duplicate')
    INTO v_ready, v_errors, v_duplicates FROM jsonb_array_elements(v_rows) r;

  IF p_commit AND v_errors = 0 AND v_ready > 0 THEN
    WITH inserted AS (
      INSERT INTO public.time_entries (
        tenant_id, employee_id, date, clock_in, clock_out,
        break_minutes, automatic_break_minutes, entry_source, status, notes
      ) SELECT p_tenant_id, (r->>'employee_id')::uuid, (r->>'date')::date,
        (r->>'clock_in')::timestamptz, (r->>'clock_out')::timestamptz,
        (r->>'break_minutes')::integer, 0, 'import', 'completed', r->>'notes'
      FROM jsonb_array_elements(v_rows) r WHERE r->>'status' = 'ready'
      RETURNING *
    )
    INSERT INTO public.time_entry_audit (
      time_entry_id, tenant_id, changed_by, action, field_name, old_value, new_value, reason
    ) SELECT id, p_tenant_id, p_actor_id, 'create', 'import_entry', NULL,
      jsonb_build_object('clock_in', clock_in, 'clock_out', clock_out,
        'break_minutes', break_minutes, 'notes', notes)::text,
      'CSV-Import vergangener Arbeitszeiten; Originalpausen unverändert übernommen'
    FROM inserted;
    GET DIAGNOSTICS v_imported = ROW_COUNT;
  END IF;
  RETURN jsonb_build_object('rows', v_rows, 'readyCount', v_ready,
    'errorCount', v_errors, 'duplicateCount', v_duplicates, 'importedCount', v_imported);
END;
$$;

REVOKE ALL ON FUNCTION public.import_time_entries(uuid, uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_time_entries(uuid, uuid, jsonb, boolean) TO service_role;

COMMENT ON COLUMN public.time_entries.entry_source IS 'Live clocking, manual addition, or audited historical import.';
