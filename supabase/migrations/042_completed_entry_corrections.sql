-- Project changes and cancellations are recorded together with their audit.
-- Ordinary session writes still support the live clock and existing corrections.
REVOKE UPDATE ON public.time_entries FROM authenticated;
GRANT UPDATE (date, clock_in, clock_out, break_minutes, automatic_break_minutes,
  status, notes, updated_at) ON public.time_entries TO authenticated;

ALTER POLICY time_entries_update ON public.time_entries
  USING (
    deleted_at IS NULL
    AND tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND (
      employee_id = public.get_jwt_claim('employee_id')::uuid
      OR public.get_jwt_claim('role') IN ('admin', 'manager')
    )
  );

CREATE FUNCTION public.correct_completed_time_entry(
  p_tenant_id uuid, p_actor_id uuid, p_entry_id uuid, p_reason text,
  p_changes jsonb DEFAULT '{}'::jsonb, p_cancel boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_entry public.time_entries%ROWTYPE;
  v_next public.time_entries%ROWTYPE;
  v_change record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = p_actor_id AND tenant_id = p_tenant_id AND user_id = auth.uid()
      AND role IN ('admin', 'manager') AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Nur Administratoren und Führungskräfte können Zeiteinträge korrigieren'
      USING ERRCODE = '42501';
  END IF;
  IF coalesce(length(btrim(p_reason)), 0) < 5 OR length(p_reason) > 500 THEN
    RAISE EXCEPTION 'Ein Grund mit 5 bis 500 Zeichen ist erforderlich';
  END IF;
  SELECT * INTO v_entry FROM public.time_entries
    WHERE id = p_entry_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Zeiteintrag nicht gefunden'; END IF;
  IF v_entry.status <> 'completed' THEN
    RAISE EXCEPTION 'Nur abgeschlossene Zeiteinträge können hier korrigiert werden';
  END IF;
  IF v_entry.deleted_at IS NOT NULL THEN
    IF p_cancel THEN RETURN to_jsonb(v_entry); END IF;
    RAISE EXCEPTION 'Der Zeiteintrag wurde bereits storniert';
  END IF;

  IF p_cancel THEN
    UPDATE public.time_entries SET deleted_at = statement_timestamp()
      WHERE id = v_entry.id RETURNING * INTO v_next;
    INSERT INTO public.time_entry_audit (
      time_entry_id, tenant_id, changed_by, action, field_name, new_value, reason
    ) VALUES (
      v_entry.id, p_tenant_id, p_actor_id, 'delete', 'deleted_at',
      v_next.deleted_at::text, btrim(p_reason)
    );
    UPDATE public.correction_requests
      SET status = 'rejected', reviewed_by = p_actor_id,
        review_note = 'Der Zeiteintrag wurde storniert.'
      WHERE tenant_id = p_tenant_id AND time_entry_id = v_entry.id AND status = 'pending';
    RETURN to_jsonb(v_next);
  END IF;

  IF jsonb_typeof(p_changes) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_changes) AS field(name)
    WHERE name NOT IN ('project_id', 'clock_in', 'clock_out', 'break_minutes', 'notes')
  ) THEN
    RAISE EXCEPTION 'Ungültige Änderungen';
  END IF;
  v_next := jsonb_populate_record(v_entry, p_changes);
  IF v_next.project_id IS NOT NULL AND v_next.project_id IS DISTINCT FROM v_entry.project_id
    AND NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = v_next.project_id AND tenant_id = p_tenant_id AND deleted_at IS NULL
    ) THEN
    RAISE EXCEPTION 'Projekt nicht gefunden';
  END IF;
  IF v_next.break_minutes IS DISTINCT FROM v_entry.break_minutes THEN
    v_next.automatic_break_minutes := 0;
  END IF;
  IF v_next.clock_in IS DISTINCT FROM v_entry.clock_in THEN
    v_next.date := (v_next.clock_in AT TIME ZONE 'Europe/Berlin')::date;
  END IF;
  IF ((v_next.clock_in, v_next.clock_out, v_next.break_minutes) IS DISTINCT FROM
      (v_entry.clock_in, v_entry.clock_out, v_entry.break_minutes))
    AND (v_next.clock_in IS NULL OR v_next.clock_out IS NULL OR v_next.break_minutes IS NULL
      OR v_next.clock_out <= v_next.clock_in OR v_next.break_minutes < 0
      OR v_next.break_minutes * interval '1 minute' >= v_next.clock_out - v_next.clock_in) THEN
    RAISE EXCEPTION 'Bitte Beginn, Ende und Pause prüfen';
  END IF;
  IF length(v_next.notes) > 500 THEN RAISE EXCEPTION 'Die Notiz ist zu lang'; END IF;
  IF v_next IS NOT DISTINCT FROM v_entry THEN RETURN to_jsonb(v_entry); END IF;

  UPDATE public.time_entries
    SET project_id = v_next.project_id, clock_in = v_next.clock_in, clock_out = v_next.clock_out,
      date = v_next.date, break_minutes = v_next.break_minutes,
      automatic_break_minutes = v_next.automatic_break_minutes, notes = v_next.notes
    WHERE id = v_entry.id RETURNING * INTO v_next;
  FOR v_change IN
    SELECT field, to_jsonb(v_entry)->>field AS previous, to_jsonb(v_next)->>field AS next
    FROM unnest(ARRAY['project_id', 'clock_in', 'clock_out', 'date',
      'break_minutes', 'automatic_break_minutes', 'notes']) AS fields(field)
    WHERE to_jsonb(v_entry)->>field IS DISTINCT FROM to_jsonb(v_next)->>field
  LOOP
    INSERT INTO public.time_entry_audit (
      time_entry_id, tenant_id, changed_by, action, field_name, old_value, new_value, reason
    ) VALUES (
      v_entry.id, p_tenant_id, p_actor_id, 'update', v_change.field,
      v_change.previous, v_change.next, btrim(p_reason)
    );
  END LOOP;
  RETURN to_jsonb(v_next);
END;
$$;
REVOKE ALL ON FUNCTION public.correct_completed_time_entry(uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_completed_time_entry(uuid, uuid, uuid, text, jsonb, boolean)
  TO authenticated;

-- A submission racing a cancellation must see the final entry state.
CREATE FUNCTION public.require_entry_for_correction_request() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.request_type = 'correction' THEN
    PERFORM id FROM public.time_entries
      WHERE id = NEW.time_entry_id AND tenant_id = NEW.tenant_id
        AND employee_id = NEW.employee_id AND deleted_at IS NULL FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Zeiteintrag nicht gefunden oder storniert'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.require_entry_for_correction_request() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER require_entry_for_correction_request
  BEFORE INSERT ON public.correction_requests
  FOR EACH ROW EXECUTE FUNCTION public.require_entry_for_correction_request();
