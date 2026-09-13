import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso, getTodayDate } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { dismissCockpitActions } from "@/services/cockpitDismissalService";
import { cockpitDismissalSchema } from "@/types/cockpit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await getEmployeeFromAuth(supabase);
    if (!auth.data) return NextResponse.json({ data: null, error: auth.error }, { status: 401 });
    if (auth.data.role !== "admin") {
      return NextResponse.json({ data: null, error: "Nur Admins können Hinweise ausblenden." }, { status: 403 });
    }
    const parsed = cockpitDismissalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "Ungültige Auswahl." }, { status: 400 });
    }
    const result = await dismissCockpitActions(
      supabase, auth.data.tenantId, auth.data.employeeId, parsed.data, getTodayDate(), getNowIso(),
    );
    return NextResponse.json(result, { status: result.data ? 200 : 409 });
  } catch (error) {
    console.error("Cockpit dismissal error:", error);
    return NextResponse.json({ data: null, error: "Hinweise konnten nicht ausgeblendet werden." }, { status: 500 });
  }
}
