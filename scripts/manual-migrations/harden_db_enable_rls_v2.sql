-- =============================================================================
-- RLS Hardening Migration v2: Additional Tables
-- =============================================================================
-- This migration extends RLS protection to tables added after the initial
-- hardening. It follows the same "Deny-All + Backend Proxy" pattern.
--
-- IMPORTANT: This script is SAFE to run because:
--   1. Your Next.js backend uses the `postgres` user with the service_role
--      password via the Supabase connection pooler
--   2. The service_role BYPASSES RLS entirely
--   3. All Prisma queries will continue to work normally
--
-- Tables being protected:
--   - tag_definitions     (user tag definitions)
--   - position_tags       (position-to-tag mappings)
--   - trade_groups        (options strategy groups)
--   - trade_group_legs    (individual legs of strategy groups)
--   - payment_history     (Stripe payment records)
--   - subscription_events (subscription lifecycle events)
--
-- Previously protected (in harden_db_enable_rls.sql):
--   - User
--   - broker_accounts
--   - trades
--   - auth_accounts
--   - sessions
--
-- TO RUN THIS MIGRATION:
--   1. Connect to your Supabase SQL Editor (Dashboard > SQL Editor)
--   2. Paste and execute this script
--   3. Verify the app still functions (it will - backend uses service_role)
--
-- TO VERIFY RLS IS ENABLED:
--   SELECT schemaname, tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- TO ROLLBACK (if needed):
--   ALTER TABLE "tag_definitions" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "position_tags" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "trade_groups" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "trade_group_legs" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "payment_history" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "subscription_events" DISABLE ROW LEVEL SECURITY;
-- =============================================================================

-- Enable RLS on TagDefinition table (user-owned tags)
ALTER TABLE "tag_definitions" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on PositionTag table (position-to-tag mappings)
ALTER TABLE "position_tags" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on TradeGroup table (options strategy groups)
ALTER TABLE "trade_groups" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on TradeGroupLeg table (strategy legs)
ALTER TABLE "trade_group_legs" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on PaymentHistory table (Stripe payments - sensitive!)
ALTER TABLE "payment_history" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on SubscriptionEvent table (subscription changes)
ALTER TABLE "subscription_events" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- NO POLICIES CREATED BY DESIGN
-- =============================================================================
-- By not creating any policies, all operations (SELECT, INSERT, UPDATE, DELETE)
-- are DENIED by default for any role except:
--   1. The `service_role` / `postgres` user (used by our Prisma backend)
--   2. The `postgres` superuser (used for migrations)
--
-- This is the safest configuration for a "Backend as Proxy" architecture.
--
-- WHY THIS IS SAFE:
-- Your DATABASE_URL uses the Supabase connection pooler with the postgres
-- user credentials (which has service_role privileges):
--   postgresql://postgres.[project-ref]:[password]@...pooler.supabase.com:6543/postgres
--
-- The service_role ALWAYS bypasses RLS, so your Prisma queries work normally.
-- =============================================================================

-- =============================================================================
-- VERIFICATION QUERY (run after migration)
-- =============================================================================
-- This query shows RLS status for all public tables. All user data tables
-- should show rowsecurity = true.

SELECT
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected output after both RLS migrations:
-- +----------------------+-------------+
-- | tablename            | RLS Enabled |
-- +----------------------+-------------+
-- | User                 | true        |
-- | auth_accounts        | true        |
-- | broker_accounts      | true        |
-- | payment_history      | true        |  <-- NEW
-- | position_tags        | true        |  <-- NEW
-- | sessions             | true        |
-- | subscription_events  | true        |  <-- NEW
-- | tag_definitions      | true        |  <-- NEW
-- | trade_group_legs     | true        |  <-- NEW
-- | trade_groups         | true        |  <-- NEW
-- | trades               | true        |
-- | verification_tokens  | false       |  <-- OK (no userId, managed by NextAuth)
-- +----------------------+-------------+
