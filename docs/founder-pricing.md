# Founder pricing rollout

The application supports the original launch prices as Founder prices for the first 100 successful bookings of each paid tier: Team €9, Business €59, and Pro €99. After a tier's offer is exhausted, its standard price is €19, €69, or €129 respectively.

## Stripe setup

Perform these steps in Stripe test mode first, then repeat them in live mode:

1. Create recurring monthly Prices for Team (€19), Business (€69), and Pro (€129).
2. Keep all existing €9, €59, and €99 Price IDs. Existing subscriptions may continue to use them even if they are archived for new sales.
3. Create three dedicated coupons with duration `forever` and a maximum of 100 redemptions: €10 EUR off Team, €10 EUR off Business, and €30 EUR off Pro. Do not reuse these coupons outside their matching tier checkout.
4. Create one active promotion code for each coupon. Set each maximum to 100 redemptions and restrict each to first-time transactions. The codes are applied by the server and do not need to be advertised to customers.
5. Configure the deployment:

   ```dotenv
   STRIPE_TEAM_PRICE_ID=price_team_19
   STRIPE_TEAM_LEGACY_PRICE_IDS=price_previous_team_9
   STRIPE_BUSINESS_PRICE_ID=price_business_69
   STRIPE_BUSINESS_LEGACY_PRICE_IDS=price_previous_business_59
   STRIPE_PRO_PRICE_ID=price_pro_129
   STRIPE_PRO_LEGACY_PRICE_IDS=price_previous_pro_99
   STRIPE_TEAM_FOUNDER_PROMOTION_CODE_ID=promo_team_founder
   STRIPE_BUSINESS_FOUNDER_PROMOTION_CODE_ID=promo_business_founder
   STRIPE_PRO_FOUNDER_PROMOTION_CODE_ID=promo_pro_founder
   ```

6. Complete test checkouts and verify recurring totals of €9, €59, and €99 with the permanent discounts applied.
7. Test every tier with an invalid or exhausted promotion code. Checkout must then charge its €19, €69, or €129 standard price.
8. Verify existing €9, €59, and €99 subscription webhooks still map to their original plans.

The application validates the coupon currency, tier-specific amount, duration, redemption cap, first-transaction restriction, active state, and remaining count. A mismatched configuration fails closed to that tier's standard price.

## Rollback

Remove the corresponding `STRIPE_*_FOUNDER_PROMOTION_CODE_ID` to stop applying one Founder offer without affecting existing subscriptions. Restore prior current Price IDs only if new checkouts also need to return to the old prices; keep every still-used legacy Price ID mapped to its tier until its last subscription ends.
