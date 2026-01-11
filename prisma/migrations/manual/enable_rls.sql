-- ============================================================================
-- Row Level Security (RLS) Policies for Artha Trading Journal
-- ============================================================================
-- This migration enables RLS on all user-related tables and creates policies
-- that check the PostgreSQL session variable 'app.current_user_id'.
--
-- The application sets this variable before each query via:
--   SELECT set_config('app.current_user_id', '<user_id>', true);
-- ============================================================================

-- ============================================
-- 1. User Table
-- ============================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own row
CREATE POLICY "user_isolation" ON "User"
    FOR ALL
    USING (id = current_setting('app.current_user_id', true))
    WITH CHECK (id = current_setting('app.current_user_id', true));

-- ============================================
-- 2. Account Table (NextAuth OAuth accounts)
-- ============================================
ALTER TABLE "auth_accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_account_isolation" ON "auth_accounts"
    FOR ALL
    USING ("userId" = current_setting('app.current_user_id', true))
    WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- 3. Session Table (NextAuth sessions)
-- ============================================
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_isolation" ON "sessions"
    FOR ALL
    USING ("userId" = current_setting('app.current_user_id', true))
    WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- 4. BrokerAccount Table
-- ============================================
ALTER TABLE "broker_accounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_account_isolation" ON "broker_accounts"
    FOR ALL
    USING ("userId" = current_setting('app.current_user_id', true))
    WITH CHECK ("userId" = current_setting('app.current_user_id', true));

-- ============================================
-- 5. Trade Table
-- ============================================
ALTER TABLE "trades" ENABLE ROW LEVEL SECURITY;

-- Trades are isolated by checking the parent BrokerAccount's userId
CREATE POLICY "trade_isolation" ON "trades"
    FOR ALL
    USING (
        "accountId" IN (
            SELECT id FROM "broker_accounts"
            WHERE "userId" = current_setting('app.current_user_id', true)
        )
    )
    WITH CHECK (
        "accountId" IN (
            SELECT id FROM "broker_accounts"
            WHERE "userId" = current_setting('app.current_user_id', true)
        )
    );

-- ============================================
-- 6. Tag Table
-- ============================================
-- Tags are currently global (no userId column).
-- For now, we'll leave them accessible to all authenticated users.
-- If you want per-user tags, add a userId column first.
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read/write tags
-- (current_setting returns empty string if not set, so we check it's set)
CREATE POLICY "tag_authenticated_access" ON "tags"
    FOR ALL
    USING (current_setting('app.current_user_id', true) IS NOT NULL AND current_setting('app.current_user_id', true) != '')
    WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL AND current_setting('app.current_user_id', true) != '');

-- ============================================
-- 7. VerificationToken Table
-- ============================================
-- Verification tokens are not user-scoped (used for email verification)
-- They're accessed by token value, not user ID
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;

-- For verification tokens, we need to allow access when setting up auth
-- These are typically accessed before a user session exists
CREATE POLICY "verification_token_access" ON "verification_tokens"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Notes:
-- ============================================
-- 1. The third parameter 'true' in current_setting means "return NULL if missing"
--    instead of throwing an error.
-- 
-- 2. For cron jobs and admin operations, use the service role connection
--    which bypasses RLS (or explicitly set the app.current_user_id).
--
-- 3. To test RLS:
--    SET app.current_user_id = 'user_id_here';
--    SELECT * FROM "broker_accounts"; -- Should only show that user's accounts
-- ============================================
