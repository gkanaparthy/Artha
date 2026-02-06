-- =============================================================================
-- RLS Hardening Migration: Enable Missing RLS Tables
-- =============================================================================
-- AUDIT RESULT: The following tables are MISSING RLS protection:
--   - User               (user profile, subscription data - CRITICAL)
--   - auth_accounts      (NextAuth OAuth tokens - CRITICAL)
--   - broker_accounts    (SnapTrade account links - CRITICAL)
--   - sessions           (NextAuth session tokens)
--   - trades             (all trade data - CRITICAL)
--
-- This script enables RLS with a "Deny-All + Backend Proxy" pattern.
--
-- WHY THIS IS SAFE:
--   1. Your Next.js backend uses the `postgres` user with service_role
--      privileges via the Supabase connection pooler
--   2. The service_role BYPASSES RLS entirely
--   3. All Prisma queries will continue to work normally
--
-- TO RUN THIS MIGRATION:
--   1. Open Supabase Dashboard > SQL Editor
--   2. Paste this entire script
--   3. Click "Run"
--   4. Verify RLS status with the query at the bottom
--
-- TO ROLLBACK (if needed):
--   ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "auth_accounts" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "broker_accounts" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "trades" DISABLE ROW LEVEL SECURITY;
-- =============================================================================

-- Enable RLS on User table (user profile, subscription, SnapTrade credentials)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on auth_accounts table (OAuth tokens from Google sign-in)
ALTER TABLE "auth_accounts" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on broker_accounts table (SnapTrade broker connections)
ALTER TABLE "broker_accounts" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sessions table (NextAuth session tokens)
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on trades table (all trading history)
ALTER TABLE "trades" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- NO POLICIES CREATED BY DESIGN
-- =============================================================================
-- By not creating any policies, all operations (SELECT, INSERT, UPDATE, DELETE)
-- are DENIED by default for any role except:
--   1. The `service_role` / `postgres` user (used by our Prisma backend)
--   2. The `postgres` superuser (used for migrations)
--
-- This is the safest configuration for a "Backend as Proxy" architecture.
-- Direct database access via PostgREST/Supabase client SDK is BLOCKED.
-- =============================================================================

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================
-- Run this after the migration to verify all tables have RLS enabled:

SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ PROTECTED' ELSE '❌ UNPROTECTED' END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity DESC, tablename;

-- Expected output after running this migration:
-- +----------------------+---------------+
-- | tablename            | RLS Status    |
-- +----------------------+---------------+
-- | User                 | ✅ PROTECTED  |
-- | auth_accounts        | ✅ PROTECTED  |
-- | broker_accounts      | ✅ PROTECTED  |
-- | payment_history      | ✅ PROTECTED  |
-- | position_tags        | ✅ PROTECTED  |
-- | sessions             | ✅ PROTECTED  |
-- | subscription_events  | ✅ PROTECTED  |
-- | tag_definitions      | ✅ PROTECTED  |
-- | trade_group_legs     | ✅ PROTECTED  |
-- | trade_groups         | ✅ PROTECTED  |
-- | trades               | ✅ PROTECTED  |
-- | verification_tokens  | ❌ UNPROTECTED | (OK - no user data, managed by NextAuth)
-- +----------------------+---------------+
