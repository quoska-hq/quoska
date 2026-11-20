-- Missing workdays use the existing request inbox without booking time early.
ALTER TABLE public.correction_requests
  ALTER COLUMN time_entry_id DROP NOT NULL,
  ADD COLUMN request_type text NOT NULL DEFAULT 'correction'
    CHECK (request_type IN ('correction', 'missing_entry')),
  ADD CONSTRAINT correction_request_entry_required CHECK (
    (request_type = 'correction' AND time_entry_id IS NOT NULL)
    OR (request_type = 'missing_entry' AND (
      (status = 'approved' AND time_entry_id IS NOT NULL)
      OR (status IN ('pending', 'rejected') AND time_entry_id IS NULL)
    ))
  );

CREATE UNIQUE INDEX missing_time_request_pending_unique
  ON public.correction_requests (tenant_id, employee_id,
    (proposed_change->>'clock_in'), (proposed_change->>'clock_out'))
  WHERE request_type = 'missing_entry' AND status = 'pending';

-- Missing-time writes go through the server, and approval through the atomic
-- RPC below. An authenticated client must not approve a proposal without time.
ALTER POLICY corrections_insert_own ON public.correction_requests
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND employee_id = public.get_jwt_claim('employee_id')::uuid
    AND request_type = 'correction'
  );
ALTER POLICY corrections_review ON public.correction_requests
  USING (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
    AND request_type = 'correction'
  )
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND public.get_jwt_claim('role') IN ('admin', 'manager')
    AND request_type = 'correction'
  );

CREATE FUNCTION public.review_missing_time_request(
  p_tenant_id uuid, p_reviewer_id uuid, p_request_id uuid,
  p_action text, p_review_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_request public.correction_requests%ROWTYPE;
  v_employee public.employees%ROWTYPE;
  v_entry_id uuid;
  v_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_break integer;
  v_automatic integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_reviewer_id
    AND tenant_id = p_tenant_id AND role IN ('admin', 'manager') AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Nur Administratoren oder Führungskräfte können Nachträge prüfen' USING ERRCODE = '42501';
  END IF;
  IF p_action IS NULL OR p_action NOT IN ('approve', 'reject') OR length(p_review_note) > 500 THEN
    RAISE EXCEPTION 'Ungültige Entscheidung';
  END IF;

  -- Same order as the historical importer. Includes live writers and prevents
  -- overlap races; the request row also prevents a second approval/rejection.
  LOCK TABLE public.time_entries IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO v_request FROM public.correction_requests
    WHERE id = p_request_id AND tenant_id = p_tenant_id AND request_type = 'missing_entry'
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nachtragsanfrage nicht gefunden'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Diese Anfrage wurde bereits bearbeitet'; END IF;

  IF p_action = 'approve' THEN
    SELECT * INTO v_employee FROM public.employees
      WHERE id = v_request.employee_id AND tenant_id = p_tenant_id AND deleted_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'Mitarbeiter nicht gefunden'; END IF;
    v_date := (v_request.proposed_change->>'date')::date;
    v_start := (v_request.proposed_change->>'clock_in')::timestamptz;
    v_end := (v_request.proposed_change->>'clock_out')::timestamptz;
    v_break := (v_request.proposed_change->>'break_minutes')::integer;
    v_automatic := (v_request.proposed_change->>'automatic_break_minutes')::integer;
    IF v_date IS NULL OR v_start IS NULL OR v_end IS NULL OR v_break IS NULL OR v_automatic IS NULL
      OR NOT isfinite(v_start) OR NOT isfinite(v_end) OR v_end <= v_start OR v_end > now()
      OR v_end - v_start > interval '24 hours'
      OR v_break < 0 OR v_break > 720 OR v_automatic < 0 OR v_automatic > v_break
      OR v_break * interval '1 minute' >= v_end - v_start
      OR v_date <> (v_start AT TIME ZONE 'Europe/Berlin')::date
      OR v_date < v_employee.employment_start_date
      OR length(v_request.proposed_change->>'notes') > 500
      OR length(trim(v_request.reason)) < 5 THEN
      RAISE EXCEPTION 'Bitte Datum, Beginn, Ende und Pause der Anfrage prüfen';
    END IF;
    IF EXISTS (SELECT 1 FROM public.time_entries WHERE tenant_id = p_tenant_id
      AND employee_id = v_request.employee_id AND deleted_at IS NULL
      AND clock_in < v_end AND (clock_out IS NULL OR clock_out > v_start)) THEN
      RAISE EXCEPTION 'Der Zeitraum überschneidet sich mit einem vorhandenen Eintrag';
    END IF;
    INSERT INTO public.time_entries (tenant_id, employee_id, date, clock_in, clock_out,
      break_minutes, automatic_break_minutes, entry_source, status, notes)
      VALUES (p_tenant_id, v_request.employee_id, v_date, v_start, v_end,
        v_break, v_automatic, 'manual', 'completed', v_request.proposed_change->>'notes')
      RETURNING id INTO v_entry_id;
    INSERT INTO public.time_entry_audit (time_entry_id, tenant_id, changed_by,
      action, field_name, old_value, new_value, reason)
      VALUES (v_entry_id, p_tenant_id, p_reviewer_id, 'create', 'manual_entry', NULL,
        (v_request.proposed_change || jsonb_build_object('request_id', v_request.id,
          'requested_by', v_request.employee_id))::text,
        'Nachtragsanfrage (genehmigt): ' || v_request.reason);
  END IF;

  UPDATE public.correction_requests SET
    status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
    time_entry_id = v_entry_id, reviewed_by = p_reviewer_id, review_note = p_review_note
    WHERE id = v_request.id RETURNING * INTO v_request;
  RETURN to_jsonb(v_request);
END;
$$;
REVOKE ALL ON FUNCTION public.review_missing_time_request(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_missing_time_request(uuid, uuid, uuid, text, text) TO service_role;
