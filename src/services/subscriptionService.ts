/**
 * Subscription Service — billing business logic.
 *
 * OPEN-SOURCE PATTERN: all Stripe interaction is guarded by `stripe !== null`.
 * With no keys configured, `getActivePlan` returns the tenant's DB plan (free
 * by default) and the webhook handler is a no-op. The hosted deployment sets
 * STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID and gets full live billing.
 *
 * Plan resolution mirrors Rybbit's "fall through to free" model:
 *   tenant.plan in DB  →  source of truth (updated by webhooks).
 *
 * Webhook processing is idempotent via subscription_events.stripe_event_id.
 *
 * This file is in the Services layer. It imports from Repos, Types, Lib.
 */

import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/types/tenant";
import type { ApiResponse } from "@/types/api";
import { success, failure } from "@/types/api";
import { getStripe } from "@/lib/stripe";
import {
  FOUNDER_OFFERS,
  planFromStripePriceId,
  configuredPriceIds,
  type PaidPlan,
} from "@/config/plans";
import { serverEnv } from "@/config/env";
import {
  recordWebhookEvent,
  markWebhookProcessed,
  setTenantPlan,
  setTenantStripeCustomer,
  getTenantByStripeCustomer,
} from "@/repos/subscriptionRepo";
import { getTenantPlan } from "@/repos/employeeRepo";

export interface ActivePlan {
  plan: Plan;
  /** True when the deployment can process payments (UI gating). */
  billingEnabled: boolean;
}

export interface FounderOfferStatus {
  configured: boolean;
  available: boolean;
  remaining: number | null;
}

export type FounderOfferStatuses = Record<PaidPlan, FounderOfferStatus>;

/** The current plan for a tenant, plus the billing-enabled flag. */
export async function getActivePlan(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ApiResponse<ActivePlan>> {
  const plan = await getTenantPlan(supabase, tenantId);
  return success({
    plan: plan ?? "free",
    billingEnabled: getStripe() !== null && configuredPriceIds().length > 0,
  });
}

/**
 * Create a Stripe Checkout Session for upgrading to a paid tier.
 * Returns the URL the browser should redirect to. The priceId is passed in
 * session metadata so the webhook can map the completed checkout back to the
 * correct plan tier (team/business/pro).
 * Throws if billing is disabled (caller should check isBillingEnabled first).
 */
export async function createCheckout(
  tenantId: string,
  tenantName: string,
  customerEmail: string,
  priceId: string,
  tier: PaidPlan,
  appUrl: string,
  founderPromotionCodeId?: string,
): Promise<ApiResponse<{ url: string }>> {
  const stripe = getStripe();
  if (!stripe) return failure("Billing ist nicht aktiviert.");
  if (!priceId) return failure("Kein Preis konfiguriert.");

  const founderOffer =
    founderPromotionCodeId
      ? await retrieveFounderOfferStatus(stripe, founderPromotionCodeId, tier)
      : { configured: false, available: false, remaining: null };
  const applyFounderOffer = founderOffer.available && !!founderPromotionCodeId;
  const metadata = {
    tenantId,
    tenantName,
    priceId,
    tier,
    founderOffer: applyFounderOffer ? "true" : "false",
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(applyFounderOffer
      ? { discounts: [{ promotion_code: founderPromotionCodeId }] }
      : {}),
    client_reference_id: tenantId,
    customer_email: customerEmail,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: `${appUrl}/app/settings?status=success`,
    cancel_url: `${appUrl}/app/settings?status=cancelled`,
  });

  if (!session.url) return failure("Checkout-Session konnte nicht erstellt werden.");
  return success({ url: session.url });
}

/** Public-safe availability summary for the authenticated billing UI. */
export async function getFounderOfferStatuses(): Promise<FounderOfferStatuses> {
  const entries = await Promise.all(
    (["team", "business", "pro"] as const).map(async (tier) => [
      tier,
      await getFounderOfferStatus(tier),
    ] as const),
  );
  return Object.fromEntries(entries) as FounderOfferStatuses;
}

export async function getFounderOfferStatus(tier: PaidPlan): Promise<FounderOfferStatus> {
  const promotionCodeId = founderPromotionCodeId(tier);
  const stripe = getStripe();
  if (!stripe || !promotionCodeId) {
    return { configured: false, available: false, remaining: null };
  }
  return retrieveFounderOfferStatus(stripe, promotionCodeId, tier);
}

async function retrieveFounderOfferStatus(
  stripe: Stripe,
  promotionCodeId: string,
  tier: PaidPlan,
): Promise<FounderOfferStatus> {
  try {
    const promotionCode = await stripe.promotionCodes.retrieve(promotionCodeId);
    const status = founderOfferStatusFromPromotionCode(promotionCode, tier);
    if (status.configured && status.remaining === null) {
      console.error("Founder promotion code does not match the expected offer settings.");
    }
    return status;
  } catch (error) {
    console.error("Founder promotion code lookup failed:", error);
    return { configured: true, available: false, remaining: null };
  }
}

/**
 * Validate the externally configured Stripe promotion before displaying or
 * applying it. A wrong coupon must fail closed to the standard Team price.
 */
export function founderOfferStatusFromPromotionCode(
  promotionCode: Stripe.PromotionCode,
  tier: PaidPlan = "team",
): FounderOfferStatus {
  const offer = FOUNDER_OFFERS[tier];
  const coupon = promotionCode.coupon;
  const limits = [
    promotionCode.max_redemptions === null
      ? null
      : promotionCode.max_redemptions - promotionCode.times_redeemed,
    coupon.max_redemptions === null
      ? null
      : coupon.max_redemptions - coupon.times_redeemed,
  ].filter((value): value is number => value !== null);
  const configuredLimit = [promotionCode.max_redemptions, coupon.max_redemptions]
    .filter((value): value is number => value !== null)
    .reduce((lowest, value) => Math.min(lowest, value), Number.POSITIVE_INFINITY);

  const hasExpectedConfiguration =
    coupon.valid &&
    coupon.amount_off === offer.discountEur * 100 &&
    coupon.currency?.toLowerCase() === "eur" &&
    coupon.duration === "forever" &&
    configuredLimit === offer.maxOrganizations &&
    promotionCode.restrictions.first_time_transaction;

  if (!hasExpectedConfiguration) {
    return { configured: true, available: false, remaining: null };
  }

  const remaining = Math.max(0, Math.min(...limits));
  return {
    configured: true,
    available: promotionCode.active && remaining > 0,
    remaining,
  };
}

function founderPromotionCodeId(tier: PaidPlan): string | undefined {
  return {
    team: serverEnv.STRIPE_TEAM_FOUNDER_PROMOTION_CODE_ID,
    business: serverEnv.STRIPE_BUSINESS_FOUNDER_PROMOTION_CODE_ID,
    pro: serverEnv.STRIPE_PRO_FOUNDER_PROMOTION_CODE_ID,
  }[tier];
}

/**
 * Create a Stripe Billing Portal session (manage subscription / cancel).
 */
export async function createBillingPortal(
  stripeCustomerId: string,
  appUrl: string,
): Promise<ApiResponse<{ url: string }>> {
  const stripe = getStripe();
  if (!stripe) return failure("Billing ist nicht aktiviert.");
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/app/settings`,
  });
  return success({ url: session.url });
}

/**
 * Result of processing one webhook event.
 *  - "ignored_duplicate": already processed (idempotent skip)
 *  - "processed": applied a plan change
 *  - "ignored_unknown": event type we don't handle
 */
export type WebhookResult =
  | { status: "ignored_duplicate" }
  | { status: "processed"; tenantId: string; plan: Plan }
  | { status: "ignored_unknown"; eventType: string };

/**
 * Process a verified Stripe webhook event. Idempotent: a second delivery of
 * the same event id is a no-op.
 *
 * Handled events:
 *  - checkout.session.completed → link customer to tenant; if paid, set pro
 *  - customer.subscription.created/updated/deleted → sync plan from status
 */
export async function processWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<ApiResponse<WebhookResult>> {
  const tenantId = extractTenantId(event);

  // Idempotency: only act on the first delivery of this event id.
  const isNew = await recordWebhookEvent(supabase, {
    tenant_id: tenantId,
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
  });
  if (!isNew) return success({ status: "ignored_duplicate" });

  const result = await applyEvent(supabase, event);

  await markWebhookProcessed(supabase, event.id);
  return success(result);
}

/** Pull tenantId from an event (client_reference_id or subscription metadata). */
function extractTenantId(event: Stripe.Event): string | null {
  const obj = event.data.object as unknown as {
    client_reference_id?: string | null;
    metadata?: { tenantId?: string } | null;
  };
  return obj.client_reference_id ?? obj.metadata?.tenantId ?? null;
}

/** Map a subscription's Stripe status + price to a Quoska plan. */
function planForSubscription(status: string, priceId?: string | null): Plan {
  // 'active' | 'trialing' | 'past_due' keep access; canceled/unpaid/etc → free.
  if (status !== "active" && status !== "trialing" && status !== "past_due") {
    return "free";
  }
  // Paid & active → resolve the tier from the purchased price id. Unknown or
  // missing prices fail closed so a configuration error cannot grant Pro.
  if (priceId) {
    return planFromStripePriceId(priceId) ?? "free";
  }
  return "free";
}

async function applyEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<Exclude<WebhookResult, { status: "ignored_duplicate" }>> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (tenantId && customerId) {
        await setTenantStripeCustomer(supabase, tenantId, customerId);
      }
      // On checkout, resolve the tier from the purchased price (passed via
      // metadata by createProCheckout); paid → that tier, unpaid → free.
      const priceId = (session.metadata?.priceId ?? null) as string | null;
      const tier = priceId ? planFromStripePriceId(priceId) : null;
      const plan: Plan = session.payment_status === "paid" ? (tier ?? "free") : "free";
      if (tenantId) {
        await setTenantPlan(supabase, tenantId, plan);
        return { status: "processed", tenantId, plan };
      }
      return { status: "ignored_unknown", eventType: event.type };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      // Resolve the price id from the subscription's first line item (may be
      // absent in test/legacy events — fall back to metadata.priceId).
      const item = sub.items?.data?.[0];
      const priceId =
        (typeof item?.price?.id === "string" && item.price.id) ||
        (sub.metadata?.priceId as string | undefined) ||
        null;
      const plan = planForSubscription(sub.status, priceId);
      // Resolve tenant via customer linkage, then via metadata fallback.
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (customerId) {
        const tenant = await getTenantByStripeCustomer(supabase, customerId);
        if (tenant) {
          await setTenantPlan(supabase, tenant.id, plan);
          return { status: "processed", tenantId: tenant.id, plan };
        }
      }
      const tenantId = sub.metadata?.tenantId ?? null;
      if (tenantId) {
        await setTenantPlan(supabase, tenantId, plan);
        return { status: "processed", tenantId, plan };
      }
      return { status: "ignored_unknown", eventType: event.type };
    }

    default:
      return { status: "ignored_unknown", eventType: event.type };
  }
}
