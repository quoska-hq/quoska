import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { listBrowserExtensionConnections } from "@/services/browserExtensionConnectionService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";
import type { BrowserExtensionConnection } from "@/types/browser-extension";

export async function GET() {
  const supabase = await createClient();
  const authResult = await getEmployeeFromAuth(supabase);
  if (!authResult.data) {
    return NextResponse.json<ApiResponse<BrowserExtensionConnection[]>>(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const result = await listBrowserExtensionConnections(
    createAdminClient(),
    authResult.data,
  );
  return NextResponse.json<ApiResponse<BrowserExtensionConnection[]>>(result, {
    status: result.data ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
