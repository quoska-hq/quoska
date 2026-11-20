/**
 * PATCH /api/v1/time-entries/:id
 *
 * Manager edit of a time entry with mandatory reason.
 * Creates audit trail records for each changed field (Story 4.1).
 *
 * GET /api/v1/time-entries/:id
 *
 * Get a single time entry with its audit trail.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { cancelTimeEntry, editTimeEntry, getTimeEntryAuditTrail } from "@/services/timeEntryEditService";
import { cancelTimeEntrySchema, editTimeEntrySchema } from "@/types/correction";
import type { TimeEntryAuditDetails } from "@/types/correction";
import type { ApiResponse } from "@/types/api";
import type { TimeEntry } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Storno with a reason, preserving the original booking and audit. */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const auth = await getEmployeeFromAuth(supabase);
    if (!auth.data) return NextResponse.json({ data: null, error: auth.error }, { status: 401 });
    const { tenantId, employeeId, role } = auth.data;
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json({ data: null, error: "Keine Berechtigung zum Stornieren." }, { status: 403 });
    }
    const parsed = cancelTimeEntrySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const result = await cancelTimeEntry(supabase, tenantId, employeeId, id, parsed.data.reason);
    return NextResponse.json(result, { status: result.data ? 200 : 400 });
  } catch (error) {
    console.error("Time entry cancellation failed:", error);
    return NextResponse.json({ data: null, error: "Der Zeiteintrag konnte nicht storniert werden." }, { status: 500 });
  }
}

/**
 * PATCH — Edit a time entry (manager/admin only).
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    // Role check — only manager/admin can edit
    if (role === "employee") {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: "Nur Manager oder Administratoren können Zeiteinträge bearbeiten" },
        { status: 403 },
      );
    }

    // Validate input
    const body: unknown = await request.json();
    const parsed = editTimeEntrySchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: firstError?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }

    const { reason, ...changes } = parsed.data;

    // Check that at least one field is being changed
    if (Object.keys(changes).length === 0) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: "Keine Änderungen angegeben" },
        { status: 400 },
      );
    }

    // Apply edit with audit trail
    const result = await editTimeEntry(
      supabase,
      tenantId,
      employeeId,
      id,
      changes,
      reason,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<TimeEntry>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Time entry edit error:", error);
    return NextResponse.json<ApiResponse<TimeEntry>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

/**
 * GET — Retrieve a time entry's audit trail.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<TimeEntryAuditDetails[]>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { tenantId, employeeId, role } = authResult.data;

    const result = await getTimeEntryAuditTrail(
      supabase, tenantId, id, role === "employee" ? employeeId : undefined,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<TimeEntryAuditDetails[]>>(
        { data: null, error: result.error },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<TimeEntryAuditDetails[]>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Audit trail fetch error:", error);
    return NextResponse.json<ApiResponse<TimeEntryAuditDetails[]>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
