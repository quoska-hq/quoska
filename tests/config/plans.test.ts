import { afterEach, describe, expect, test, vi } from "vitest";
import {
  configuredPriceIds,
  FOUNDER_OFFERS,
  planFromStripePriceId,
  PLANS,
} from "@/config/plans";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("plan pricing", () => {
  test("exposes the current list prices and Founder offer", () => {
    expect(PLANS.team.priceEur).toBe(19);
    expect(PLANS.business.priceEur).toBe(69);
    expect(PLANS.pro.priceEur).toBe(129);
    expect(FOUNDER_OFFERS.team).toMatchObject({
      priceEur: 9,
      standardPriceEur: 19,
      discountEur: 10,
      maxOrganizations: 100,
    });
    expect(FOUNDER_OFFERS.business).toMatchObject({
      priceEur: 59,
      standardPriceEur: 69,
      discountEur: 10,
      maxOrganizations: 100,
    });
    expect(FOUNDER_OFFERS.pro).toMatchObject({
      priceEur: 99,
      standardPriceEur: 129,
      discountEur: 30,
      maxOrganizations: 100,
    });
  });

  test("keeps grandfathered prices mapped after the current prices change", () => {
    vi.stubEnv("STRIPE_TEAM_PRICE_ID", "price_team_19");
    vi.stubEnv("STRIPE_BUSINESS_PRICE_ID", "price_business_69");
    vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_pro_129");
    vi.stubEnv(
      "STRIPE_TEAM_LEGACY_PRICE_IDS",
      "price_team_founder_old, price_team_legacy_two",
    );
    vi.stubEnv("STRIPE_BUSINESS_LEGACY_PRICE_IDS", "price_business_founder_old");
    vi.stubEnv("STRIPE_PRO_LEGACY_PRICE_IDS", "price_pro_founder_old");

    expect(planFromStripePriceId("price_team_19")).toBe("team");
    expect(planFromStripePriceId("price_team_founder_old")).toBe("team");
    expect(planFromStripePriceId("price_team_legacy_two")).toBe("team");
    expect(planFromStripePriceId("price_business_founder_old")).toBe("business");
    expect(planFromStripePriceId("price_pro_founder_old")).toBe("pro");
    expect(configuredPriceIds()).toContain("price_team_founder_old");
    expect(configuredPriceIds()).toContain("price_business_founder_old");
    expect(configuredPriceIds()).toContain("price_pro_founder_old");
  });
});
