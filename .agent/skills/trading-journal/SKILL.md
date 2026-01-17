---
name: trading-journal-management
description: Specialized instructions for managing the Artha (Pravaha) trading journal, including FIFO P&L audits, SnapTrade sync management, and database safeguards.
---

# Trading Journal Management Skill

This skill provides the domain-specific knowledge required to maintain and debug the Artha trading journal.

## Core Domain Knowledge

### 1. FIFO P&L Engine
The core of the application is a FIFO (First-In, First-Out) lot matching engine located in `src/app/api/metrics/route.ts`.

- **Lot Matching**: Trades are matched within the SAME `accountId`.
- **Contract Multipliers**:
  - Stocks/ETFs: Multiplier = 1.
  - Options: Multiplier = 100 (standard). 
  - The engine uses `contractMultiplier` from the database, falling back to 100 if the symbol patterns matching `[A-Z]+\s*[0-9]{6}[CP][0-9]{8}` is detected but multiplier is 1.
- **P&L Formula**:
  - Long Close: `(exitPrice - entryPrice) * quantity * multiplier - fees`
  - Short Close: `(entryPrice - exitPrice) * quantity * multiplier - fees`
- **Expirations**: Treated as trades with 0 price. 
  - `quantity < 0` (Closing Long) -> Treated as a Sell.
  - `quantity > 0` (Closing Short) -> Treated as a Buy.

### 2. SnapTrade Integration
- **Sync Window**: The system syncs the last **3 years** of history (updated from 1 year to prevent orphaned trades).
- **User Secrets**: Stored encrypted in the database using `safeEncrypt`/`safeDecrypt`.
- **Account IDs**: Must match between SnapTrade and the local database for FIFO matching to work.

### 3. Database Safety
- **CRITICAL**: Never run `prisma db push --force-reset` on production data. This command drops and recreates the schema, wiping all trades and user sessions.
- **PgBouncer**: Always include `pgbouncer=true` in the `DATABASE_URL` for Supabase connection pooling to avoid "prepared statement already exists" errors.

## Debugging Workflows

### Auditing P&L for a Symbol
When P&L for a symbol (like RKLB) seems incorrect:
1. Fetch all trades for that symbol across all accounts for the specific user.
2. Order by `timestamp` ASC.
3. Check for "Orphaned" trades (e.g., a SELL with no preceding BUY).
4. Verify if the 3-year sync window captured the opening trade.

### Verification Scripts
Use the following pattern to inspect raw data:
```typescript
const trades = await prisma.trade.findMany({
    where: { symbol: { contains: 'SYM' }, account: { userId: 'USER_ID' } },
    orderBy: { timestamp: 'asc' }
});
```

### Session Issues
If the dashboard is empty but data exists:
1. Check for `sessions` in the database.
2. Verify if the user needs to log out and back in to clear a stale JWT session (especially after a database reset/restore).
3. Check for multiple users with the same email in the `User` table.

## Data Validation Rules
Use `src/lib/tradeValidation.ts` to detect:
- Future-dated trades (likely bad data).
- Ancient trades (>10 years).
- Zero/Negative prices (except expirations).
- Zero quantity trades.

## Deployment Checklist
- [ ] Verify `DATABASE_URL` has `pgbouncer=true`.
- [ ] Verify `AUTH_SECRET` and `AUTH_URL` match production.
- [ ] Ensure `RESEND_API_KEY` is set if email auth is enabled.
