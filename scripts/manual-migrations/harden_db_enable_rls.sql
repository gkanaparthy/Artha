-- =============================================================================
-- RLS Hardening Migration: Deny-All + Backend Proxy Pattern
-- =============================================================================
-- This migration enables Row-Level Security on all user-data tables WITHOUT
-- creating any public access policies. This effectively "closes" the database
-- to any direct PostgREST/Supabase client access.
--
-- Our Next.js backend uses the `service_role` key via the Prisma connection
-- string, which BYPASSES RLS entirely. This provides a safe "deny-all" posture
-- for the following tables:
--   - User
--   - BrokerAccount (broker_accounts)
--   - Trade (trades)
--   - Account (auth_accounts) - NextAuth OAuth accounts
--   - Session (sessions) - NextAuth sessions
--
-- NOTE: VerificationToken and Tag are excluded:
--   - VerificationToken: Managed by NextAuth, no userId column
--   - Tag: Currently a global resource (may add userId later)
--
-- TO RUN THIS MIGRATION:
--   1. Connect to your Supabase SQL Editor
--   2. Paste and execute this script
--   3. Verify the app still functions (backend uses service_role bypass)
--
-- TO ROLLBACK:
--   ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "broker_accounts" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "trades" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "auth_accounts" DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;
-- =============================================================================

-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on BrokerAccount table
ALTER TABLE "broker_accounts" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Trade table
ALTER TABLE "trades" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on NextAuth Account table (OAuth accounts)
ALTER TABLE "auth_accounts" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on NextAuth Session table
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- NO POLICIES CREATED BY DESIGN
-- =============================================================================
-- By not creating any policies, all operations (SELECT, INSERT, UPDATE, DELETE)
-- are DENIED by default for any role except:
--   1. The `service_role` (used by our Prisma backend)
--   2. The `postgres` superuser (used for migrations)
--
-- This is the safest configuration for a "Backend as Proxy" architecture.
-- =============================================================================

-- Verify RLS is enabled (optional check)
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('User', 'broker_accounts', 'trades', 'auth_accounts', 'sessions');
