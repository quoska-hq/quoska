import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { setupComplete } = body;

    if (typeof setupComplete !== "boolean") {
      return NextResponse.json(
        { data: null, error: "setupComplete ist erforderlich" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Nicht angemeldet" },
        { status: 401 },
      );
    }

    if (serverEnv.NODE_ENV === "production" && !user.email_confirmed_at) {
      return NextResponse.json(
        { data: null, error: "Bitte bestätige zuerst deine E-Mail-Adresse." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();

    const { data: employee } = await admin
      .from("employees")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (!employee || employee.role !== "admin") {
      return NextResponse.json(
        { data: null, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    const { error } = await admin
      .from("tenants")
      .update({ setup_complete: setupComplete })
      .eq("id", employee.tenant_id);

    if (error) {
      return NextResponse.json(
        { data: null, error: "Fehler beim Abschließen der Einrichtung" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { success: true }, error: null });
  } catch {
    return NextResponse.json(
      { data: null, error: "Unerwarteter Fehler" },
      { status: 500 },
    );
  }
}
