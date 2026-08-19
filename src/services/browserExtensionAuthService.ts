import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/config/supabase/server";
import { getNowIso } from "@/config/server/timestamps";
import {
  derivePkceChallenge,
  generateBrowserExtensionToken,
  generateUrlSafeSecret,
  getBrowserExtensionBearerToken,
  hashBrowserExtensionSecret,
} from "@/lib/browser-extension-auth";
import type { ApiResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { BrowserExtensionTokenResponse } from "@/types/browser-extension";

type BrowserExtensionScope = "clock:read" | "clock:write";

interface ExtensionAuthorizationContext {
  userId: string;
  tenantId: string;
  employeeId: string;
}

export interface BrowserExtensionAuthContext extends ExtensionAuthorizationContext {
  supabase: SupabaseClient;
  tokenId: string;
}

interface ConsumedAuthorizationCode {
  authorization_code_id: string;
  user_id: string;
  tenant_id: string;
  employee_id: string;
  code_challenge: string;
  redirect_uri: string;
}

export async function issueBrowserExtensionAuthorizationCode(
  context: ExtensionAuthorizationContext,
  redirectUri: string,
  codeChallenge: string,
): Promise<ApiResponse<string>> {
  const code = generateUrlSafeSecret();
  const admin = createAdminClient();
  const { error } = await admin
    .from("browser_extension_authorization_codes")
    .insert({
      user_id: context.userId,
      tenant_id: context.tenantId,
      employee_id: context.employeeId,
      code_hash: hashBrowserExtensionSecret(code),
      code_challenge: codeChallenge,
      redirect_uri: redirectUri,
    });

  if (error) {
    console.error("Browser extension authorization code creation failed", error);
    return failure("Verbindung konnte nicht vorbereitet werden.");
  }

  return success(code);
}

export async function exchangeBrowserExtensionAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<ApiResponse<BrowserExtensionTokenResponse>> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "consume_browser_extension_authorization_code",
    {
      p_code_hash: hashBrowserExtensionSecret(input.code),
      p_redirect_uri: input.redirectUri,
      p_code_challenge: derivePkceChallenge(input.codeVerifier),
    },
  );
  const consumed = (data?.[0] ?? null) as ConsumedAuthorizationCode | null;

  if (error || !consumed) {
    return failure("Der Verbindungscode ist ungültig oder abgelaufen.");
  }

  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("id", consumed.employee_id)
    .eq("tenant_id", consumed.tenant_id)
    .eq("user_id", consumed.user_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!employee) {
    return failure("Das Mitarbeiterkonto ist nicht mehr aktiv.");
  }

  const accessToken = generateBrowserExtensionToken();
  const extensionId = new URL(consumed.redirect_uri).hostname.split(".")[0];
  const { data: token, error: tokenError } = await admin
    .from("browser_extension_tokens")
    .insert({
      user_id: consumed.user_id,
      tenant_id: consumed.tenant_id,
      employee_id: consumed.employee_id,
      extension_id: extensionId,
      token_hash: hashBrowserExtensionSecret(accessToken),
    })
    .select("expires_at")
    .single();

  if (tokenError || !token) {
    console.error("Browser extension token creation failed", tokenError);
    return failure("Verbindung konnte nicht abgeschlossen werden.");
  }

  return success({
    accessToken,
    tokenType: "Bearer",
    expiresAt: token.expires_at,
  });
}

export async function authenticateBrowserExtension(
  request: Request,
  requiredScope: BrowserExtensionScope,
): Promise<ApiResponse<BrowserExtensionAuthContext>> {
  const accessToken = getBrowserExtensionBearerToken(request);
  if (!accessToken) return failure("Nicht authentifiziert");

  const admin = createAdminClient();
  const nowIso = getNowIso();
  const { data: token } = await admin
    .from("browser_extension_tokens")
    .select("id, user_id, tenant_id, employee_id, scopes")
    .eq("token_hash", hashBrowserExtensionSecret(accessToken))
    .gt("expires_at", nowIso)
    .is("revoked_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (!token || !token.scopes?.includes(requiredScope)) {
    return failure("Nicht authentifiziert");
  }

  const { data: employee } = await admin
    .from("employees")
    .select("id")
    .eq("id", token.employee_id)
    .eq("tenant_id", token.tenant_id)
    .eq("user_id", token.user_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!employee) return failure("Nicht authentifiziert");

  await admin
    .from("browser_extension_tokens")
    .update({ last_used_at: nowIso, updated_at: nowIso })
    .eq("id", token.id);

  return success({
    supabase: admin,
    tokenId: token.id,
    userId: token.user_id,
    tenantId: token.tenant_id,
    employeeId: token.employee_id,
  });
}

export async function revokeBrowserExtensionToken(
  context: BrowserExtensionAuthContext,
): Promise<ApiResponse<boolean>> {
  const nowIso = getNowIso();
  const { error } = await context.supabase
    .from("browser_extension_tokens")
    .update({ revoked_at: nowIso, updated_at: nowIso })
    .eq("id", context.tokenId)
    .eq("employee_id", context.employeeId);
  return error
    ? failure("Verbindung konnte nicht getrennt werden.")
    : success(true);
}
