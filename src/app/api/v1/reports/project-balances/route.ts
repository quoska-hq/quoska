import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getTodayDate } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getProjectBalances } from "@/services/projectBalanceService";
import { failure, success } from "@/types/api";
import { projectBalanceQuerySchema } from "@/types/project-balance";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await getEmployeeFromAuth(supabase);
    if (!auth.data) {
      return NextResponse.json(failure(auth.error ?? "Nicht angemeldet."), { status: 401 });
    }
    const { tenantId, role } = auth.data;
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(failure("Keine Berechtigung."), { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = projectBalanceQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(failure("Ungültiger Zeitraum oder Filter für die Projektkonten."), { status: 400 });
    }

    return NextResponse.json(success(await getProjectBalances(supabase, tenantId, parsed.data, getTodayDate())));
  } catch (error) {
    console.error("Project balances report error:", error);
    return NextResponse.json(failure("Projektkonten konnten nicht geladen werden."), { status: 500 });
  }
}
