import type { SupabaseClient } from "@supabase/supabase-js";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { BrowserExtensionConnection } from "@/types/browser-extension";
import type { BrowserExtensionPromotionStatus } from "@/types/browser-extension";

interface ConnectionAccessContext {
  tenantId: string;
  employeeId: string;
  role: string;
}
interface TokenRow {
  id: string;
  employee_id: string;
  extension_id: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
}

export async function listBrowserExtensionConnections(
  admin: SupabaseClient,
  context: ConnectionAccessContext,
): Promise<ApiResponse<BrowserExtensionConnection[]>> {
  let tokenQuery = admin
    .from("browser_extension_tokens")
    .select("id, employee_id, extension_id, created_at, last_used_at, expires_at")
    .eq("tenant_id", context.tenantId)
    .gt("expires_at", getNowIso())
    .is("revoked_at", null)
    .is("deleted_at", null)
    .order("last_used_at", { ascending: false, nullsFirst: false });

  if (context.role !== "admin") {
    tokenQuery = tokenQuery.eq("employee_id", context.employeeId);
  }

  const { data, error } = await tokenQuery;
  if (error) {
    console.error("Browser extension connection list failed", error);
    return failure("Browser-Verbindungen konnten nicht geladen werden.");
  }
  const tokens = (data ?? []) as TokenRow[];
  if (tokens.length === 0) return success([]);

  const employeeIds = [...new Set(tokens.map((token) => token.employee_id))];
  const { data: employees, error: employeeError } = await admin
    .from("employees")
    .select("id, first_name, last_name")
    .eq("tenant_id", context.tenantId)
    .in("id", employeeIds);
  if (employeeError) {
    console.error("Browser extension connection employees failed", employeeError);
    return failure("Browser-Verbindungen konnten nicht geladen werden.");
  }

  const names = new Map(
    (employees ?? []).map((employee) => [
      employee.id,
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Quoska-Nutzer",
    ]),
  );
  return success(tokens.map((token) => ({
    id: token.id,
    employeeName: names.get(token.employee_id) ?? "Quoska-Nutzer",
    extensionId: token.extension_id,
    createdAt: token.created_at,
    lastUsedAt: token.last_used_at,
    expiresAt: token.expires_at,
  })));
}

export async function revokeManagedBrowserExtensionConnection(
  admin: SupabaseClient,
  context: ConnectionAccessContext,
  connectionId: string,
): Promise<ApiResponse<boolean>> {
  const nowIso = getNowIso();
  let query = admin
    .from("browser_extension_tokens")
    .update({ revoked_at: nowIso, updated_at: nowIso })
    .eq("id", connectionId)
    .eq("tenant_id", context.tenantId)
    .is("revoked_at", null)
    .is("deleted_at", null);
  if (context.role !== "admin") {
    query = query.eq("employee_id", context.employeeId);
  }

  const { data, error } = await query.select("id").maybeSingle();
  if (error) {
    console.error("Browser extension connection revocation failed", error);
    return failure("Browser-Verbindung konnte nicht getrennt werden.");
  }
  return data
    ? success(true)
    : failure("Browser-Verbindung nicht gefunden.");
}

export async function getBrowserExtensionPromotionStatus(
  admin: SupabaseClient,
  context: ConnectionAccessContext,
): Promise<ApiResponse<BrowserExtensionPromotionStatus>> {
  const nowIso = getNowIso();
  const [employeeResult, entryResult, tokenResult] = await Promise.all([
    admin
      .from("employees")
      .select("browser_extension_promo_dismissed_at")
      .eq("id", context.employeeId)
      .eq("tenant_id", context.tenantId)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("time_entries")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", context.employeeId)
      .eq("entry_source", "clock")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
    admin
      .from("browser_extension_tokens")
      .select("id")
      .eq("tenant_id", context.tenantId)
      .eq("employee_id", context.employeeId)
      .gt("expires_at", nowIso)
      .is("revoked_at", null)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
  ]);

  if (employeeResult.error || entryResult.error || tokenResult.error || !employeeResult.data) {
    console.error("Browser extension promotion status failed", {
      employee: employeeResult.error,
      entry: entryResult.error,
      token: tokenResult.error,
    });
    return failure("Browser-Erweiterungshinweis konnte nicht geladen werden.");
  }

  const hasClockEntry = Boolean(entryResult.data);
  const connected = Boolean(tokenResult.data);
  const dismissed = Boolean(employeeResult.data.browser_extension_promo_dismissed_at);
  return success(buildBrowserExtensionPromotionStatus({
    hasClockEntry,
    connected,
    dismissed,
  }));
}

export function buildBrowserExtensionPromotionStatus(input: {
  hasClockEntry: boolean;
  connected: boolean;
  dismissed: boolean;
}): BrowserExtensionPromotionStatus {
  return {
    eligible: input.hasClockEntry && !input.connected && !input.dismissed,
    ...input,
  };
}

export async function dismissBrowserExtensionPromotion(
  admin: SupabaseClient,
  context: ConnectionAccessContext,
): Promise<ApiResponse<boolean>> {
  const { data, error } = await admin
    .from("employees")
    .update({ browser_extension_promo_dismissed_at: getNowIso() })
    .eq("id", context.employeeId)
    .eq("tenant_id", context.tenantId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Browser extension promotion dismissal failed", error);
    return failure("Browser-Erweiterungshinweis konnte nicht geschlossen werden.");
  }
  return data
    ? success(true)
    : failure("Mitarbeiterprofil nicht gefunden.");
}
