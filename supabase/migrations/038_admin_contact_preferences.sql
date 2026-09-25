-- Personal, explicit consent. Existing accounts are deliberately not enrolled.
-- Keep the wording and version in sync with types/contact-preferences.ts.
CREATE TABLE public.admin_contact_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  text_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('setup', 'settings')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX admin_contact_events_user_latest ON public.admin_contact_events(user_id, id DESC);
ALTER TABLE public.admin_contact_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_contact_events FROM anon, authenticated;
GRANT SELECT ON public.admin_contact_events TO authenticated;
GRANT ALL ON public.admin_contact_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_contact_events_id_seq TO service_role;
CREATE POLICY admin_contact_events_read_own ON public.admin_contact_events
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.get_admin_contact_preference()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user UUID := auth.uid();
  v_account auth.users;
  v_event public.admin_contact_events;
  v_allowed BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_account FROM auth.users WHERE id = v_user;
  SELECT * INTO v_event FROM public.admin_contact_events WHERE user_id = v_user ORDER BY id DESC LIMIT 1;
  v_allowed := v_account.email_confirmed_at IS NOT NULL
    AND (v_account.banned_until IS NULL OR v_account.banned_until <= now())
    AND EXISTS (SELECT 1 FROM public.employees WHERE user_id = v_user AND role = 'admin' AND deleted_at IS NULL);
  RETURN jsonb_build_object(
    'enabled', COALESCE(v_event.enabled, false),
    'canEnable', COALESCE(v_allowed, false),
    'eligible', COALESCE(v_allowed AND v_event.enabled AND v_event.email = v_account.email
      AND v_event.text_version = 'admin-checkin-v1', false)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_contact_preference() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_contact_preference() TO authenticated;

CREATE FUNCTION public.set_admin_contact_preference(p_enabled BOOLEAN, p_version TEXT, p_source TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user UUID := auth.uid();
  v_account auth.users;
  v_event public.admin_contact_events;
  v_text CONSTANT TEXT := 'Quoska darf mir per E-Mail Einstiegshilfe anbieten und nach längerer Nichtnutzung um Feedback bitten. Dafür berücksichtigen wir, wann du und dein Team zuletzt aktiv waren. Freiwillig und jederzeit in den Einstellungen widerrufbar.';
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  IF p_enabled IS NULL OR p_source IS NULL OR p_source NOT IN ('setup', 'settings')
    OR p_version IS DISTINCT FROM 'admin-checkin-v1' THEN
    RAISE EXCEPTION 'invalid preference' USING ERRCODE = '22023';
  END IF;
  -- Serialize preferences, including simultaneous grants and withdrawals.
  PERFORM pg_advisory_xact_lock(hashtextextended('admin-contact:' || v_user::text, 0));
  SELECT * INTO v_account FROM auth.users WHERE id = v_user FOR UPDATE;
  IF v_account.id IS NULL OR v_account.email IS NULL THEN
    RAISE EXCEPTION 'account required' USING ERRCODE = '42501';
  END IF;
  IF p_enabled AND (v_account.email_confirmed_at IS NULL
    OR (v_account.banned_until IS NOT NULL AND v_account.banned_until > now())
    OR NOT EXISTS (SELECT 1 FROM public.employees WHERE user_id = v_user AND role = 'admin' AND deleted_at IS NULL)) THEN
    RAISE EXCEPTION 'verified active admin required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_event FROM public.admin_contact_events WHERE user_id = v_user ORDER BY id DESC LIMIT 1;
  -- A missing preference is already off. Repeated submissions do not create
  -- extra events, and a changed address needs a new affirmative submission.
  IF (v_event.id IS NULL AND NOT p_enabled) OR
    (v_event.enabled = p_enabled AND (NOT p_enabled OR
      (v_event.email = v_account.email AND v_event.text_version = p_version))) THEN
    RETURN public.get_admin_contact_preference();
  END IF;
  INSERT INTO public.admin_contact_events(user_id, email, enabled, text_version, consent_text, source)
    VALUES (v_user, v_account.email, p_enabled, p_version, v_text, p_source);
  RETURN public.get_admin_contact_preference();
END;
$$;
REVOKE ALL ON FUNCTION public.set_admin_contact_preference(BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_admin_contact_preference(BOOLEAN, TEXT, TEXT) TO authenticated;
