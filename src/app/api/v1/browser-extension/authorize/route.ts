import { NextResponse } from "next/server";
import { serverEnv } from "@/config/env";
import { isAllowedBrowserExtensionRedirect } from "@/config/server/browser-extension";
import { createClient } from "@/config/supabase/server";
import { addExtensionCallbackParams } from "@/lib/browser-extension-auth";
import { issueBrowserExtensionAuthorizationCode } from "@/services/browserExtensionAuthService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { browserExtensionAuthorizationSchema } from "@/types/browser-extension";

export async function POST(request: Request) {
  const configuredOrigin = new URL(serverEnv.NEXT_PUBLIC_APP_URL).origin;
  const requestOrigin = new URL(request.url).origin;
  const formOrigin = request.headers.get("origin");
  if (
    !formOrigin ||
    (formOrigin !== configuredOrigin && formOrigin !== requestOrigin)
  ) {
    return NextResponse.json(
      { data: null, error: "Ungültige Anfrage." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const parsed = browserExtensionAuthorizationSchema.safeParse({
    redirectUri: formData.get("redirect_uri"),
    state: formData.get("state"),
    codeChallenge: formData.get("code_challenge"),
  });
  if (!parsed.success || !isAllowedBrowserExtensionRedirect(parsed.data.redirectUri)) {
    return NextResponse.json(
      { data: null, error: "Ungültige Verbindungsanfrage." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const [{ data: userData }, employeeResult] = await Promise.all([
    supabase.auth.getUser(),
    getEmployeeFromAuth(supabase),
  ]);
  if (!userData.user || !employeeResult.data) {
    return NextResponse.json(
      { data: null, error: "Nicht authentifiziert" },
      { status: 401 },
    );
  }

  const codeResult = await issueBrowserExtensionAuthorizationCode(
    {
      userId: userData.user.id,
      tenantId: employeeResult.data.tenantId,
      employeeId: employeeResult.data.employeeId,
    },
    parsed.data.redirectUri,
    parsed.data.codeChallenge,
  );
  if (!codeResult.data) {
    return NextResponse.json(codeResult, { status: 500 });
  }

  const callback = addExtensionCallbackParams(parsed.data.redirectUri, {
    code: codeResult.data,
    state: parsed.data.state,
  });
  return NextResponse.redirect(callback, 303);
}
