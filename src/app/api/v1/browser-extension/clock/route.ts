import { NextResponse } from "next/server";
import { authenticateBrowserExtension } from "@/services/browserExtensionAuthService";
import { performBrowserExtensionClockAction } from "@/services/browserExtensionClockService";
import type { ApiResponse } from "@/types/api";
import {
  browserExtensionClockActionSchema,
  type BrowserExtensionStatus,
} from "@/types/browser-extension";

export async function POST(request: Request) {
  const authResult = await authenticateBrowserExtension(request, "clock:write");
  if (!authResult.data) {
    return NextResponse.json<ApiResponse<BrowserExtensionStatus>>(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = browserExtensionClockActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse<BrowserExtensionStatus>>(
      { data: null, error: "Ungültige Aktion." },
      { status: 400 },
    );
  }

  const context = authResult.data;
  const result = await performBrowserExtensionClockAction(
    context.supabase,
    { tenantId: context.tenantId, employeeId: context.employeeId },
    parsed.data,
  );
  return NextResponse.json<ApiResponse<BrowserExtensionStatus>>(result, {
    status: result.data ? 200 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}
