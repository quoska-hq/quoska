import { NextResponse } from "next/server";
import { serverEnv } from "@/config/env";
import { createClient } from "@/config/supabase/server";
import { contactPreferenceSchema } from "@/types/contact-preferences";

function reply(data: unknown, error: string | null = null, status = 200) {
  return NextResponse.json({ data, error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function handle(request?: Request) {
  try {
    if (request && (request.headers.get("sec-fetch-site") === "cross-site"
      || (request.headers.has("origin") && request.headers.get("origin") !== new URL(serverEnv.NEXT_PUBLIC_APP_URL).origin))) {
      return reply(null, "Anfrage nicht erlaubt.", 403);
    }
    const client = await createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply(null, "Bitte melde dich erneut an.", 401);
    let result;
    if (request) {
      const body = await request.text();
      if (body.length > 1024) return reply(null, "Anfrage zu groß.", 413);
      const parsed = contactPreferenceSchema.safeParse(JSON.parse(body));
      if (!parsed.success) return reply(null, "Ungültige Einstellung. Bitte lade die Seite neu.", 400);
      result = await client.rpc("set_admin_contact_preference", {
        p_enabled: parsed.data.enabled, p_version: parsed.data.version, p_source: parsed.data.source,
      });
    } else {
      result = await client.rpc("get_admin_contact_preference");
    }
    // The database checks current roles, verified address and ownership, not JWT role claims.
    if (result.error || !result.data) {
      return reply(null, result.error?.code === "42501"
        ? "Nur bestätigte Admins können diese E-Mails aktivieren. Ein Widerruf bleibt möglich."
        : "Einstellung konnte nicht geladen oder gespeichert werden.", result.error?.code === "42501" ? 403 : 500);
    }
    return reply(result.data);
  } catch (error) {
    return reply(null, "Einstellung konnte nicht gespeichert werden. Bitte versuche es erneut.", error instanceof SyntaxError ? 400 : 500);
  }
}

export async function GET() { return handle(); }
export async function PATCH(request: Request) { return handle(request); }
