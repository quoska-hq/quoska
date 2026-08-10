/**
 * POST /api/v1/stripe/portal
 *
 * Create a Stripe Billing Portal session so a tenant admin can manage or cancel
 * the subscription. Requires the tenant to have a linked stripe_customer_id.
 * Inert when billing is disabled.
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";
import { isBillingEnabled } from "@/lib/stripe";
import { createBillingPortal } from "@/services/subscriptionService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import type { ApiResponse } from "@/types/api";

export async function POST() {
  if (!isBillingEnabled()) {
    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: null, error: "Billing ist nicht aktiviert." },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const authResult = await getEmployeeFromAuth(supabase);
    if (!authResult.data) {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: authResult.error },
        { status: 401 },
      );
    }

    if (authResult.data.role !== "admin") {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: "Nur Administratoren können das Abonnement verwalten." },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: tenant } = await admin
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", authResult.data.tenantId)
      .single();

    if (!tenant?.stripe_customer_id) {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: "Kein Abonnement gefunden." },
        { status: 404 },
      );
    }

    const result = await createBillingPortal(
      tenant.stripe_customer_id,
      serverEnv.NEXT_PUBLIC_APP_URL,
    );

    if (!result.data) {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: result.data, error: null },
      { status: 200 },
    );
  } catch (error) {
    console.error("Portal creation error:", error);
    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
