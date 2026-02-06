---
title: Connection and Transaction Management
priority: P0
tags: connections, pgbouncer, transaction, locking
---

# Connection and Transaction Management

## Efficient Connections
*   **PgBouncer**: Always use the transaction-mode pooler URL (port 6543) for serverless environments (like Edge Functions or Vercel).
*   **Client Management**: Ensure clients (e.g., Prisma, `pg`) are initialized once and reused. Close them only on application shutdown.
*   **Idle Timeouts**: Configure short idle timeouts for clients to release connections back to the pooler.

## Transaction Discipline
*   **Keep it Short**: Do not perform long-running operations (like external API calls) inside a database transaction.
*   **Deadlock Prevention**: Always access resources in a consistent order.
*   **Isolation Levels**: Use the default `READ COMMITTED` unless you specifically need `SERIALIZABLE` or `REPEATABLE READ`.

### Example: Sorted Updates for Deadlock Prevention
**Correct (Ensuring consistent order in code):**
```javascript
// Sort IDs before updating to prevent deadlocks with other concurrent transactions
const ids = [3, 1, 2].sort((a, b) => a - b);
await prisma.$transaction(
  ids.map(id => prisma.account.update({
    where: { id },
    data: { balance: { increment: 10 } }
  }))
);
```
