import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";

const updateSchema = z.object({ automaticBreaksEnabled: z.boolean() });

export async function GET() {
  const supabase = await createClient();
  const authResult = await getEmployeeFromAuth(supabase);
  if (!authResult.data) {
    return NextResponse.json({ data: null, error: authResult.error }, { status: 401 });
  }

  const { data } = await createAdminClient()
    .from("tenants")
    .select("automatic_breaks_enabled")
    .eq("id", authResult.data.tenantId)
    .single();

  return NextResponse.json({
    data: { automaticBreaksEnabled: data?.automatic_breaks_enabled ?? true },
    error: null,
  });
}
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const authResult = await getEmployeeFromAuth(supabase);
  if (!authResult.data) {
    return NextResponse.json({ data: null, error: authResult.error }, { status: 401 });
  }
  if (authResult.data.role !== "admin") {
    return NextResponse.json({ data: null, error: "Nur Administratoren können diese Einstellung ändern" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Ungültige Einstellung" }, { status: 400 });
  }

  const { data, error } = await createAdminClient()
    .from("tenants")
    .update({ automatic_breaks_enabled: parsed.data.automaticBreaksEnabled })
    .eq("id", authResult.data.tenantId)
    .select("automatic_breaks_enabled")
    .single();
  if (error || !data) {
    return NextResponse.json({ data: null, error: "Einstellung konnte nicht gespeichert werden" }, { status: 500 });
  }

  return NextResponse.json({
    data: { automaticBreaksEnabled: data.automatic_breaks_enabled },
    error: null,
  });
}
