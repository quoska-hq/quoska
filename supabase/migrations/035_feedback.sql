-- Functional UI state: count distinct German calendar days, stop after the
-- invitation is handled. No navigation or interaction history is stored.
CREATE TABLE public.feedback_prompt_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_days SMALLINT NOT NULL DEFAULT 1 CHECK (active_days BETWEEN 1 AND 3),
  last_active_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Berlin')::date,
  handled_at TIMESTAMPTZ
);
ALTER TABLE public.feedback_prompt_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feedback_prompt_state FROM anon, authenticated;
GRANT SELECT ON public.feedback_prompt_state TO authenticated;
GRANT ALL ON public.feedback_prompt_state TO service_role;
CREATE POLICY feedback_prompt_read_own ON public.feedback_prompt_state
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.feedback_prompt(p_action TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user UUID := auth.uid();
  v_today DATE := (now() AT TIME ZONE 'Europe/Berlin')::date;
  v_state public.feedback_prompt_state;
  v_claimed BOOLEAN := false;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.employees WHERE user_id = v_user AND deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  IF p_action NOT IN ('visit', 'claim', 'dismiss') OR p_action IS NULL THEN
    RAISE EXCEPTION 'invalid action' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'visit' THEN
    INSERT INTO public.feedback_prompt_state (user_id, last_active_date)
      VALUES (v_user, v_today)
      ON CONFLICT (user_id) DO UPDATE SET
        active_days = LEAST(3, feedback_prompt_state.active_days +
          CASE WHEN feedback_prompt_state.last_active_date < v_today THEN 1 ELSE 0 END),
        last_active_date = GREATEST(feedback_prompt_state.last_active_date, v_today)
      WHERE feedback_prompt_state.handled_at IS NULL;
  ELSIF p_action = 'dismiss' THEN
    INSERT INTO public.feedback_prompt_state (user_id, handled_at)
      VALUES (v_user, now())
      ON CONFLICT (user_id) DO UPDATE SET handled_at = COALESCE(feedback_prompt_state.handled_at, now());
  ELSE
    -- Claim before rendering: competing tabs/devices cannot show it twice.
    UPDATE public.feedback_prompt_state SET handled_at = now()
      WHERE user_id = v_user AND active_days >= 3 AND handled_at IS NULL;
    v_claimed := FOUND;
  END IF;
  SELECT * INTO v_state FROM public.feedback_prompt_state WHERE user_id = v_user;
  RETURN jsonb_build_object('eligible', COALESCE(v_state.active_days >= 3 AND v_state.handled_at IS NULL, false), 'claimed', v_claimed);
END;
$$;
REVOKE ALL ON FUNCTION public.feedback_prompt(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feedback_prompt(TEXT) TO authenticated;

-- Durable submissions also remain available to the operator if SMTP fails.
CREATE TABLE public.feedback_messages (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('feedback', 'bug', 'feature')),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 4000),
  page TEXT NOT NULL CHECK (char_length(page) <= 100 AND page ~ '^/app/[a-z/-]+$'),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX feedback_messages_user_date ON public.feedback_messages(user_id, created_at DESC);
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feedback_messages FROM anon, authenticated;
GRANT SELECT ON public.feedback_messages TO authenticated;
GRANT ALL ON public.feedback_messages TO service_role;
CREATE POLICY feedback_messages_read_own ON public.feedback_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.submit_feedback(p_id UUID, p_category TEXT, p_message TEXT, p_page TEXT)
RETURNS public.feedback_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user UUID := auth.uid();
  v_employee public.employees;
  v_email TEXT;
  v_row public.feedback_messages;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_employee FROM public.employees WHERE user_id = v_user AND deleted_at IS NULL;
  SELECT email INTO v_email FROM auth.users WHERE id = v_user AND email_confirmed_at IS NOT NULL;
  IF v_employee.id IS NULL OR v_email IS NULL THEN
    RAISE EXCEPTION 'verified account required' USING ERRCODE = '42501';
  END IF;
  -- Serialize per sender so concurrent requests cannot bypass the daily limit.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  SELECT * INTO v_row FROM public.feedback_messages WHERE id = p_id;
  IF FOUND THEN
    IF v_row.user_id <> v_user OR v_row.category <> p_category OR v_row.message <> btrim(p_message) OR v_row.page <> p_page THEN
      RAISE EXCEPTION 'submission conflict' USING ERRCODE = '23505';
    END IF;
    RETURN v_row;
  END IF;
  IF (SELECT count(*) FROM public.feedback_messages WHERE user_id = v_user AND created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'feedback limit reached' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.feedback_messages(id, user_id, tenant_id, employee_id, sender_name, sender_email, category, message, page)
    VALUES (p_id, v_user, v_employee.tenant_id, v_employee.id,
      btrim(v_employee.first_name || ' ' || v_employee.last_name), v_email, p_category, btrim(p_message), p_page)
    RETURNING * INTO v_row;
  PERFORM public.feedback_prompt('dismiss');
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_feedback(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_feedback(UUID, TEXT, TEXT, TEXT) TO authenticated;
