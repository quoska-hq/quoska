/**
 * GET /api/v1/leave-entitlements/me — Get own leave balance.
 */

import { getTodayDate } from "@/config/server/timestamps";
import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { getLeaveBalance } from "@/services/leaveService";
import type { ApiResponse } from "@/types/api";
import type { LeaveBalance } from "@/types/leave";

export async function GET() {
  try {
    const supabase = await createClient();

    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<LeaveBalance>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;
    const year = Number(getTodayDate().slice(0, 4));
    const balance = await getLeaveBalance(supabase, tenantId, employeeId, year);

    return NextResponse.json<ApiResponse<LeaveBalance>>(
      { data: balance, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Leave balance error:", error);
    return NextResponse.json<ApiResponse<LeaveBalance>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
