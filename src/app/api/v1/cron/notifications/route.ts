/**
 * POST /api/v1/cron/notifications
 *
 * Cron job: Send compliance notifications.
 * - Forgot clock-out: employees with running entries >10h
 * - Break reminder: employees working >5h45m without break
 *
 * Runs every 15 minutes. Protected by CRON_SECRET.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/config/supabase/server";
import { runComplianceNotifications } from "@/services/notificationService";
import { getNowIso } from "@/config/server/timestamps";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import type { ApiResponse } from "@/types/api";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Nicht autorisiert." },
        { status: 401 },
      );
    }

    // Scheduled calls have no user session. The service-role client is limited
    // to this authenticated system operation and bypasses tenant RLS here.
    const supabase = createAdminClient();
    const nowIso = getNowIso();

    const result = await runComplianceNotifications(supabase, nowIso);

    return NextResponse.json<
      ApiResponse<{
        forgotClockOuts: number;
        breakReminders: number;
      }>
    >(
      { data: result, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Notification cron error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
