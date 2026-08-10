/**
 * /auth/callback — PKCE authentication redirect target.
 *
 * After OAuth or a default Supabase email template redirects back with
 * ?code=…, this route exchanges it for a cookie-backed session. Explicit,
 * validated `next` paths are used by setup and recovery flows. Otherwise we
 * route based on whether the user has a tenant/employee yet:
 *   - Returning user (has employee) → /app/dashboard
 *   - First-time Google signup (no employee yet) → /setup (wizard creates
 *     their tenant using their Google identity)
 *
 * Branded Quoska emails normally use the scanner-safe /auth/confirm page.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app/dashboard";
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const appUrl = serverEnv.NEXT_PUBLIC_APP_URL;

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", appUrl));
  }

  const supabase = await createClient();

  // Exchange the OAuth code for a session (sets the auth cookie).
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth", appUrl));
  }

  // Setup and recovery deliberately provide a same-origin path. Handle it
  // before the first-time OAuth fallback so an unfinished founder can still
  // reset their password.
  if (next !== "/app/dashboard") {
    return NextResponse.redirect(new URL(next, appUrl));
  }

  // Decide where to send them based on whether they have an employee record.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    // No employee → brand-new Google signup → run the setup wizard, which
    // creates their tenant + admin employee (reuses /api/v1/auth/register).
    if (!employee) {
      return NextResponse.redirect(new URL("/setup", appUrl));
    }
  }

  // Returning user → straight to the app.
  return NextResponse.redirect(new URL(next, appUrl));
}
