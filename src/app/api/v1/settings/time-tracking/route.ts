import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { updateTimeTrackingSettingsSchema } from "@/types/time-tracking";

const settingsColumns = "automatic_breaks_enabled,missing_time_approval_required";

export async function GET() {
  const supabase = await createClient();
  const authResult = await getEmployeeFromAuth(supabase);
  if (!authResult.data) {
    return NextResponse.json({ data: null, error: authResult.error }, { status: 401 });
  }

  const { data, error } = await createAdminClient()
    .from("tenants")
    .select(settingsColumns)
    .eq("id", authResult.data.tenantId)
    .single();
  if (error || !data) {
    return NextResponse.json({ data: null, error: "Einstellungen konnten nicht geladen werden" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      automaticBreaksEnabled: data.automatic_breaks_enabled,
      missingTimeApprovalRequired: data.missing_time_approval_required,
    },
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

  const parsed = updateTimeTrackingSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: "Ungültige Einstellung" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: actor } = await admin.from("employees").select("id")
    .eq("id", authResult.data.employeeId).eq("tenant_id", authResult.data.tenantId)
    .eq("role", "admin").is("deleted_at", null).maybeSingle();
  if (!actor) {
    return NextResponse.json({ data: null, error: "Nur Administratoren können diese Einstellung ändern" }, { status: 403 });
  }

  const { automaticBreaksEnabled, missingTimeApprovalRequired } = parsed.data;
  const { data, error } = await admin
    .from("tenants")
    .update({
      ...(automaticBreaksEnabled === undefined ? {} : { automatic_breaks_enabled: automaticBreaksEnabled }),
      ...(missingTimeApprovalRequired === undefined ? {} : { missing_time_approval_required: missingTimeApprovalRequired }),
    })
    .eq("id", authResult.data.tenantId)
    .select(settingsColumns)
    .single();
  if (error || !data) {
    return NextResponse.json({ data: null, error: "Einstellung konnte nicht gespeichert werden" }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      automaticBreaksEnabled: data.automatic_breaks_enabled,
      missingTimeApprovalRequired: data.missing_time_approval_required,
    },
    error: null,
  });
}
