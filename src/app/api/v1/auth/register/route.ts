/**
 * POST /api/v1/auth/register
 *
 * Creates a tenant and admin employee for the authenticated user.
 * Email/password registrations are normally provisioned by the
 * handle_new_auth_user database trigger. This endpoint remains as an
 * authenticated, idempotent fallback for OAuth registrations.
 *
 * Flow:
 * 1. Validate input (email, companyName, userId)
 * 2. Insert tenant (plan='free', setup_complete=false)
 * 3. Insert employee (role='admin', linked to user + tenant)
 * 4. Set JWT custom claims via Supabase RPC (set_employee_claims)
 * 5. Return tenantId + employeeId
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";
import type { ApiResponse } from "@/types/api";

const registerRequestSchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
});

interface RegisterResponse {
  tenantId: string;
  employeeId: string;
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body: unknown = await request.json();
    const parsed = registerRequestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json<ApiResponse<RegisterResponse>>(
        {
          data: null,
          error: firstError?.message ?? "Ungültige Eingabe",
        },
        { status: 400 }
      );
    }

    const { companyName, firstName, lastName } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json<ApiResponse<RegisterResponse>>(
        { data: null, error: "Nicht angemeldet" },
        { status: 401 },
      );
    }

    if (serverEnv.NODE_ENV === "production" && !user.email_confirmed_at) {
      return NextResponse.json<ApiResponse<RegisterResponse>>(
        { data: null, error: "Bitte bestätige zuerst deine E-Mail-Adresse." },
        { status: 403 },
      );
    }

    const adminClient = createAdminClient();

    // The signup trigger may already have provisioned this account. Returning
    // the existing IDs keeps retries safe and prevents duplicate tenants.
    const { data: existingEmployee } = await adminClient
      .from("employees")
      .select("id, tenant_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingEmployee) {
      return NextResponse.json<ApiResponse<RegisterResponse>>({
        data: {
          tenantId: existingEmployee.tenant_id,
          employeeId: existingEmployee.id,
        },
        error: null,
      });
    }

    // Step 1: Create tenant
    const { data: tenant, error: tenantError } = await adminClient
      .from("tenants")
      .insert({
        name: companyName,
        plan: "free",
        setup_complete: false,
      })
      .select("id")
      .single();

    if (tenantError || !tenant) {
      console.error("Failed to create tenant:", tenantError);
      return NextResponse.json<ApiResponse<RegisterResponse>>(
        {
          data: null,
          error: "Firma konnte nicht erstellt werden. Bitte versuche es erneut.",
        },
        { status: 500 }
      );
    }

    const tenantId = tenant.id;

    // Step 2: Create admin employee
    const { data: employee, error: employeeError } = await adminClient
      .from("employees")
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        role: "admin",
        target_hours_week: 40,
      })
      .select("id")
      .single();

    if (employeeError || !employee) {
      // Rollback: delete the tenant we just created
      await adminClient.from("tenants").delete().eq("id", tenantId);

      console.error("Failed to create employee:", employeeError);
      return NextResponse.json<ApiResponse<RegisterResponse>>(
        {
          data: null,
          error:
            "Mitarbeiterprofil konnte nicht erstellt werden. Bitte versuche es erneut.",
        },
        { status: 500 }
      );
    }

    // Step 3: Set JWT custom claims via RPC
    // The trigger on_employee_created (011_helpers.sql) handles this
    // automatically, but we call it explicitly to be safe.
    const { error: claimsError } = await adminClient.rpc(
      "set_employee_claims",
      { user_uuid: user.id }
    );

    if (claimsError) {
      // Non-fatal: the trigger should have set claims already
      console.warn("Failed to set custom claims via RPC:", claimsError);
    }

    return NextResponse.json<ApiResponse<RegisterResponse>>(
      {
        data: {
          tenantId,
          employeeId: employee.id,
        },
        error: null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json<ApiResponse<RegisterResponse>>(
      {
        data: null,
        error: "Ein unerwarteter Fehler ist aufgetreten.",
      },
      { status: 500 }
    );
  }
}
