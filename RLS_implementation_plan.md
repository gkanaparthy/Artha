# RLS Implementation Plan (Deferred)

## Overview
We will add Row‑Level Security (RLS) to the Supabase database in a future release. The plan below outlines the steps, security rationale, and required code changes.

### 1️⃣ Security Rationale
- **Defense‑in‑Depth**: Guarantees data isolation even if a developer forgets a `where: { userId }` filter.
- **Centralised Policies**: All tables that store user‑specific data will have policies that check the PostgreSQL session variable `app.current_user_id`.
- **Future‑Proof**: Adding new tables only requires attaching a policy, not updating every route.

### 2️⃣ Database Migration
Create a manual SQL migration (`prisma/migrations/manual/enable_rls.sql`) that:
- Enables RLS on `User`, `auth_accounts`, `sessions`, `broker_accounts`, `trades`, `tags`, `verification_tokens`.
- Defines policies that compare the row’s `userId` (or related account) to `current_setting('app.current_user_id', true)`.
- Provides a bypass policy for admin/cron jobs via a service client.

### 3️⃣ Prisma Client Wrapper
Add `src/lib/prisma-rls.ts` exposing:
- `createRLSClient(userId: string)` – opens a short‑lived transaction, sets the session variable, and returns the transaction client.
- `createServiceClient()` – returns the base Prisma client for admin/cron tasks.

### 4️⃣ Code Changes
- Update every API route to use `await createRLSClient(session.user.id)` (or `createServiceClient` for admin/cron).
- Remove manual `userId` filters where RLS will enforce them.
- Ensure SnapTradeService uses the RLS client for DB writes.

### 5️⃣ Testing & Verification
- Unit tests for the wrapper.
- Integration tests with two users to confirm isolation.
- Load‑testing to ensure no session‑variable leakage.
- Verify cron jobs still access all data via the service client.

### 6️⃣ Deployment
1. Deploy code **without** enabling RLS (client wrapper present but policies disabled).
2. After successful smoke‑test, run the SQL migration on Supabase.
3. Verify isolation in production.

### 7️⃣ Rollback (if needed)
- Disable RLS on all tables via SQL.
- Keep the wrapper but it will be a no‑op.

---
*This plan is stored here for future reference. The current codebase will continue to use explicit `userId` filters until we enable RLS.*
