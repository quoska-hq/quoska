/**
 * GET /api/v1/employees/me
 *
 * Returns the current authenticated employee's profile including role.
 */

import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";
import { setupProfileSchema, setupScheduleSchema } from "@/types/setup";
import { z } from "zod";

export async function GET() {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    const { employeeId } = authResult.data;

    const { data: employee } = await supabase
      .from("employees")
      .select("id, first_name, last_name, email, role, target_hours_week, work_schedule, bundesland")
      .eq("id", employeeId)
      .single();

    if (!employee) {
      return NextResponse.json<ApiResponse<null>>(
        { data: null, error: "Mitarbeiter nicht gefunden." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { data: employee, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get current employee error:", error);
    return NextResponse.json<ApiResponse<null>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}

const setupEmployeeSchema = setupProfileSchema.partial().merge(
  setupScheduleSchema.partial(),
).refine(
  (value) =>
    value.firstName !== undefined ||
    value.lastName !== undefined ||
    value.workSchedule !== undefined,
  "Keine Änderungen angegeben",
);

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);

    if (!authResult.data) {
      return NextResponse.json(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    if (authResult.data.role !== "admin") {
      return NextResponse.json(
        { data: null, error: "Keine Berechtigung" },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: tenant } = await admin
      .from("tenants")
      .select("setup_complete")
      .eq("id", authResult.data.tenantId)
      .single();

    if (!tenant || tenant.setup_complete) {
      return NextResponse.json(
        { data: null, error: "Das Profil kann hier nur während der Einrichtung geändert werden." },
        { status: 409 },
      );
    }

    const parsed = setupEmployeeSchema.parse(await request.json());
    const updates: Record<string, unknown> = {};
    if (parsed.firstName !== undefined) updates.first_name = parsed.firstName;
    if (parsed.lastName !== undefined) updates.last_name = parsed.lastName;
    if (parsed.workSchedule !== undefined) updates.work_schedule = parsed.workSchedule;

    if (parsed.workSchedule !== undefined) {
      const { error: tenantError } = await admin
        .from("tenants")
        .update({ default_work_schedule: parsed.workSchedule })
        .eq("id", authResult.data.tenantId);
      if (tenantError) {
        return NextResponse.json(
          { data: null, error: "Standard-Arbeitswoche konnte nicht gespeichert werden." },
          { status: 500 },
        );
      }
    }

    const { data: employee, error } = await admin
      .from("employees")
      .update(updates)
      .eq("id", authResult.data.employeeId)
      .eq("tenant_id", authResult.data.tenantId)
      .select("id, first_name, last_name, email, role, target_hours_week, work_schedule, bundesland")
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { data: null, error: "Profil konnte nicht gespeichert werden." },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: employee, error: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: error.issues[0]?.message ?? "Ungültige Eingabe" },
        { status: 400 },
      );
    }
    console.error("Update setup profile error:", error);
    return NextResponse.json(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
