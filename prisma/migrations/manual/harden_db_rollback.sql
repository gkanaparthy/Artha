-- =============================================================================
-- RLS Rollback Script: Disable RLS on all tables
-- =============================================================================
-- Use this script if you need to roll back the RLS hardening migration.
-- This will disable RLS on all protected tables, returning the database to its
-- previous state where direct client access would work (if policies existed).
--
-- NOTE: This does NOT delete any policies - it just disables enforcement.
-- =============================================================================

ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "broker_accounts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "trades" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_accounts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('User', 'broker_accounts', 'trades', 'auth_accounts', 'sessions');
