import { z } from "zod";
import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { setupCompanySchema } from "@/types/setup";
import { BUNDESLAENDER } from "@/types";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: "Nicht angemeldet" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  const { data: employee } = await admin
    .from("employees")
    .select("id, tenant_id, first_name, last_name, email, target_hours_week, work_schedule, bundesland, tenants(id, name, bundesland, default_work_schedule, setup_complete)")
    .eq("user_id", user.id)
    .single();

  if (!employee) {
    return NextResponse.json(
      { data: null, error: "Mitarbeiter nicht gefunden" },
      { status: 404 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = employee.tenants as any;

  return NextResponse.json({
    data: {
      tenantId: employee.tenant_id,
      setupComplete: tenant?.setup_complete ?? false,
      profile: {
        firstName: employee.first_name,
        lastName: employee.last_name,
        email: employee.email,
        targetHoursWeek: employee.target_hours_week,
        workSchedule: employee.work_schedule,
        bundesland: employee.bundesland,
      },
      company: {
        name: tenant?.name ?? "",
        bundesland: tenant?.bundesland ?? "",
        defaultWorkSchedule: tenant?.default_work_schedule ?? null,
      },
    },
    error: null,
  });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Nicht angemeldet" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const input = setupCompanySchema.parse(body);

    // Validate bundesland
    if (
      !BUNDESLAENDER.includes(input.bundesland as (typeof BUNDESLAENDER)[number])
    ) {
      return NextResponse.json(
        { data: null, error: "Ungültiges Bundesland" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Get tenant_id from the employee record linked to this user
    const { data: employee } = await admin
      .from("employees")
      .select("tenant_id")
      .eq("user_id", user.id)
      .single();

    if (!employee) {
      return NextResponse.json(
        { data: null, error: "Mitarbeiter nicht gefunden" },
        { status: 404 },
      );
    }

    // Update tenant with company details
    const { error } = await admin
      .from("tenants")
      .update({
        name: input.companyName,
        bundesland: input.bundesland,
      })
      .eq("id", employee.tenant_id);

    if (error) {
      return NextResponse.json(
        { data: null, error: "Fehler beim Speichern der Firmendaten" },
        { status: 500 },
      );
    }

    // The company state is the default for the founder and future employees.
    const { error: employeeError } = await admin
      .from("employees")
      .update({ bundesland: input.bundesland })
      .eq("user_id", user.id)
      .eq("tenant_id", employee.tenant_id);

    if (employeeError) {
      return NextResponse.json(
        { data: null, error: "Bundesland konnte nicht für dein Profil übernommen werden" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: { tenantId: employee.tenant_id },
      error: null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { data: null, error: err.errors[0].message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { data: null, error: "Unerwarteter Fehler" },
      { status: 500 },
    );
  }
}
