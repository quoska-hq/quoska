/**
 * POST /api/v1/stripe/checkout
 *
 * Create a Stripe Checkout Session for upgrading the caller's tenant to a paid
 * tier. Body: { tier: "team" | "business" | "pro" }.
 * Auth: tenant admin only (the upgrade applies to their tenant).
 * Returns the hosted Checkout URL to redirect to.
 *
 * Inert when billing is disabled (no STRIPE_SECRET_KEY / price IDs).
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { serverEnv } from "@/config/env";
import { isBillingEnabled } from "@/lib/stripe";
import { createCheckout } from "@/services/subscriptionService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { PLANS } from "@/config/plans";
import type { Plan } from "@/types/tenant";
import type { ApiResponse } from "@/types/api";

function priceIdForTier(
  tier: "team" | "business" | "pro",
): string | undefined {
  return {
    team: serverEnv.STRIPE_TEAM_PRICE_ID,
    business: serverEnv.STRIPE_BUSINESS_PRICE_ID,
    pro: serverEnv.STRIPE_PRO_PRICE_ID,
  }[tier];
}

function founderPromotionCodeIdForTier(
  tier: "team" | "business" | "pro",
): string | undefined {
  return {
    team: serverEnv.STRIPE_TEAM_FOUNDER_PROMOTION_CODE_ID,
    business: serverEnv.STRIPE_BUSINESS_FOUNDER_PROMOTION_CODE_ID,
    pro: serverEnv.STRIPE_PRO_FOUNDER_PROMOTION_CODE_ID,
  }[tier];
}

export async function POST(request: Request) {
  if (!isBillingEnabled()) {
    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: null, error: "Billing ist nicht aktiviert." },
      { status: 503 },
    );
  }

  try {
    // Parse + validate the requested tier.
    const body = (await request.json().catch(() => ({}))) as { tier?: string };
    const tier = body.tier as "team" | "business" | "pro";
    if (tier !== "team" && tier !== "business" && tier !== "pro") {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: "Ungültiger Tarif." },
        { status: 400 },
      );
    }
    const priceId = priceIdForTier(tier);
    if (!priceId) {
      return NextResponse.json<ApiResponse<{ url: string }>>(
        { data: null, error: `Tarif „${PLANS[tier as Plan].label}" ist nicht konfiguriert.` },
        { status: 400 },
      );
    }

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
        { data: null, error: "Nur Administratoren können Tarife buchen." },
        { status: 403 },
      );
    }

    const { tenantId } = authResult.data;

    const admin = createAdminClient();
    const { data: tenant } = await admin
      .from("tenants")
      .select("name")
      .eq("id", tenantId)
      .single();

    const { data: employee } = await admin
      .from("employees")
      .select("email")
      .eq("id", authResult.data.employeeId)
      .single();

    const result = await createCheckout(
      tenantId,
      tenant?.name ?? "Unbekannt",
      employee?.email ?? "",
      priceId,
      tier,
      serverEnv.NEXT_PUBLIC_APP_URL,
      founderPromotionCodeIdForTier(tier),
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
    console.error("Checkout creation error:", error);
    return NextResponse.json<ApiResponse<{ url: string }>>(
      { data: null, error: "Ein unerwarteter Fehler ist aufgetreten." },
      { status: 500 },
    );
  }
}
