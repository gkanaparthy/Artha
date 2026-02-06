---
name: postgres-best-practices
description: Postgres performance optimization and best practices for AI agents. Covers query performance, connection management, security/RLS, schema design, concurrency, pagination, and monitoring.
argument-hint: <sql-or-file>
---

# PostgreSQL Best Practices for AI Agents

Comprehensive performance optimization guide for PostgreSQL, based on Supabase's agent-skills. Use this when writing, reviewing, or optimizing SQL queries, schema designs, migrations, or database configurations.

## When to Use

**ALWAYS run this skill when:**
- Writing or reviewing SQL queries
- Creating or modifying database schema (`prisma/schema.prisma`)
- Designing indexes for performance
- Implementing Row Level Security (RLS) policies
- Writing database migrations
- Optimizing slow queries
- Debugging connection or locking issues

**Invoke manually:**
```bash
/postgres-best-practices src/app/api/metrics/route.ts
/postgres-best-practices prisma/schema.prisma
/postgres-best-practices "SELECT * FROM orders WHERE status = 'pending'"
```

---

## Category 1: Query Performance (CRITICAL)

### Rule 1.1: Add Indexes on WHERE and JOIN Columns
**Severity:** CRITICAL - 100-1000x faster queries on large tables

Queries filtering or joining on unindexed columns cause full table scans, which become exponentially slower as tables grow.

**INCORRECT (Sequential Scan):**
```sql
-- No index on customer_id causes full table scan
SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN shows: Seq Scan on orders (cost=0.00..25000.00 rows=100 width=85)
```

**CORRECT (Index Scan):**
```sql
-- Create index on frequently filtered column
CREATE INDEX orders_customer_id_idx ON orders (customer_id);

SELECT * FROM orders WHERE customer_id = 123;

-- EXPLAIN shows: Index Scan using orders_customer_id_idx (cost=0.42..8.44 rows=100 width=85)
```

**For JOINs, always index the foreign key side:**
```sql
-- Index the referencing column (not the primary key side)
CREATE INDEX orders_customer_id_idx ON orders (customer_id);

SELECT c.name, o.total
FROM customers c
JOIN orders o ON o.customer_id = c.id;
```

---

### Rule 1.2: Use Composite Indexes for Multi-Column Queries
**Severity:** HIGH - 5-10x faster multi-column queries

When queries filter on multiple columns, a composite index is more efficient than separate single-column indexes.

**INCORRECT (Multiple Single Indexes):**
```sql
CREATE INDEX orders_status_idx ON orders (status);
CREATE INDEX orders_created_idx ON orders (created_at);

SELECT * FROM orders WHERE status = 'pending' AND created_at > '2024-01-01';
-- PostgreSQL must combine results from both indexes (slower)
```

**CORRECT (Composite Index):**
```sql
CREATE INDEX orders_status_created_idx ON orders (status, created_at);

SELECT * FROM orders WHERE status = 'pending' AND created_at > '2024-01-01';
-- Single efficient index scan
```

**Column Order Rules:**
1. **Equality conditions first** (columns using `=`)
2. **Range conditions last** (columns using `>`, `<`, `BETWEEN`)

```sql
-- CORRECT order: equality first, then range
CREATE INDEX idx ON orders (status, created_at);

-- Works for:
-- WHERE status = 'pending'
-- WHERE status = 'pending' AND created_at > '2024-01-01'

-- Does NOT work efficiently for:
-- WHERE created_at > '2024-01-01' (violates leftmost prefix rule)
```

---

### Rule 1.3: Always Index Foreign Keys
**Severity:** HIGH - 10-100x slower JOINs and CASCADE operations without FK indexes

PostgreSQL does NOT automatically create indexes on foreign key columns.

**INCORRECT (Unindexed FK):**
```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  total NUMERIC(10,2)
);

-- No index on customer_id!
-- Both JOINs and ON DELETE CASCADE require full table scans
SELECT * FROM orders WHERE customer_id = 123;  -- Seq Scan
DELETE FROM customers WHERE id = 123;           -- Locks table, scans all orders
```

**CORRECT (Indexed FK):**
```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  total NUMERIC(10,2)
);

-- Always index the FK column
CREATE INDEX orders_customer_id_idx ON orders (customer_id);

-- Now JOINs and cascades are fast
SELECT * FROM orders WHERE customer_id = 123;  -- Index Scan
DELETE FROM customers WHERE id = 123;           -- Uses index, fast cascade
```

**Find Missing FK Indexes:**
```sql
SELECT
  conrelid::regclass AS table_name,
  a.attname AS fk_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid
  AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND a.attnum = ANY(i.indkey)
  );
```

---

## Category 2: Connection Management (CRITICAL)

### Rule 2.1: Use Connection Pooling
**Severity:** CRITICAL - Handle 10-100x more concurrent users

PostgreSQL connections consume significant resources (1-3MB RAM each). Without pooling, applications quickly exhaust available connections under load.

**Formula for pool size:** `(CPU cores x 2) + spindle_count`

For a 4-core system: pool_size = 10

**Pool Modes:**
1. **Transaction Mode (recommended):** Connections return to pool after each transaction
2. **Session Mode:** Connections remain held for entire sessions (required for prepared statements)

**Supabase uses PgBouncer by default.** Use the connection pooler URL for application connections:
```bash
# Connection pooler (use in application)
DATABASE_URL="postgres://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true"

# Direct connection (use for migrations only)
DIRECT_URL="postgres://user:pass@db.xxx.supabase.co:5432/postgres"
```

---

## Category 3: Security & RLS (CRITICAL)

### Rule 3.1: Enable Row Level Security
**Severity:** CRITICAL - Database-enforced tenant isolation

RLS enforces data access at the database level, ensuring users only see their own data regardless of application bugs.

**INCORRECT (Application-Level Filtering Only):**
```sql
-- A bug or bypass exposes ALL orders
SELECT * FROM orders WHERE user_id = $current_user_id;
-- If application code is bypassed:
SELECT * FROM orders;  -- Returns everything!
```

**CORRECT (Database-Enforced RLS):**
```sql
-- Enable RLS on table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Create access policy
CREATE POLICY orders_user_policy ON orders
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::bigint);

-- Or for Supabase authenticated users:
CREATE POLICY orders_user_policy ON orders
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());
```

---

### Rule 3.2: Optimize RLS Policy Performance
**Severity:** HIGH - 5-10x faster queries with optimized RLS

Calling functions directly in RLS policies causes them to execute per row.

**INCORRECT (Per-Row Function Call):**
```sql
CREATE POLICY orders_policy ON orders
  USING (auth.uid() = user_id);
-- auth.uid() called once per row! Slow on large tables.
```

**CORRECT (Cached Function Call):**
```sql
CREATE POLICY orders_policy ON orders
  USING ((SELECT auth.uid()) = user_id);
-- auth.uid() called once, cached. 100x+ faster on large tables.
```

**For complex authorization, use SECURITY DEFINER functions:**
```sql
CREATE OR REPLACE FUNCTION is_team_member(team_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = (SELECT auth.uid())
  );
$$;

CREATE POLICY team_orders_policy ON orders
  USING ((SELECT is_team_member(team_id)));
```

**Always index columns used in RLS policies:**
```sql
CREATE INDEX orders_user_id_idx ON orders (user_id);
```

---

## Category 4: Schema Design (HIGH)

### Rule 4.1: Use Proper Data Types
**Severity:** HIGH

- Use `BIGINT` for IDs (not `INT`) - future-proof for scale
- Use `NUMERIC(precision, scale)` for money, not `FLOAT`
- Use `TIMESTAMPTZ` for timestamps (timezone-aware)
- Use `TEXT` instead of `VARCHAR` (no performance difference in Postgres)

```sql
CREATE TABLE trades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  symbol TEXT NOT NULL,
  price NUMERIC(12, 4) NOT NULL,  -- Up to 12 digits, 4 decimal places
  quantity NUMERIC(18, 8) NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### Rule 4.2: Use Lowercase Identifiers
**Severity:** MEDIUM

PostgreSQL folds unquoted identifiers to lowercase. Use lowercase names to avoid quoting issues.

**INCORRECT:**
```sql
CREATE TABLE "UserAccounts" ("userId" INT);
-- Must always quote: SELECT "userId" FROM "UserAccounts"
```

**CORRECT:**
```sql
CREATE TABLE user_accounts (user_id INT);
-- No quoting needed: SELECT user_id FROM user_accounts
```

---

## Category 5: Concurrency & Locking (MEDIUM-HIGH)

### Rule 5.1: Keep Transactions Short
**Severity:** MEDIUM-HIGH - 3-5x throughput improvement

Long-running transactions hold locks that block other queries. Never include external operations (API calls) inside transactions.

**INCORRECT (Long Lock Hold):**
```sql
BEGIN;
SELECT * FROM orders WHERE id = 1 FOR UPDATE;  -- Lock acquired

-- Application makes HTTP call to payment API (2-5 seconds)
-- Other queries on this row are BLOCKED!

UPDATE orders SET status = 'paid' WHERE id = 1;
COMMIT;  -- Lock held for entire duration
```

**CORRECT (Short Transaction):**
```sql
-- Validate data and call APIs OUTSIDE transaction
-- Application: response = await paymentAPI.charge(...)

-- Only hold lock for the actual update
BEGIN;
UPDATE orders
SET status = 'paid', payment_id = $1
WHERE id = $2 AND status = 'pending'
RETURNING *;
COMMIT;  -- Lock held for milliseconds
```

**Add timeouts to prevent runaway transactions:**
```sql
SET statement_timeout = '30s';  -- Global
SET LOCAL statement_timeout = '5s';  -- Session-specific
```

---

### Rule 5.2: Prevent Deadlocks with Consistent Lock Ordering
**Severity:** MEDIUM-HIGH - Eliminates deadlock errors

Deadlocks occur when transactions lock resources in different orders.

**INCORRECT (Deadlock Risk):**
```sql
-- Transaction A: locks row 1, waits for row 2
-- Transaction B: locks row 2, waits for row 1
-- Result: DEADLOCK
```

**CORRECT (Consistent Ordering):**
```sql
BEGIN;
-- Always acquire locks in consistent order (e.g., by ID)
SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

**Or use atomic single statements:**
```sql
BEGIN;
UPDATE accounts
SET balance = balance + CASE id
  WHEN 1 THEN -100
  WHEN 2 THEN 100
END
WHERE id IN (1, 2);
COMMIT;  -- All locks acquired atomically
```

**Monitor for deadlocks:**
```sql
SELECT * FROM pg_stat_database WHERE deadlocks > 0;
SET log_lock_waits = on;
SET deadlock_timeout = '1s';
```

---

## Category 6: Data Access Patterns (MEDIUM)

### Rule 6.1: Use Cursor-Based Pagination (Not OFFSET)
**Severity:** MEDIUM-HIGH - Consistent O(1) performance regardless of page depth

OFFSET-based pagination scans all skipped rows, degrading performance on deeper pages.

**INCORRECT (OFFSET Pagination):**
```sql
-- Page 1 (offset 0): scans 20 rows
-- Page 100 (offset 1980): scans 2,000 rows
-- Page 10,000 (offset 199,980): scans 200,000 rows
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 199980;  -- Slow!
```

**CORRECT (Cursor/Keyset Pagination):**
```sql
-- Single column cursor
SELECT * FROM products WHERE id > $last_id ORDER BY id LIMIT 20;

-- Multi-column cursor (include all sort columns)
SELECT * FROM products
WHERE (created_at, id) > ($last_created_at, $last_id)
ORDER BY created_at, id
LIMIT 20;
```

---

### Rule 6.2: Eliminate N+1 Queries
**Severity:** MEDIUM-HIGH - 10-100x fewer database round trips

N+1 queries occur when fetching related data in a loop.

**INCORRECT (N+1 Pattern):**
```typescript
// 1 query for users
const users = await db.query('SELECT * FROM users WHERE active = true');
// N queries for orders (one per user)
for (const user of users) {
  const orders = await db.query('SELECT * FROM orders WHERE user_id = $1', [user.id]);
}
// Total: 101 database round trips for 100 users!
```

**CORRECT (Batch Loading):**
```sql
-- Method 1: Array parameter
SELECT * FROM orders WHERE user_id = ANY($1::bigint[]);
-- Pass: [1, 2, 3, 4, 5, ...]

-- Method 2: JOIN
SELECT u.id, u.name, o.*
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.active = true;

-- Total: 1 database round trip
```

---

### Rule 6.3: Use UPSERT for Insert-or-Update
**Severity:** MEDIUM

```sql
INSERT INTO user_settings (user_id, theme, notifications)
VALUES ($1, $2, $3)
ON CONFLICT (user_id)
DO UPDATE SET
  theme = EXCLUDED.theme,
  notifications = EXCLUDED.notifications,
  updated_at = NOW();
```

---

## Category 7: Monitoring & Diagnostics (LOW-MEDIUM)

### Rule 7.1: Use EXPLAIN ANALYZE
**Severity:** MEDIUM - Essential for query optimization

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 123;
```

**Look for:**
- `Seq Scan` on large tables (add index)
- High `actual time` vs low `rows` (inefficient query)
- `Sort` without index (add index with matching ORDER BY)

---

### Rule 7.2: Monitor with pg_stat_statements
**Severity:** LOW-MEDIUM

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT
  calls,
  mean_exec_time::int AS avg_ms,
  total_exec_time::int AS total_ms,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

### Rule 7.3: Run VACUUM and ANALYZE
**Severity:** LOW-MEDIUM

```sql
-- Update table statistics for query planner
ANALYZE orders;

-- Reclaim dead tuple space (usually runs automatically)
VACUUM orders;

-- For heavy write tables, run more aggressively
VACUUM ANALYZE orders;
```

---

## Audit Checklist

When reviewing database code, verify:

### Query Performance
- [ ] All WHERE columns have indexes
- [ ] All JOIN foreign keys have indexes
- [ ] Composite indexes for multi-column queries (equality first, range last)
- [ ] No SELECT * in production code (select specific columns)
- [ ] EXPLAIN ANALYZE shows Index Scan (not Seq Scan) for large tables

### Security & RLS
- [ ] RLS enabled on all multi-tenant tables
- [ ] RLS policies use `(SELECT auth.uid())` pattern (cached)
- [ ] Columns referenced in RLS have indexes
- [ ] No bypass of RLS in application code

### Schema Design
- [ ] Foreign keys have indexes
- [ ] Proper data types (BIGINT for IDs, NUMERIC for money, TIMESTAMPTZ for dates)
- [ ] Lowercase identifiers (no quoted names)

### Concurrency
- [ ] Transactions are short (no external calls inside)
- [ ] Lock ordering is consistent (ORDER BY id FOR UPDATE)
- [ ] Statement timeouts configured

### Data Access
- [ ] Cursor pagination instead of OFFSET
- [ ] No N+1 queries (use JOINs or batch loading)
- [ ] UPSERT for insert-or-update patterns

---

## Common Mistakes

### 1. Missing Index on Frequently Filtered Column
```sql
-- BEFORE (Seq Scan)
SELECT * FROM trades WHERE user_id = 123;

-- AFTER (add index)
CREATE INDEX trades_user_id_idx ON trades (user_id);
```

### 2. RLS Policy Calling Function Per Row
```sql
-- BEFORE (slow)
CREATE POLICY p ON trades USING (auth.uid() = user_id);

-- AFTER (fast - cached)
CREATE POLICY p ON trades USING ((SELECT auth.uid()) = user_id);
```

### 3. OFFSET Pagination on Large Tables
```sql
-- BEFORE (slow at page 1000)
SELECT * FROM trades ORDER BY id LIMIT 50 OFFSET 50000;

-- AFTER (fast at any page)
SELECT * FROM trades WHERE id > $last_id ORDER BY id LIMIT 50;
```

### 4. Long Transaction with External Calls
```typescript
// BEFORE (locks held for seconds)
await db.query('BEGIN');
await db.query('SELECT * FROM orders WHERE id = 1 FOR UPDATE');
await paymentAPI.charge(...);  // External call while lock held!
await db.query('UPDATE orders SET status = paid WHERE id = 1');
await db.query('COMMIT');

// AFTER (minimal lock time)
const order = await db.query('SELECT * FROM orders WHERE id = 1');
await paymentAPI.charge(...);  // External call outside transaction
await db.query(`
  UPDATE orders SET status = 'paid'
  WHERE id = 1 AND status = 'pending'
`);
```

---

## References

- [Supabase Postgres Best Practices](https://supabase.com/blog/postgres-best-practices-for-ai-agents)
- [Supabase Agent Skills Repository](https://github.com/supabase/agent-skills)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)

---

**Skill Version:** 1.0
**Last Updated:** 2026-02-05
**Based On:** Supabase Agent Skills for Postgres Best Practices
