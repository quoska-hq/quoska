import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { onboardingUpdateSchema } from "@/types/onboarding";
import { getStartGuide, updateStartGuide } from "@/repos/onboardingRepo";

async function authenticate() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Re-read the current role; a stale JWT must not grant company-setting access.
  const { data: employee } = await supabase.from("employees").select("id,tenant_id,role")
    .eq("user_id", user.id).is("deleted_at", null).single();
  return employee?.role === "admin" ? employee : null;
}

export async function GET() {
  try {
    const employee = await authenticate();
    if (!employee) return NextResponse.json({ data: null, error: "Keine Berechtigung." }, { status: 403 });
    const data = await getStartGuide(createAdminClient(), employee.tenant_id, employee.id);
    return NextResponse.json({ data, error: null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ data: null, error: "Startliste konnte nicht geladen werden." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });
  try {
    const employee = await authenticate();
    if (!employee) return NextResponse.json({ data: null, error: "Keine Berechtigung." }, { status: 403 });
    const parsed = onboardingUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ data: null, error: "Ungültige Angabe." }, { status: 400 });
    const admin = createAdminClient();
    await updateStartGuide(admin, employee.tenant_id, employee.id, parsed.data);
    return NextResponse.json({ data: await getStartGuide(admin, employee.tenant_id, employee.id), error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Änderung konnte nicht gespeichert werden. Bitte erneut versuchen." }, { status: 503 });
  }
}
