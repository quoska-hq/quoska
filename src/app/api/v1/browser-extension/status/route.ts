import { NextResponse } from "next/server";
import { authenticateBrowserExtension } from "@/services/browserExtensionAuthService";
import { getBrowserExtensionStatus } from "@/services/browserExtensionClockService";
import type { ApiResponse } from "@/types/api";
import type { BrowserExtensionStatus } from "@/types/browser-extension";

export async function GET(request: Request) {
  const authResult = await authenticateBrowserExtension(request, "clock:read");
  if (!authResult.data) {
    return NextResponse.json<ApiResponse<BrowserExtensionStatus>>(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const context = authResult.data;
  const result = await getBrowserExtensionStatus(context.supabase, {
    tenantId: context.tenantId,
    employeeId: context.employeeId,
  });
  return NextResponse.json<ApiResponse<BrowserExtensionStatus>>(result, {
    status: result.data ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
