ALTER TABLE public.time_entries
  ADD COLUMN clock_session_id uuid,
  ADD COLUMN clock_session_started_at timestamptz,
  ADD CONSTRAINT time_entries_clock_session_fields CHECK (
    (clock_session_id IS NULL) = (clock_session_started_at IS NULL)
  ),
  ADD CONSTRAINT time_entries_clock_session_tenant FOREIGN KEY (tenant_id, clock_session_id)
    REFERENCES public.time_entries (tenant_id, id);

CREATE INDEX idx_time_entries_clock_session ON public.time_entries (clock_session_id)
  WHERE clock_session_id IS NOT NULL;

-- Only this transition assigns session metadata. The existing authenticated
-- column-level INSERT and UPDATE grants do not include either session column.
CREATE FUNCTION public.transition_clock_project(
  p_tenant_id uuid, p_employee_id uuid, p_entry_id uuid, p_project_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_entry public.time_entries%ROWTYPE;
  v_segment public.time_entries%ROWTYPE;
  v_now timestamptz;
  v_session_id uuid;
  v_session_start timestamptz;
  v_new_entry_id uuid;
  v_gross_minutes integer;
  v_booked_break integer;
  v_missing_break integer;
  v_booked_automatic integer := 0;
  v_added integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = p_employee_id AND tenant_id = p_tenant_id
    AND deleted_at IS NULL AND (user_id = auth.uid() OR auth.role() = 'service_role')) THEN
    RAISE EXCEPTION 'Mitarbeiterprofil nicht gefunden.' USING ERRCODE = '42501';
  END IF;

  -- Match the table/employee lock order used by the entry import workflows.
  LOCK TABLE public.time_entries IN ROW EXCLUSIVE MODE;
  IF p_project_id IS NOT NULL THEN
    -- Assignment replacement locks the project before the employees.
    PERFORM id FROM public.projects
      WHERE tenant_id = p_tenant_id AND id = p_project_id AND active AND deleted_at IS NULL
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Dieses Projekt ist dir nicht zugewiesen oder nicht mehr aktiv.' USING ERRCODE = '42501';
    END IF;
    PERFORM id FROM public.project_assignments
      WHERE tenant_id = p_tenant_id AND project_id = p_project_id AND employee_id = p_employee_id
      FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Dieses Projekt ist dir nicht zugewiesen oder nicht mehr aktiv.' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM id FROM public.employees WHERE id = p_employee_id AND tenant_id = p_tenant_id
    AND deleted_at IS NULL AND (user_id = auth.uid() OR auth.role() = 'service_role')
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mitarbeiterprofil nicht gefunden.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_entry FROM public.time_entries WHERE id = p_entry_id
    AND tenant_id = p_tenant_id AND employee_id = p_employee_id AND deleted_at IS NULL
    FOR UPDATE;
  IF NOT FOUND OR v_entry.status = 'completed' OR v_entry.clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'Die laufende Stempelung hat sich geändert. Bitte prüfe deine Stempeluhr.' USING ERRCODE = 'P0002';
  END IF;
  IF v_entry.status = 'paused' OR EXISTS (SELECT 1 FROM public.break_sessions
    WHERE tenant_id = p_tenant_id AND time_entry_id = p_entry_id AND break_end IS NULL) THEN
    RAISE EXCEPTION 'Bitte beende zuerst deine Pause.' USING ERRCODE = 'P0001';
  END IF;

  v_now := date_trunc('milliseconds', clock_timestamp());
  v_session_id := coalesce(v_entry.clock_session_id, v_entry.id);
  v_session_start := coalesce(v_entry.clock_session_started_at, v_entry.clock_in);
  IF v_now <= v_entry.clock_in THEN
    RAISE EXCEPTION 'Der Zeiteintrag hat gerade begonnen. Bitte versuche es erneut.' USING ERRCODE = 'P0001';
  END IF;

  IF p_project_id IS NOT NULL THEN
    IF v_entry.project_id = p_project_id THEN
      RAISE EXCEPTION 'Du arbeitest bereits an diesem Projekt.' USING ERRCODE = 'P0001';
    END IF;
    IF v_now - v_session_start > interval '10 hours' THEN
      RAISE EXCEPTION 'Bitte stemple zuerst aus und prüfe deine Arbeitszeit.' USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_entry.clock_session_id IS NULL THEN
    RAISE EXCEPTION 'Die laufende Stempelung hat sich geändert. Bitte prüfe deine Stempeluhr.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.time_entries SET clock_out = v_now, status = 'completed',
    clock_session_id = v_session_id, clock_session_started_at = v_session_start
    WHERE id = v_entry.id RETURNING * INTO v_entry;

  INSERT INTO public.time_entry_audit
    (time_entry_id, tenant_id, changed_by, action, field_name, new_value, reason)
  VALUES (v_entry.id, p_tenant_id, p_employee_id, 'update', 'clock_out', v_now::text,
    CASE WHEN p_project_id IS NULL THEN 'Clock out' ELSE 'Projektwechsel' END);

  IF p_project_id IS NOT NULL THEN
    INSERT INTO public.time_entries
      (tenant_id, employee_id, date, clock_in, project_id, clock_session_id, clock_session_started_at)
    VALUES (p_tenant_id, p_employee_id, (v_now AT TIME ZONE 'Europe/Berlin')::date,
      v_now, p_project_id, v_session_id, v_session_start)
    RETURNING id INTO v_new_entry_id;

    INSERT INTO public.time_entry_audit
      (time_entry_id, tenant_id, changed_by, action, field_name, old_value, new_value, reason)
    VALUES
      (v_new_entry_id, p_tenant_id, p_employee_id, 'create', 'clock_in', NULL, v_now::text, 'Projektwechsel'),
      (v_new_entry_id, p_tenant_id, p_employee_id, 'update', 'project_id', v_entry.project_id::text, p_project_id::text, 'Projektwechsel');
    RETURN jsonb_build_object('success', true);
  END IF;

  -- Count pauses across the continuous clock session. Deduct at the final
  -- clock-out so actual breaks taken after a switch still count in full.
  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id AND automatic_breaks_enabled) THEN
    PERFORM id FROM public.time_entries WHERE tenant_id = p_tenant_id AND employee_id = p_employee_id
      AND clock_session_id = v_session_id AND status = 'completed' AND clock_out IS NOT NULL
      AND deleted_at IS NULL ORDER BY id FOR UPDATE;

    SELECT round(sum(extract(epoch FROM (clock_out - clock_in))) / 60), sum(break_minutes)
      INTO v_gross_minutes, v_booked_break
      FROM public.time_entries WHERE tenant_id = p_tenant_id AND employee_id = p_employee_id
        AND clock_session_id = v_session_id AND status = 'completed' AND clock_out IS NOT NULL
        AND deleted_at IS NULL;

    v_missing_break := greatest(0, CASE
      WHEN v_gross_minutes > 540 THEN 45 WHEN v_gross_minutes > 360 THEN 30 ELSE 0
    END - v_booked_break);

    -- A break must be strictly shorter than its segment, also for fractional minutes.
    FOR v_segment IN SELECT * FROM public.time_entries
      WHERE tenant_id = p_tenant_id AND employee_id = p_employee_id
        AND clock_session_id = v_session_id AND status = 'completed' AND clock_out IS NOT NULL
        AND deleted_at IS NULL
      ORDER BY clock_in DESC, id
    LOOP
      EXIT WHEN v_missing_break = 0;
      v_added := least(v_missing_break, greatest(0,
        ceil(extract(epoch FROM (v_segment.clock_out - v_segment.clock_in)) / 60)::integer - 1 - v_segment.break_minutes));
      CONTINUE WHEN v_added = 0;

      UPDATE public.time_entries SET break_minutes = break_minutes + v_added,
        automatic_break_minutes = automatic_break_minutes + v_added WHERE id = v_segment.id;
      INSERT INTO public.time_entry_audit
        (time_entry_id, tenant_id, changed_by, action, field_name, old_value, new_value, reason)
      VALUES (v_segment.id, p_tenant_id, p_employee_id, 'update', 'break_minutes', v_segment.break_minutes::text,
        (v_segment.break_minutes + v_added)::text, format('Automatische Mindestpause ergänzt (%s Min)', v_added));
      v_missing_break := v_missing_break - v_added;
      v_booked_automatic := v_booked_automatic + v_added;
    END LOOP;

    IF v_booked_automatic > 0 THEN
      INSERT INTO public.notifications (tenant_id, employee_id, type, title, message)
      VALUES (p_tenant_id, p_employee_id, 'automatic_break_added', 'Pause automatisch ergänzt',
        format('Quoska hat %s Minuten Pause ergänzt, damit deine Stempelung die konfigurierte Mindestpause erreicht. Bitte prüfe deine Zeiten.', v_booked_automatic));
    END IF;
  END IF;

  SELECT * INTO v_entry FROM public.time_entries WHERE id = p_entry_id;
  RETURN to_jsonb(v_entry);
END;
$$;

REVOKE ALL ON FUNCTION public.transition_clock_project(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_clock_project(uuid, uuid, uuid, uuid) TO authenticated, service_role;
