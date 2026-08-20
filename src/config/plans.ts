/**
 * Plan configuration — the single source of truth for subscription tiers.
 *
 * Every part of the app (employee limits, billing UI, webhook price→tier
 * mapping, README claims) reads from here, so pricing changes touch one file.
 *
 * Tiers (Option C: tiered flatrate):
 *   free     €0   · bis 3   Mitarbeiter
 *   team     €19  · bis 10  Mitarbeiter (€9 Founder for first 100)
 *   business €69  · bis 50  Mitarbeiter (€59 Founder for first 100)
 *   pro      €129 · unbegrenzt (€99 Founder for first 100)
 *
 * OPEN-SOURCE PATTERN: price IDs are env-driven so the public codebase ships
 * without hardcoded Stripe products. The hoster creates the prices in their own
 * Stripe dashboard and sets STRIPE_<TIER>_PRICE_ID. With none set, billing is
 * disabled and every tenant resolves to `free` (see lib/stripe.ts).
 */

import type { Plan } from "@/types/tenant";
import { serverEnv } from "@/config/env";

export interface PlanConfig {
  /** Display label (German). */
  label: string;
  /** Monthly price in whole euros, for display. null = free. */
  priceEur: number | null;
  /** Max active employees. null = unlimited. */
  employeeLimit: number | null;
}

export type PaidPlan = Exclude<Plan, "free">;

export interface FounderOfferConfig {
  label: "Founder";
  plan: PaidPlan;
  priceEur: number;
  standardPriceEur: number;
  discountEur: number;
  maxOrganizations: number;
}

/** Ordered low → high, used for upgrade flows. */
export const PLAN_ORDER: Plan[] = ["free", "team", "business", "pro"];

export const PLANS: Record<Plan, PlanConfig> = {
  free: { label: "Free", priceEur: 0, employeeLimit: 3 },
  team: { label: "Team", priceEur: 19, employeeLimit: 10 },
  business: { label: "Business", priceEur: 69, employeeLimit: 50 },
  pro: { label: "Pro", priceEur: 129, employeeLimit: null },
};

/** Limited launch prices, each enforced by its capped Stripe promotion code. */
export const FOUNDER_OFFERS: Record<PaidPlan, FounderOfferConfig> = {
  team: {
    label: "Founder",
    plan: "team",
    priceEur: 9,
    standardPriceEur: 19,
    discountEur: 10,
    maxOrganizations: 100,
  },
  business: {
    label: "Founder",
    plan: "business",
    priceEur: 59,
    standardPriceEur: 69,
    discountEur: 10,
    maxOrganizations: 100,
  },
  pro: {
    label: "Founder",
    plan: "pro",
    priceEur: 99,
    standardPriceEur: 129,
    discountEur: 30,
    maxOrganizations: 100,
  },
};

/** Backwards-compatible alias for code that only needs the Team offer. */
export const TEAM_FOUNDER_OFFER = FOUNDER_OFFERS.team;

/** Employee cap for a plan (null = unlimited). */
export function employeeLimitForPlan(plan: Plan | null): number | null {
  if (!plan) return PLANS.free.employeeLimit;
  return PLANS[plan].employeeLimit;
}

/**
 * Map a Stripe Price ID to a plan tier, using the env-configured price IDs.
 * Returns null if the price doesn't match any configured tier (e.g. billing
 * disabled, or an unknown/legacy price).
 */
export function planFromStripePriceId(priceId: string): Plan | null {
  if (!priceId) return null;
  if (priceId === serverEnv.STRIPE_TEAM_PRICE_ID) return "team";
  if (legacyPriceIdsForPlan("team").includes(priceId)) return "team";
  if (priceId === serverEnv.STRIPE_BUSINESS_PRICE_ID) return "business";
  if (legacyPriceIdsForPlan("business").includes(priceId)) return "business";
  if (priceId === serverEnv.STRIPE_PRO_PRICE_ID) return "pro";
  if (legacyPriceIdsForPlan("pro").includes(priceId)) return "pro";
  return null;
}

/** All env-configured Stripe price IDs (for the billing-enabled check). */
export function configuredPriceIds(): string[] {
  return [
    serverEnv.STRIPE_TEAM_PRICE_ID,
    serverEnv.STRIPE_BUSINESS_PRICE_ID,
    serverEnv.STRIPE_PRO_PRICE_ID,
    ...legacyPriceIdsForPlan("team"),
    ...legacyPriceIdsForPlan("business"),
    ...legacyPriceIdsForPlan("pro"),
  ].filter((p): p is string => !!p);
}

function legacyPriceIdsForPlan(plan: PaidPlan): string[] {
  const configuredIds = {
    team: serverEnv.STRIPE_TEAM_LEGACY_PRICE_IDS,
    business: serverEnv.STRIPE_BUSINESS_LEGACY_PRICE_IDS,
    pro: serverEnv.STRIPE_PRO_LEGACY_PRICE_IDS,
  }[plan];

  return (configuredIds ?? "")
    .split(",")
    .map((priceId) => priceId.trim())
    .filter(Boolean);
}
