-- Browser extension authorization codes and revocable access tokens.
-- Plaintext codes/tokens are returned once and only SHA-256 hashes are stored.

CREATE TABLE public.browser_extension_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE CHECK (char_length(code_hash) = 64),
  code_challenge TEXT NOT NULL CHECK (char_length(code_challenge) = 43),
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.browser_extension_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  extension_id TEXT NOT NULL CHECK (extension_id ~ '^[a-p]{32}$'),
  token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  scopes TEXT[] NOT NULL DEFAULT ARRAY['clock:read', 'clock:write']::TEXT[],
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT browser_extension_token_scopes
    CHECK (scopes <@ ARRAY['clock:read', 'clock:write']::TEXT[])
);

CREATE INDEX idx_browser_extension_codes_expiry
  ON public.browser_extension_authorization_codes (expires_at)
  WHERE used_at IS NULL AND deleted_at IS NULL;

CREATE INDEX idx_browser_extension_tokens_employee
  ON public.browser_extension_tokens (employee_id)
  WHERE revoked_at IS NULL AND deleted_at IS NULL;

CREATE INDEX idx_browser_extension_tokens_expiry
  ON public.browser_extension_tokens (expires_at)
  WHERE revoked_at IS NULL AND deleted_at IS NULL;

ALTER TABLE public.browser_extension_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.browser_extension_tokens ENABLE ROW LEVEL SECURITY;

-- No end-user RLS policy is intentional. Only server-side service-role code may
-- issue, exchange, inspect, or revoke extension credentials.
REVOKE ALL ON TABLE public.browser_extension_authorization_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.browser_extension_tokens FROM anon, authenticated;
GRANT ALL ON TABLE public.browser_extension_authorization_codes TO service_role;
GRANT ALL ON TABLE public.browser_extension_tokens TO service_role;

-- Atomically marks an authorization code used so parallel exchanges cannot both
-- receive an access token. The server derives the PKCE challenge from the
-- verifier, and the function consumes only an exact challenge match.
CREATE OR REPLACE FUNCTION public.consume_browser_extension_authorization_code(
  p_code_hash TEXT,
  p_redirect_uri TEXT,
  p_code_challenge TEXT
)
RETURNS TABLE (
  authorization_code_id UUID,
  user_id UUID,
  tenant_id UUID,
  employee_id UUID,
  code_challenge TEXT,
  redirect_uri TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.browser_extension_authorization_codes AS authorization_code
  SET
    used_at = NOW(),
    updated_at = NOW()
  WHERE authorization_code.code_hash = p_code_hash
    AND authorization_code.redirect_uri = p_redirect_uri
    AND authorization_code.code_challenge = p_code_challenge
    AND authorization_code.used_at IS NULL
    AND authorization_code.deleted_at IS NULL
    AND authorization_code.expires_at > NOW()
  RETURNING
    authorization_code.id,
    authorization_code.user_id,
    authorization_code.tenant_id,
    authorization_code.employee_id,
    authorization_code.code_challenge,
    authorization_code.redirect_uri;
$$;

REVOKE ALL ON FUNCTION public.consume_browser_extension_authorization_code(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_browser_extension_authorization_code(TEXT, TEXT, TEXT)
  TO service_role;

COMMENT ON TABLE public.browser_extension_authorization_codes IS
  'Single-use, five-minute PKCE authorization codes for the Quoska browser extension.';
COMMENT ON TABLE public.browser_extension_tokens IS
  'Hashed, expiring and revocable bearer tokens scoped to browser-extension clock actions.';
