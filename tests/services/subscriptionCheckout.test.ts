import { beforeEach, describe, expect, test, vi } from "vitest";
import type Stripe from "stripe";

const stripeMocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  retrievePromotionCode: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    checkout: { sessions: { create: stripeMocks.createSession } },
    promotionCodes: { retrieve: stripeMocks.retrievePromotionCode },
  }),
}));

import { createCheckout } from "@/services/subscriptionService";

function promotionCode(timesRedeemed: number, amountOff = 1000): Stripe.PromotionCode {
  return {
    active: true,
    max_redemptions: 100,
    times_redeemed: timesRedeemed,
    restrictions: { first_time_transaction: true },
    coupon: {
      valid: true,
      amount_off: amountOff,
      currency: "eur",
      duration: "forever",
      max_redemptions: 100,
      times_redeemed: timesRedeemed,
    },
  } as unknown as Stripe.PromotionCode;
}

describe("Founder checkout", () => {
  beforeEach(() => {
    stripeMocks.createSession.mockReset();
    stripeMocks.retrievePromotionCode.mockReset();
    stripeMocks.createSession.mockResolvedValue({ url: "https://checkout.stripe.test/session" });
  });

  test("applies the valid promotion and writes webhook metadata at both levels", async () => {
    stripeMocks.retrievePromotionCode.mockResolvedValue(promotionCode(12));

    const result = await createCheckout(
      "tenant-1",
      "Testbetrieb",
      "admin@example.test",
      "price_team_19",
      "team",
      "https://quoska.test",
      "promo_founder",
    );

    expect(result.data?.url).toBe("https://checkout.stripe.test/session");
    expect(stripeMocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_team_19", quantity: 1 }],
        discounts: [{ promotion_code: "promo_founder" }],
        metadata: expect.objectContaining({
          tenantId: "tenant-1",
          priceId: "price_team_19",
          tier: "team",
          founderOffer: "true",
        }),
        subscription_data: {
          metadata: expect.objectContaining({
            tenantId: "tenant-1",
            priceId: "price_team_19",
            tier: "team",
            founderOffer: "true",
          }),
        },
      }),
    );
  });

  test("falls back to the €19 price when the promotion is exhausted", async () => {
    stripeMocks.retrievePromotionCode.mockResolvedValue(promotionCode(100));

    await createCheckout(
      "tenant-1",
      "Testbetrieb",
      "admin@example.test",
      "price_team_19",
      "team",
      "https://quoska.test",
      "promo_founder",
    );

    expect(stripeMocks.createSession).toHaveBeenCalledWith(
      expect.not.objectContaining({ discounts: expect.anything() }),
    );
    expect(stripeMocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_team_19", quantity: 1 }],
        metadata: expect.objectContaining({ founderOffer: "false" }),
      }),
    );
  });

  test("applies the €30 Pro Founder discount", async () => {
    stripeMocks.retrievePromotionCode.mockResolvedValue(promotionCode(4, 3000));

    await createCheckout(
      "tenant-1",
      "Testbetrieb",
      "admin@example.test",
      "price_pro_129",
      "pro",
      "https://quoska.test",
      "promo_pro_founder",
    );

    expect(stripeMocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_pro_129", quantity: 1 }],
        discounts: [{ promotion_code: "promo_pro_founder" }],
        metadata: expect.objectContaining({ tier: "pro", founderOffer: "true" }),
      }),
    );
  });
});
