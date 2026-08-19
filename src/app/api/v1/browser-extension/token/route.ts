import { NextResponse } from "next/server";
import { isAllowedBrowserExtensionRedirect } from "@/config/server/browser-extension";
import {
  authenticateBrowserExtension,
  exchangeBrowserExtensionAuthorizationCode,
  revokeBrowserExtensionToken,
} from "@/services/browserExtensionAuthService";
import type { ApiResponse } from "@/types/api";
import {
  browserExtensionTokenExchangeSchema,
  type BrowserExtensionTokenResponse,
} from "@/types/browser-extension";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = browserExtensionTokenExchangeSchema.safeParse(body);
  if (!parsed.success || !isAllowedBrowserExtensionRedirect(parsed.data.redirectUri)) {
    return NextResponse.json<ApiResponse<BrowserExtensionTokenResponse>>(
      { data: null, error: "Ungültige Verbindungsdaten." },
      { status: 400 },
    );
  }

  const result = await exchangeBrowserExtensionAuthorizationCode(parsed.data);
  return NextResponse.json<ApiResponse<BrowserExtensionTokenResponse>>(result, {
    status: result.data ? 201 : 400,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function DELETE(request: Request) {
  const authResult = await authenticateBrowserExtension(request, "clock:read");
  if (!authResult.data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const result = await revokeBrowserExtensionToken(authResult.data);
  if (!result.data) {
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: result.error },
      { status: 500 },
    );
  }
  return new NextResponse(null, { status: 204 });
}
