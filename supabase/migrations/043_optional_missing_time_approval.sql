ALTER TABLE public.tenants
  ADD COLUMN missing_time_approval_required boolean NOT NULL DEFAULT true;

-- Session inserts are live clock-ins. Historical inserts use a server workflow.
REVOKE INSERT ON public.time_entries FROM authenticated;
GRANT INSERT (tenant_id, employee_id, date, status, notes, project_id)
  ON public.time_entries TO authenticated;
ALTER POLICY time_entries_employee_insert ON public.time_entries
  WITH CHECK (
    tenant_id = public.get_jwt_claim('tenant_id')::uuid
    AND employee_id = public.get_jwt_claim('employee_id')::uuid
    AND status = 'running'
    AND date = (clock_in AT TIME ZONE 'Europe/Berlin')::date
  );

CREATE FUNCTION public.protect_employee_clock_start() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated'
    AND (NEW.clock_in, NEW.date) IS DISTINCT FROM (OLD.clock_in, OLD.date)
    AND NOT EXISTS (
      SELECT 1 FROM public.employees WHERE tenant_id = OLD.tenant_id
        AND user_id = auth.uid() AND role IN ('manager', 'admin') AND deleted_at IS NULL
    ) THEN
    RAISE EXCEPTION 'Beginn und Datum können nur über eine Korrektur geändert werden'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_employee_clock_start() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_employee_clock_start
  BEFORE UPDATE OF clock_in, date ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.protect_employee_clock_start();

-- Reading the setting, checking overlaps and booking direct entries share one
-- transaction. Already submitted proposals retain their original review flow.
CREATE FUNCTION public.submit_missing_time_request(
  p_tenant_id uuid, p_employee_id uuid, p_proposal jsonb, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_employee public.employees%ROWTYPE;
  v_request public.correction_requests%ROWTYPE;
  v_approval_required boolean;
  v_entry_id uuid;
  v_date date := (p_proposal->>'date')::date;
  v_start timestamptz := (p_proposal->>'clock_in')::timestamptz;
  v_end timestamptz := (p_proposal->>'clock_out')::timestamptz;
  v_break integer := (p_proposal->>'break_minutes')::integer;
  v_automatic integer := (p_proposal->>'automatic_break_minutes')::integer;
BEGIN
  LOCK TABLE public.time_entries IN SHARE ROW EXCLUSIVE MODE;
  SELECT missing_time_approval_required INTO v_approval_required
    FROM public.tenants WHERE id = p_tenant_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team nicht gefunden'; END IF;
  SELECT * INTO v_employee FROM public.employees
    WHERE id = p_employee_id AND tenant_id = p_tenant_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mitarbeiter nicht gefunden'; END IF;

  IF v_date IS NULL OR v_start IS NULL OR v_end IS NULL OR v_break IS NULL OR v_automatic IS NULL
    OR NOT isfinite(v_start) OR NOT isfinite(v_end) OR v_end <= v_start OR v_end > now()
    OR v_end - v_start > interval '24 hours'
    OR v_break < 0 OR v_break > 720 OR v_automatic < 0 OR v_automatic > v_break
    OR v_break * interval '1 minute' >= v_end - v_start
    OR v_date <> (v_start AT TIME ZONE 'Europe/Berlin')::date
    OR length(p_proposal->>'notes') > 500
    OR coalesce(length(trim(p_reason)), 0) NOT BETWEEN 5 AND 200 THEN
    RAISE EXCEPTION 'Bitte Datum, Beginn, Ende und Pause des Nachtrags prüfen';
  END IF;
  IF v_date < v_employee.employment_start_date THEN
    RAISE EXCEPTION 'Der Eintrag liegt vor dem Eintrittsdatum';
  END IF;
  IF EXISTS (SELECT 1 FROM public.time_entries
    WHERE tenant_id = p_tenant_id AND employee_id = p_employee_id AND deleted_at IS NULL
      AND clock_in < v_end AND (clock_out IS NULL OR clock_out > v_start)) THEN
    RAISE EXCEPTION 'Der Zeitraum überschneidet sich mit einem vorhandenen Eintrag';
  END IF;
  IF EXISTS (SELECT 1 FROM public.correction_requests
    WHERE tenant_id = p_tenant_id AND employee_id = p_employee_id
      AND request_type = 'missing_entry' AND status = 'pending'
      AND (proposed_change->>'clock_in')::timestamptz < v_end
      AND (proposed_change->>'clock_out')::timestamptz > v_start) THEN
    RAISE EXCEPTION 'Für diesen Zeitraum ist bereits eine Nachtragsanfrage offen';
  END IF;

  IF NOT v_approval_required THEN
    INSERT INTO public.time_entries (tenant_id, employee_id, date, clock_in, clock_out,
      break_minutes, automatic_break_minutes, entry_source, status, notes)
      VALUES (p_tenant_id, p_employee_id, v_date, v_start, v_end,
        v_break, v_automatic, 'manual', 'completed', p_proposal->>'notes')
      RETURNING id INTO v_entry_id;
  END IF;

  INSERT INTO public.correction_requests (tenant_id, employee_id, time_entry_id,
    request_type, proposed_change, reason, status)
    VALUES (p_tenant_id, p_employee_id, v_entry_id, 'missing_entry', p_proposal,
      trim(p_reason), CASE WHEN v_approval_required THEN 'pending' ELSE 'approved' END)
    RETURNING * INTO v_request;

  IF v_entry_id IS NOT NULL THEN
    INSERT INTO public.time_entry_audit (time_entry_id, tenant_id, changed_by, action,
      field_name, old_value, new_value, reason)
      VALUES (v_entry_id, p_tenant_id, p_employee_id, 'create', 'manual_entry', NULL,
        (p_proposal || jsonb_build_object('request_id', v_request.id, 'requested_by', p_employee_id))::text,
        'Zeitnachtrag (direkt gebucht): ' || trim(p_reason));
  END IF;
  RETURN to_jsonb(v_request);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_missing_time_request(uuid, uuid, jsonb, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_missing_time_request(uuid, uuid, jsonb, text)
  TO service_role;
