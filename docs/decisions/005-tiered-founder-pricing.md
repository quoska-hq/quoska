# ADR-005: Tiered pricing and limited Founder offer

**Date:** 2026-08-20
**Status:** Accepted
**Decision:** Quoska keeps flat monthly prices per organization, introduces size-based tiers, and offers the first 100 successful bookings of every paid tier a permanent Founder price.

## Pricing

| Plan | Monthly price | Active employee limit |
|------|---------------|-----------------------|
| Free | €0 | 3 |
| Team | €19 standard; €9 Founder | 10 |
| Business | €69 standard; €59 Founder | 50 |
| Pro | €129 standard; €99 Founder | Unlimited |

All amounts shown by the application currently fall under the German small-business VAT rule (§ 19 UStG). Pricing remains per organization rather than per employee.

## Founder offer

Each paid tier has a dedicated Stripe coupon with `forever` duration and an associated promotion code limited to 100 redemptions and first-time transactions. Team and Business receive €10 EUR off; Pro receives €30 EUR off. Checkout applies the matching promotion code automatically while it is valid. The server validates every relevant Stripe setting and falls back to that tier's standard price if the offer is expired or misconfigured.

The public marketing page states that availability is checked during checkout. Stripe remains the authoritative counter.

## Existing subscriptions

Existing €9 Team, €59 Business, and €99 Pro subscriptions remain grandfathered. Their Stripe Price IDs are retained in the matching `STRIPE_*_LEGACY_PRICE_IDS` variables, so webhook updates continue to resolve those subscriptions to the correct plan after the current Price IDs point to €19, €69, and €129.

## Consequences

- Pricing can grow with organization size while remaining predictable.
- Capped, permanent Founder prices reward early customers without replacing the regular list prices.
- Deployments must create and validate the Stripe prices, coupon, and promotion code before enabling the offer.
- Legacy price IDs must not be removed from the environment while subscriptions still use them.
