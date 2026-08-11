-- Keep database access portable across hosted Supabase and fresh local CLI
-- stacks. RLS policies decide which rows an authenticated user may access, but
-- the role still needs the corresponding SQL privileges first. Newer local
-- stacks no longer guarantee the implicit grants older projects received.

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public
  TO authenticated;
GRANT USAGE, SELECT
  ON ALL SEQUENCES IN SCHEMA public
  TO authenticated;

-- These records are mutated only by server-side handlers after their own
-- authorization checks. Re-apply the least-privilege exceptions from 019
-- after the portable table grant above.
REVOKE INSERT, UPDATE, DELETE ON public.tenants FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.public_holidays FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.employees FROM authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Migrations run as `postgres`; preserve service-role access for objects added
-- by future migrations as well.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
