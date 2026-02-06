---
name: supabase-postgres-best-practices
description: A collection of best practices for writing efficient, secure, and scalable Postgres code for Supabase.
---

# Supabase Postgres Best Practices

This skill provides authoritative guidance for writing Postgres code within the Supabase ecosystem. It prioritizes system stability, security (RLS), and query performance.

## Core Principles

1.  **Prioritize Security (RLS)**: Row Level Security is the source of truth for multi-tenant isolation.
2.  **Optimize for Scale**: Avoid full table scans, manage connections efficiently, and prevent database-level deadlocks.
3.  **Use Native Features**: Leverage Postgres-specific capabilities (CTEs, window functions, extensions) when appropriate, but avoid complex logic that hides performance bottlenecks.

## Rule Categories

### P0: Query Performance (CRITICAL)
*   **Prevent Full Table Scans**: Always ensure queries use indexes. Foreign keys should almost always be indexed.
*   **Analyze Queries**: Use `EXPLAIN ANALYZE` to identify bottlenecks.
*   **Efficient Scans**: Prefer Index Scans or Index Only Scans over Sequential Scans for large tables.

### P0: Connection Management (CRITICAL)
*   **Use Connection Pooling**: Use PgBouncer (Transaction Mode) for high-concurrency or serverless environments.
*   **Limit Connections**: Monitor client-side connection counts to prevent "Too many connections" errors.
*   **Short Transactions**: Keep transactions as short as possible to release resources and prevent locking issues.

### P0: Security & RLS (CRITICAL)
*   **Performance-Aware Policies**: Avoid expensive subqueries in `USING` clauses. Prefer `auth.uid()` or JWT claims.
*   **Server-Side Enforcement**: Never rely solely on application-level filtering for multi-tenant data.
*   **Function Security**: Set `LEAKPROOF` on functions used in RLS if they don't leak information.

### P1: Schema Design (HIGH)
*   **Appropriate Data Types**: Use `UUID` for identifiers, `TIMESTAMPTZ` for dates, and `JSONB` for flexible data (with proper indexing).
*   **Primary Keys**: Every table must have a primary key.
*   **Normalized Structures**: Favor normalization for consistency, using views or materialized views for performance if needed.

### P2: Concurrency & Locking (MEDIUM-HIGH)
*   **Consistent Update Order**: To prevent deadlocks, always update rows in the same order (e.g., sort by ID).
*   **Advisory Locks**: Use `pg_advisory_xact_lock()` for application-level concurrency control that spans multiple rows.
*   **Avoid Over-Locking**: Be cautious with `FOR UPDATE` and specific isolation levels.

### P3: Data Access Patterns (MEDIUM)
*   **Batch Operations**: Use bulk inserts/updates/deletes instead of multiple single-record operations.
*   **Avoid N+1**: Use joins or JSON aggregation (`json_agg`) to fetch related data in a single query.
*   **Pagination**: Use cursor-based pagination (e.g., `WHERE id > last_seen_id`) instead of large `OFFSET`.

---

## Code Examples

### Connection Pooling
**Incorrect (New connection per request):**
```javascript
const client = new Client();
await client.connect();
const res = await client.query('SELECT now()');
await client.end();
```

**Correct (Persistent Pool / Pooler URL):**
```javascript
// DATABASE_URL=postgres://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:6543/postgres?pgbouncer=true
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query('SELECT now()');
```

### Deadlock Prevention
**Incorrect (Random order):**
```sql
-- Transaction A
UPDATE users SET balance = balance - 10 WHERE id = 101;
UPDATE users SET balance = balance + 10 WHERE id = 100;
```

**Correct (Sorted order):**
```sql
-- Transaction A (Always smaller ID first)
UPDATE users SET balance = balance + 10 WHERE id = 100;
UPDATE users SET balance = balance - 10 WHERE id = 101;
```

### N+1 Query Elimination
**Incorrect (Looping in JS):**
```javascript
const users = await prisma.user.findMany();
for (const user of users) {
  user.posts = await prisma.post.findMany({ where: { userId: user.id } });
}
```

**Correct (Single query with includes/joins):**
```javascript
const usersWithPosts = await prisma.user.findMany({
  include: { posts: true }
});
```

## Diagnostics Checklist
When debugging performance issues, check:
1.  Is there an index on the columns used in the `WHERE` clause?
2.  Is the query resulting in a Sequential Scan on a large table?
3.  Are there too many open connections?
4.  Are RLS policies using subqueries that run for every row?

---

## 🚨 MANDATORY: RLS for New Tables

**CRITICAL REQUIREMENT**: Whenever a new table is added to the Prisma schema, RLS MUST be enabled immediately after running the migration.

### Why This Matters
Without RLS, if Supabase API keys are ever exposed, an attacker could directly query all data in that table via PostgREST. Our backend uses the `service_role` (postgres user) which bypasses RLS, so the app continues to work normally.

### Steps for New Tables

1. **Add table to Prisma schema** (`prisma/schema.prisma`)
2. **Run Prisma migration**: `npx prisma migrate dev --name add_new_table`
3. **Enable RLS immediately** in Supabase SQL Editor:

```sql
-- Replace "new_table_name" with the actual table name from schema.prisma
-- Use the @@map name if defined, otherwise the model name
ALTER TABLE "new_table_name" ENABLE ROW LEVEL SECURITY;

-- NO POLICIES = Deny-All pattern (service_role bypasses RLS)
```

4. **Verify RLS is enabled**:

```sql
SELECT tablename, rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Template for Multiple Tables

```sql
-- Enable RLS on new tables (run after each Prisma migration)
ALTER TABLE "table_name_1" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "table_name_2" ENABLE ROW LEVEL SECURITY;
-- Add more as needed
```

### Current RLS Status (as of 2026-02-05)

All user data tables have RLS enabled with deny-all policies:
- ✅ User, auth_accounts, broker_accounts, sessions, trades
- ✅ payment_history, subscription_events
- ✅ tag_definitions, position_tags
- ✅ trade_groups, trade_group_legs
- ⚪ verification_tokens (excluded - no userId, managed by NextAuth)

### Migration Scripts Location
All RLS migration scripts are stored in:
```
scripts/manual-migrations/
├── harden_db_enable_rls.sql      # Original v1 (core tables)
├── harden_db_enable_rls_v2.sql   # Extended tables
├── enable_missing_rls.sql        # Catch-up script
└── harden_db_rollback.sql        # Rollback if needed
```
