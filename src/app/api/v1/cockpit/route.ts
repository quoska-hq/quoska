import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getNowIso, getTodayDate } from "@/config/server/timestamps";
import { addDays } from "@/services/holidayService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getAdminCockpit } from "@/services/cockpitService";
import { cockpitQuerySchema, type CockpitData } from "@/types/cockpit";
import type { ApiResponse } from "@/types/api";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await getEmployeeFromAuth(supabase);
    if (!auth.data) {
      return NextResponse.json<ApiResponse<CockpitData>>(
        { data: null, error: auth.error },
        { status: 401 },
      );
    }
    if (auth.data.role !== "admin") {
      return NextResponse.json<ApiResponse<CockpitData>>(
        { data: null, error: "Nur Admins können das Cockpit aufrufen." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = cockpitQuerySchema.safeParse({
      days: searchParams.get("days") ?? "7",
      employeeId: searchParams.get("employeeId") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<CockpitData>>(
        { data: null, error: parsed.error.issues[0]?.message ?? "Ungültige Parameter." },
        { status: 400 },
      );
    }

    const days = parsed.data.days as 7 | 30;
    const endDate = getTodayDate();
    const startDate = addDays(endDate, -(days - 1));
    const result = await getAdminCockpit(
      supabase,
      auth.data.tenantId,
      startDate,
      endDate,
      days,
      getNowIso(),
      parsed.data.employeeId,
    );
    return NextResponse.json<ApiResponse<CockpitData>>(result, {
      status: result.data ? 200 : 404,
    });
  } catch (error) {
    console.error("Cockpit error:", error);
    return NextResponse.json<ApiResponse<CockpitData>>(
      { data: null, error: "Cockpit-Daten konnten nicht geladen werden." },
      { status: 500 },
    );
  }
}
