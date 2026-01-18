---
name: trading-journal-management
description: Specialized instructions for managing the Artha (Pravaha) trading journal, including FIFO P&L audits, SnapTrade sync management, and database safeguards.
---

# Trading Journal Management Skill

This skill provides the domain-specific knowledge required to maintain and debug the Artha trading journal.

## ⚠️ CRITICAL: Testing & Quality Standards

**BEFORE pushing ANY changes to production:**

### 1. Build Verification
- ✅ Run `npm run build` - must complete with ZERO errors
- ✅ Check for TypeScript errors in IDE
- ✅ Verify no lint errors introduced

### 2. Regression Testing
- ✅ Test the specific feature you changed
- ✅ Test related features that might be affected
- ✅ **DO NOT break existing functionality**
- ✅ If touching metrics/FIFO: Verify P&L calculations still work
- ✅ If touching auth/encryption: Verify login and data access still work
- ✅ If touching trade sync: Verify new accounts can connect

### 3. Data Integrity
- ✅ Never modify database schema without migration strategy
- ✅ When adding encryption/decryption: Audit ALL read/write paths
- ✅ Test with REAL user scenarios, not just synthetic data

### 4. User Impact Assessment
- ✅ Will users need to logout/login?
- ✅ Will existing data need migration?
- ✅ Are there any breaking changes to UI/API contracts?

### 5. Deployment Checklist
- ✅ All environment variables set in Vercel
- ✅ Database migrations run (if needed)
- ✅ No hardcoded secrets or local paths
- ✅ Commit messages clearly explain the change

**Philosophy:** Every change should make the app better, not just different. Test thoroughly and think about edge cases.

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

## Useful Tools & Scripts

### YTD P&L Calculator
**Location:** `scripts/calculate-ytd-pnl.ts`

A reusable command-line tool to calculate Year-to-Date P&L for any user using the same FIFO engine as the metrics API.

**Usage:**
```bash
# By user name (partial match)
npx tsx scripts/calculate-ytd-pnl.ts --user "Suman"

# Custom date range
npx tsx scripts/calculate-ytd-pnl.ts --user "Suman" --startDate "2026-01-01" --endDate "2026-01-15"

# JSON output
npx tsx scripts/calculate-ytd-pnl.ts --user "Suman" --json
```

**Output:** Total P&L, monthly breakdown, top winners/losers, trade counts

### Diagnostic Scripts
- `scripts/diagnose-orphaned-trades.ts` - Detects phantom positions
- `scripts/check-recent-trades.ts` - Verifies recent sync activity
- `scripts/verify-live-positions.ts` - Compares DB vs broker positions


## Monitoring Workflows

### Check for Recent Trade Activity

To verify if trades are being synced properly, check for recent activity:

**For a specific user:**
```bash
npx tsx scripts/check-recent-trades.ts "Username"
```

**For all users (quick check):**
```typescript
// Create a monitoring script if needed
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

const recentTrades = await prisma.trade.findMany({
  where: {
    timestamp: { gte: twoDaysAgo }
  },
  include: {
    account: {
      include: { user: true }
    }
  },
  orderBy: { timestamp: 'desc' },
  take: 50
});

// Group by user
const byUser = recentTrades.reduce((acc, trade) => {
  const userId = trade.account.userId;
  if (!acc[userId]) acc[userId] = [];
  acc[userId].push(trade);
  return acc;
}, {});
```

**Red flags:**
- No trades in 2+ days for active users → Sync may be broken
- Trades only from weekdays → Check if weekend syncs work
- Same timestamp for many trades → Possible sync duplication

### Verify Sync Status

Check when each user's broker account was last synced:

```bash
# Look at most recent trade per account
SELECT 
  ba.brokerName,
  u.name,
  MAX(t.timestamp) as last_trade,
  COUNT(*) as total_trades
FROM broker_accounts ba
JOIN trades t ON t.accountId = ba.id
JOIN users u ON u.id = ba.userId
GROUP BY ba.id, ba.brokerName, u.name
ORDER BY MAX(t.timestamp) DESC;
```

If last_trade is > 48 hours ago and it's a trading day, investigate sync issues.


## Common Workflows

### Check for Recent Trade Activity
To verify if new trades have been synced for a user in the last 1-2 days:

```bash
# Check specific user
npx tsx scripts/check-recent-trades.ts "Username"
```

**What it checks:**
- Trades from the last 2 days (Jan 17-18 if today is Jan 18)
- Most recent trade in database
- Total trade count

**Expected output:**
```
📊 Checking trades for: username
📅 Trades from Jan 17-18, 2026: 15
📅 Most recent trade: 2026-01-18T14:30:00.000Z
📊 Total trades in database: 1015
```

**If no recent trades:**
- User may need to run "Sync Trades" manually
- Check if broker has new activity
- Verify auto-sync cron is running

