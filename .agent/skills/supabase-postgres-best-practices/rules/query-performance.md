---
title: Query Performance Optimization
priority: P0
tags: index, performance, explain-analyze
---

# Query Performance Optimization

## Use Indexes Effectively
*   **Foreign Keys**: Every foreign key column should have an index. This is critical for joins and cascade deletes.
*   **Selective Columns**: Index columns that have high cardinality and are frequently used in `WHERE` and `JOIN` clauses.
*   **Covering Indexes**: Use `INCLUDE` to add columns to an index for index-only scans if a query frequently selects extra columns.

## Avoid Full Table Scans
*   Use `EXPLAIN ANALYZE` to check for `Seq Scan` on large tables.
*   Check if functional indexes are needed (e.g., indexing `lower(email)`).

## Efficient SQL Patterns
*   **Limit your sets**: Always use `LIMIT` unless you truly need the entire set.
*   **Avoid SELECT ***: Specify columns to reduce data transfer and enable index-only scans.
*   **Use CTEs for Clarity**: Common Table Expressions (CTEs) make complex queries readable and can help the optimizer in Postgres 12+.

### Example: Indexing Foreign Keys
**Incorrect:**
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id) -- Missing index!
);
```

**Correct:**
```sql
CREATE TABLE orders (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id)
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```
