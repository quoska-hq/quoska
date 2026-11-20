ALTER TABLE public.projects
  ADD CONSTRAINT projects_tenant_id_unique UNIQUE (tenant_id, id);

CREATE TABLE public.project_weekly_targets (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  effective_from date NOT NULL CHECK (effective_from BETWEEN '0001-01-01' AND '9999-12-31'),
  weekly_minutes integer NOT NULL CHECK (weekly_minutes BETWEEN 0 AND 10080),
  changed_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  PRIMARY KEY (tenant_id, project_id, employee_id, effective_from),
  CONSTRAINT project_weekly_targets_project_fkey FOREIGN KEY (tenant_id, project_id)
    REFERENCES public.projects (tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT project_weekly_targets_employee_fkey FOREIGN KEY (tenant_id, employee_id)
    REFERENCES public.employees (tenant_id, id) ON DELETE CASCADE
);

COMMENT ON TABLE public.project_weekly_targets IS
  'Inclusive dated weekly project targets. Zero ends a target. Cancelled future targets never take effect.';

CREATE INDEX project_weekly_targets_employee_idx
  ON public.project_weekly_targets (tenant_id, employee_id, project_id, effective_from);
CREATE INDEX time_entries_project_balance_idx
  ON public.time_entries (tenant_id, project_id, date, id)
  WHERE status = 'completed' AND deleted_at IS NULL AND clock_out IS NOT NULL AND project_id IS NOT NULL;

ALTER TABLE public.project_weekly_targets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_weekly_targets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_weekly_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_weekly_targets TO service_role;
CREATE POLICY project_weekly_targets_read ON public.project_weekly_targets
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.employees AS viewer
      WHERE viewer.tenant_id = project_weekly_targets.tenant_id
        AND viewer.user_id = (SELECT auth.uid()) AND viewer.deleted_at IS NULL
        AND viewer.role IN ('admin', 'manager'))
  );

CREATE FUNCTION public.can_administer_projects(p_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.employees
    WHERE tenant_id = p_tenant_id AND user_id = (SELECT auth.uid())
      AND role = 'admin' AND deleted_at IS NULL);
$$;
REVOKE ALL ON FUNCTION public.can_administer_projects(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_administer_projects(uuid) TO authenticated;

-- Direct session writes must follow the same project roles as the app routes.
ALTER POLICY projects_insert ON public.projects
  WITH CHECK (public.can_administer_projects(tenant_id));
ALTER POLICY projects_update ON public.projects
  USING (public.can_administer_projects(tenant_id))
  WITH CHECK (public.can_administer_projects(tenant_id));
ALTER POLICY projects_delete ON public.projects
  USING (public.can_administer_projects(tenant_id));
ALTER POLICY assignments_insert ON public.project_assignments
  WITH CHECK (public.can_administer_projects(tenant_id) AND
    EXISTS (SELECT 1 FROM public.projects AS project
      WHERE project.id = project_assignments.project_id
        AND project.tenant_id = project_assignments.tenant_id AND project.deleted_at IS NULL) AND
    EXISTS (SELECT 1 FROM public.employees AS employee
      WHERE employee.id = project_assignments.employee_id
        AND employee.tenant_id = project_assignments.tenant_id AND employee.deleted_at IS NULL));
ALTER POLICY assignments_update ON public.project_assignments
  USING (public.can_administer_projects(tenant_id))
  WITH CHECK (public.can_administer_projects(tenant_id) AND
    EXISTS (SELECT 1 FROM public.projects AS project
      WHERE project.id = project_assignments.project_id
        AND project.tenant_id = project_assignments.tenant_id AND project.deleted_at IS NULL) AND
    EXISTS (SELECT 1 FROM public.employees AS employee
      WHERE employee.id = project_assignments.employee_id
        AND employee.tenant_id = project_assignments.tenant_id AND employee.deleted_at IS NULL));
ALTER POLICY assignments_delete ON public.project_assignments
  USING (public.can_administer_projects(tenant_id));

CREATE FUNCTION public.set_project_weekly_target(
  p_tenant_id uuid, p_project_id uuid, p_employee_id uuid, p_effective_from date, p_weekly_minutes integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.can_administer_projects(p_tenant_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Keine Berechtigung zum Ändern von Wochenzielen.';
  END IF;
  PERFORM id FROM public.projects
    WHERE id = p_project_id AND tenant_id = p_tenant_id AND active AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Aktives Projekt nicht gefunden.';
  END IF;
  PERFORM id FROM public.employees
    WHERE id = p_employee_id AND tenant_id = p_tenant_id AND deleted_at IS NULL FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Aktive Person nicht gefunden.';
  END IF;
  PERFORM id FROM public.project_assignments
    WHERE tenant_id = p_tenant_id AND project_id = p_project_id AND employee_id = p_employee_id
    FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Die Person ist diesem Projekt nicht zugeordnet.';
  END IF;

  INSERT INTO public.project_weekly_targets AS target
    (tenant_id, project_id, employee_id, effective_from, weekly_minutes)
  VALUES (p_tenant_id, p_project_id, p_employee_id, p_effective_from, p_weekly_minutes)
  ON CONFLICT (tenant_id, project_id, employee_id, effective_from) DO UPDATE
    SET weekly_minutes = EXCLUDED.weekly_minutes, cancelled_at = NULL, changed_at = now()
    WHERE target.weekly_minutes IS DISTINCT FROM EXCLUDED.weekly_minutes OR target.cancelled_at IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.set_project_weekly_target(uuid, uuid, uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_project_weekly_target(uuid, uuid, uuid, date, integer) TO authenticated;

CREATE FUNCTION public.end_project_weekly_targets(p_tenant_id uuid, p_project_id uuid, p_employee_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  day_of_change date := (statement_timestamp() AT TIME ZONE 'Europe/Berlin')::date;
BEGIN
  UPDATE public.project_weekly_targets
    SET cancelled_at = statement_timestamp(), changed_at = statement_timestamp()
    WHERE tenant_id = p_tenant_id AND cancelled_at IS NULL AND effective_from > day_of_change
      AND (p_project_id IS NULL OR project_id = p_project_id)
      AND (p_employee_id IS NULL OR employee_id = p_employee_id);

  INSERT INTO public.project_weekly_targets (tenant_id, project_id, employee_id, effective_from, weekly_minutes)
    SELECT p_tenant_id, latest.project_id, latest.employee_id, day_of_change, 0
    FROM (
      SELECT DISTINCT ON (target.project_id, target.employee_id)
        target.project_id, target.employee_id, target.weekly_minutes
      FROM public.project_weekly_targets AS target
      JOIN public.projects AS project
        ON project.tenant_id = target.tenant_id AND project.id = target.project_id
      JOIN public.employees AS employee
        ON employee.tenant_id = target.tenant_id AND employee.id = target.employee_id
      WHERE target.tenant_id = p_tenant_id AND target.cancelled_at IS NULL AND target.effective_from <= day_of_change
        AND (p_project_id IS NULL OR target.project_id = p_project_id)
        AND (p_employee_id IS NULL OR target.employee_id = p_employee_id)
      ORDER BY target.project_id, target.employee_id, target.effective_from DESC
    ) AS latest
    WHERE latest.weekly_minutes > 0
    ON CONFLICT (tenant_id, project_id, employee_id, effective_from) DO UPDATE
      SET weekly_minutes = 0, cancelled_at = NULL, changed_at = statement_timestamp();
END;
$$;
REVOKE ALL ON FUNCTION public.end_project_weekly_targets(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.end_project_targets_after_removal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'project_assignments' THEN
    PERFORM public.end_project_weekly_targets(OLD.tenant_id, OLD.project_id, OLD.employee_id);
  ELSIF TG_TABLE_NAME = 'projects' THEN
    PERFORM public.end_project_weekly_targets(OLD.tenant_id, OLD.id, NULL);
  ELSE
    PERFORM public.end_project_weekly_targets(OLD.tenant_id, NULL, OLD.id);
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.end_project_targets_after_removal() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER end_targets_on_project_unassignment
  AFTER DELETE ON public.project_assignments
  FOR EACH ROW EXECUTE FUNCTION public.end_project_targets_after_removal();
CREATE TRIGGER end_targets_on_project_reassignment
  AFTER UPDATE OF tenant_id, project_id, employee_id ON public.project_assignments
  FOR EACH ROW WHEN ((OLD.tenant_id, OLD.project_id, OLD.employee_id)
    IS DISTINCT FROM (NEW.tenant_id, NEW.project_id, NEW.employee_id))
  EXECUTE FUNCTION public.end_project_targets_after_removal();
CREATE TRIGGER end_targets_on_project_deactivation
  AFTER UPDATE OF active, deleted_at ON public.projects
  FOR EACH ROW WHEN ((OLD.active AND NOT NEW.active) OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL))
  EXECUTE FUNCTION public.end_project_targets_after_removal();
CREATE TRIGGER end_targets_on_employee_deactivation
  AFTER UPDATE OF deleted_at ON public.employees
  FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION public.end_project_targets_after_removal();

CREATE FUNCTION public.replace_project_assignments(p_tenant_id uuid, p_project_id uuid, p_employee_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  valid_count integer;
BEGIN
  IF NOT public.can_administer_projects(p_tenant_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Keine Berechtigung zum Ändern der Projektzuordnung.';
  END IF;
  PERFORM id FROM public.projects
    WHERE id = p_project_id AND tenant_id = p_tenant_id AND deleted_at IS NULL FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Projekt nicht gefunden.';
  END IF;
  SELECT count(*) INTO valid_count FROM (
    SELECT id FROM public.employees
      WHERE tenant_id = p_tenant_id AND deleted_at IS NULL AND id = ANY(p_employee_ids)
      ORDER BY id FOR SHARE
  ) AS active_employees;
  IF p_employee_ids IS NULL OR valid_count <> (SELECT count(*) FROM (SELECT DISTINCT unnest(p_employee_ids)) AS requested) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Mindestens eine ausgewählte Person ist nicht aktiv oder gehört zu einem anderen Team.';
  END IF;

  INSERT INTO public.project_assignments (tenant_id, project_id, employee_id)
    SELECT p_tenant_id, p_project_id, id FROM unnest(p_employee_ids) AS ids(id)
    ON CONFLICT (project_id, employee_id) DO NOTHING;
  DELETE FROM public.project_assignments
    WHERE tenant_id = p_tenant_id AND project_id = p_project_id AND NOT (employee_id = ANY(p_employee_ids));
END;
$$;
REVOKE ALL ON FUNCTION public.replace_project_assignments(uuid, uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_project_assignments(uuid, uuid, uuid[]) TO authenticated;
