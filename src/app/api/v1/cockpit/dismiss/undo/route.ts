import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { undoCockpitDismissal } from "@/repos/cockpitDismissalRepo";
import { cockpitUndoSchema } from "@/types/cockpit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await getEmployeeFromAuth(supabase);
    if (!auth.data) return NextResponse.json({ data: null, error: auth.error }, { status: 401 });
    if (auth.data.role !== "admin") return NextResponse.json({ data: null, error: "Nur Admins können Hinweise wiederherstellen." }, { status: 403 });
    const parsed = cockpitUndoSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ data: null, error: "Ungültige Auswahl." }, { status: 400 });
    const restoredCount = await undoCockpitDismissal(supabase, auth.data.tenantId, auth.data.employeeId, parsed.data.undoToken);
    if (restoredCount === 0) return NextResponse.json({ data: null, error: "Die Zeit zum Rückgängigmachen ist abgelaufen oder die Hinweise wurden bereits wiederhergestellt." }, { status: 409 });
    return NextResponse.json({ data: { restoredCount }, error: null });
  } catch (error) {
    console.error("Cockpit undo error:", error);
    return NextResponse.json({ data: null, error: "Hinweise konnten nicht wiederhergestellt werden." }, { status: 500 });
  }
}
