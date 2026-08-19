import type { SupabaseClient } from "@supabase/supabase-js";
import { getNowIso } from "@/config/server/timestamps";
import type { ApiResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { BrowserExtensionConnection } from "@/types/browser-extension";

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
