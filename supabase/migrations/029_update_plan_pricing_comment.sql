-- Keep the database schema documentation aligned with ADR-005. Pricing is
-- enforced in the application and Stripe; the plan enum itself is unchanged.
COMMENT ON COLUMN tenants.plan IS
  'Subscription plan: free (up to 3), team (up to 10, EUR 19 standard/EUR 9 Founder), business (up to 50, EUR 69 standard/EUR 59 Founder), pro (unlimited, EUR 129 standard/EUR 99 Founder).';
