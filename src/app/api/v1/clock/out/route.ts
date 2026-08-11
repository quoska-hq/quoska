/**
 * POST /api/v1/clock/out
 *
 * Clock out — complete an active time entry.
 * Must be in 'running' status (not paused).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/config/supabase/server";
import { getNowIso } from "@/config/server/timestamps";
import { getEmployeeFromAuth, clockOut } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";

const clockOutBodySchema = z.object({
  timeEntryId: z.string().uuid("Ungültige Zeiteintrags-ID"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId } = authResult.data;

    // Validate input
    const body: unknown = await request.json();
    const parsed = clockOutBodySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    // Clock out
    const result = await clockOut(
      supabase,
      tenantId,
      employeeId,
      parsed.data.timeEntryId,
      getNowIso(),
    );

    if (!result.data) {
      let status = 500;
      if (result.error?.includes("nicht eingestempelt")) status = 404;
      if (result.error?.includes("Pause")) status = 400;
      if (result.error?.includes("nicht gefunden")) status = 404;

      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: result.error },
        { status },
      );
    }

    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Clock out error:", error);
    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
