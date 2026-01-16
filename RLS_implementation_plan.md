# RLS Implementation Plan (Deny-All + Backend Proxy Pattern)

## Overview
Based on modern security best practices (e.g., Burak Eregar's "vibe coded" exploit demonstrations), we are adopting a **strict Deny-All** RLS posture. Instead of complex, error-prone RLS policies, we will use the database's RLS feature as a "kill-switch" for public/direct access and proxy all legitimate traffic through our secure Next.js backend.

---

## Implementation Status

| Step | Description | Status |
|------|-------------|--------|
| 1️⃣ | Code Audit - Verify all API routes have `userId` filters | ✅ COMPLETE |
| 2️⃣ | Create SQL Migration (`harden_db_enable_rls.sql`) | ✅ COMPLETE |
| 3️⃣ | Create Rollback Script (`harden_db_rollback.sql`) | ✅ COMPLETE |
| 4️⃣ | Apply Migration to Supabase | ✅ COMPLETE |
| 5️⃣ | Smoke Test App Functionality | ✅ COMPLETE |
| 6️⃣ | Document in CLAUDE.md and .cursorrules | ✅ COMPLETE |

**🔒 RLS Hardening Complete - 2026-01-15**


---

### 1️⃣ Security Rationale
- **Zero-Trust for Clients**: The frontend and public API should NEVER have direct access to the database rows, even with "good" RLS policies.
- **Backend as Gatekeeper**: All authorization logic is moved to the server (Next.js API routes), where it can be strictly validated, logged, and updated without database migrations.
- **Prevent Mass Exploits**: By denying all `anon` and `authenticated` roles by default, we eliminate the risk of an attacker exploiting a misconfigured RLS policy to bulk-insert or scrape data.
- **JWT-Only Validation**: User ID is extracted and verified from the session JWT server-side, never trusted from client-side request bodies.

### 2️⃣ Database Migration
**File:** `prisma/migrations/manual/harden_db_enable_rls.sql`

This migration:
- **Enables RLS** on `User`, `broker_accounts`, `trades`, `auth_accounts`, `sessions`
- **Creates NO policies** - this is the key! Without policies, all access is denied except for `service_role`
- **Service Role Bypass**: PostgREST and Prisma (running on the server) bypass RLS when using the `service_role` key

### 3️⃣ Backend Proxy Pattern
All 14 API routes have been audited and confirmed to:
- Extract `userId` from `auth()` session (NextAuth v5)
- Include explicit `{ where: { userId: session.user.id } }` in every Prisma query
- Routes using SnapTradeService are also scoped by `localUserId`

**Audited Routes:**
- `/api/trades` (GET, DELETE) ✅
- `/api/accounts` (GET, DELETE) ✅
- `/api/metrics` (GET) ✅
- `/api/positions` (GET) ✅
- `/api/trades/sync` (POST) ✅
- `/api/user` (GET) ✅
- `/api/cron/sync-all` (GET) ✅ - Uses CRON_SECRET + iterates users safely

### 4️⃣ How to Apply the Migration

**Step 1: Go to Supabase SQL Editor**
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query

**Step 2: Run the Migration**
```sql
-- Copy contents of prisma/migrations/manual/harden_db_enable_rls.sql
```

**Step 3: Verify**
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('User', 'broker_accounts', 'trades', 'auth_accounts', 'sessions');
```
All tables should show `rowsecurity = true`.

### 5️⃣ Testing & Verification
After applying the migration:
1. **Test Login**: Ensure you can still log in via Google/Apple OAuth
2. **Test Dashboard**: Ensure trades and metrics load correctly
3. **Test Sync**: Trigger a manual trade sync
4. **Test Direct Access (Should Fail)**: Try to query Supabase directly via Postman using an `anon` key - it should return 0 rows

### 6️⃣ Rollback (if needed)
**File:** `prisma/migrations/manual/harden_db_rollback.sql`

Run this script to disable RLS if the app breaks:
```sql
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "broker_accounts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "trades" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_accounts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;
```

---

## Files Created/Updated

| File | Purpose |
|------|---------|
| `prisma/migrations/manual/harden_db_enable_rls.sql` | Main RLS migration |
| `prisma/migrations/manual/harden_db_rollback.sql` | Rollback script |
| `CLAUDE.md` | Added Security & RLS section |
| `.cursorrules` | Security rules for AI assistants |

---
*This plan prioritizes backend-enforced security over database-level policy management for better operational control and safety.*

