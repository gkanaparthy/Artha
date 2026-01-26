---
name: trading-journal-management
description: Specialized instructions for managing the Artha (Pravaha) trading journal, including FIFO P&L audits, SnapTrade sync management, and database safeguards.
---

# Trading Journal Management Skill

This skill provides the domain-specific knowledge required to maintain and debug the Artha trading journal.

## Project Overview

Artha is a trading journal that automatically syncs trades from connected brokerage accounts via SnapTrade API, calculates P&L using FIFO lot matching, and provides analytics.

**Tech Stack:**
- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Prisma with PostgreSQL (Supabase)
- NextAuth (Google/Apple OAuth)
- Framer Motion for animations

**Code Patterns:**
- Path alias: `@/*` maps to `./src/*`
- UI components: shadcn/ui primitives in `src/components/ui/`
- Global state: Filter Context (`src/contexts/filter-context.tsx`) with localStorage persistence
- Brand colors: `#2E4A3B` (dark green), `#FAFBF6` (cream), `#E59889` (coral)

## Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm lint                   # Run ESLint

# Database
pnpm prisma generate        # Regenerate Prisma client after schema changes
pnpm prisma db push         # Push schema changes to database (dev)
pnpm prisma studio          # Open visual database editor
```

## ⚠️ CRITICAL: Testing & Quality Standards

**BEFORE pushing ANY changes to production:**

### 1. Build Verification
- ✅ Run `pnpm build` - must complete with ZERO errors
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

## 🚨 DANGEROUS COMMANDS - NEVER RUN

**These commands will DESTROY ALL DATA in the database. NEVER run them:**

```bash
# NEVER run these - they wipe the entire database:
npx prisma migrate reset          # Drops all tables and data
npx prisma db push --force-reset  # Drops all tables and data
prisma migrate reset              # Drops all tables and data
prisma db push --force-reset      # Drops all tables and data

# NEVER run these SQL commands:
DROP TABLE ...                    # Deletes table and all data
TRUNCATE TABLE ...                # Deletes all data from table
DELETE FROM ... (without WHERE)   # Deletes all rows
```

**If schema changes require destructive actions, STOP and ask the user first.**

## Route Structure

- `/` - Public landing page
- `/login` - OAuth sign-in (Google/Apple)
- `/demo/*` - Public demo mode (no auth required)
- `/privacy`, `/terms`, `/contact` - Public legal pages
- `/(dashboard)/*` - Protected routes (dashboard, journal, reports, settings)
- `/api/*` - REST API endpoints
- `/api/cron/*` - Cron job endpoints (protected by CRON_SECRET)

**Middleware** (`src/middleware.ts`) protects all routes except:
- `/`, `/login`, `/privacy`, `/terms`, `/contact`, `/demo/*` (public pages)
- `/api/auth/*` (auth callbacks)
- `/api/cron/*` (cron jobs - use Bearer token)
- `/api/health` (health check)

## Data Flow

Understanding the end-to-end flow of data in Artha:

1. **User Authentication** - User authenticates via NextAuth (Google/Apple OAuth)
2. **Broker Connection** - User connects broker via SnapTrade (`connect-broker-button.tsx`)
3. **Trade Sync** - `/api/trades/sync` pulls trades, stores in PostgreSQL (25s timeout for Vercel)
4. **P&L Calculation** - `/api/metrics` calculates P&L and returns analytics
5. **Automated Sync** - Cron job (`/api/cron/sync-all`) syncs all users on schedule

## Core Domain Knowledge

### 1. FIFO P&L Engine
The core of the application is a FIFO (First-In, First-Out) lot matching engine located in `src/app/api/metrics/route.ts`.

**Key Characteristics:**
- **Canonical Grouping**: Trades are grouped by `{accountId}:{universalSymbolId or symbol}`
- **Account Isolation**: Trades are matched only within the SAME `accountId`
- **Date Filters**: Applied AFTER FIFO matching (not on raw trades) for accurate cross-period P&L
- **Trade Deduplication**: Prevents duplicate syncs by matching on snapTradeTradeId and content hash

**Contract Multipliers:**
- Stocks/ETFs: Multiplier = 1
- Standard Options: Multiplier = 100
- Mini Options: Multiplier = 10 (detected via `is_mini_option` field)
- The engine uses `contractMultiplier` from the database, falling back to 100 if the symbol pattern matches `[A-Z]+\s*[0-9]{6}[CP][0-9]{8}` and multiplier is 1

**P&L Formula:**
- Long Close: `(exitPrice - entryPrice) * quantity * multiplier - fees`
- Short Close: `(entryPrice - exitPrice) * quantity * multiplier - fees`

**Option Expiration Handling:**
- `OPTIONEXPIRATION` action treated as trades with 0 price
- `quantity < 0` (Closing Long) → Treated as a Sell
- `quantity > 0` (Closing Short) → Treated as a Buy

**Edge Cases:**
- Supports long/short positions
- Options (standard + mini)
- Fee tracking across all position types
- OCC symbol fallback: Raw symbols like `SPXW  260105C06920000` auto-detected as options with 100x multiplier

### 2. SnapTrade Integration

**Service Location:** `src/lib/services/snaptrade.service.ts`

**Key Methods:**
- `registerUser()` - Register user with SnapTrade
- `generateConnectionLink()` - Get OAuth URL for broker connection
- `syncTrades()` - Pull trades from last 3 years
- `getPositions()` - Fetches LIVE positions directly from broker (source of truth for current holdings)

**Important Details:**
- **Sync Window**: The system syncs the last **3 years** of history (updated from 1 year to prevent orphaned trades)
- **User Secrets**: Stored encrypted in the database using `safeEncrypt`/`safeDecrypt`
- **Account IDs**: Must match between SnapTrade and the local database for FIFO matching to work
- **Sync Timeout**: 25 seconds for Vercel free tier compatibility

**🚨 CRITICAL: The SnapTrade SDK returns snake_case fields, not camelCase.**

```typescript
// ✅ Correct field access:
trade.option_symbol      // NOT trade.optionSymbol
trade.option_symbol.option_type   // CALL or PUT
trade.option_symbol.strike_price
trade.option_symbol.expiration_date
trade.option_symbol.is_mini_option
trade.option_symbol.ticker   // OCC symbol for options
trade.trade_date         // NOT trade.tradeDate
trade.settlement_date
trade.option_type        // BUY_TO_OPEN, SELL_TO_CLOSE, etc.
```

**Option vs Stock Detection:**
```typescript
const isOption = !!trade.option_symbol;
const symbol = isOption ? trade.option_symbol.ticker : trade.symbol?.symbol;
const multiplier = isOption ? (trade.option_symbol.is_mini_option ? 10 : 100) : 1;
```

### 3. Database Safety
- **CRITICAL**: Never run `prisma db push --force-reset` on production data. This command drops and recreates the schema, wiping all trades and user sessions.
- **PgBouncer**: Always include `pgbouncer=true` in the `DATABASE_URL` for Supabase connection pooling to avoid "prepared statement already exists" errors.

### 4. Security & RLS (Row Level Security)

**Strict "Deny-All" RLS + Backend Proxy Pattern:**

Artha uses a strict zero-trust posture for database access. Row Level Security (RLS) is used as a kill-switch for direct client access.

**RLS Rules:**
- ✅ **Enable RLS on all tables**: Every table (`User`, `Trade`, `BrokerAccount`, etc.) MUST have RLS enabled
- ✅ **Default Deny**: Do NOT create permissive public policies. The Supabase/PostgREST API should return 0 rows for any unauthenticated or standard authenticated direct client request
- ✅ **Backend Gatekeeper**: All database interactions MUST go through Next.js API routes or Edge Functions
- ✅ **Service Role Secret**: The backend uses the `service_role` key (via Prisma) to bypass RLS after validating the user's identity

**Strict Authorization Requirements:**
- Every API route MUST verify the session JWT via `auth()`
- Every Prisma query MUST include an explicit `{ where: { userId: session.user.id } }` filter
- Never trust a `userId` passed in a request body or URL parameter
- Fail silently or with generic 403 Forbidden errors to prevent account/data enumeration

### 5. Database Schema

Key models in `prisma/schema.prisma`:
- **User** - NextAuth user with SnapTrade credentials (snapTradeUserId, snapTradeUserSecret encrypted)
- **BrokerAccount** - Connected brokerage accounts
- **Trade** - Transactions with option fields:
  - `type`: "STOCK" or "OPTION"
  - `optionType`: "CALL" or "PUT"
  - `strikePrice`, `expiryDate`
  - `optionAction`: BUY_TO_OPEN, SELL_TO_CLOSE, etc.
  - `contractMultiplier`: 100 for standard options, 10 for mini options, 1 for stocks
- **Strategy** - Groups of trades forming a single strategy (e.g. Vertical Spread)
  - `type`: Strategy type (VERTICAL_SPREAD, IRON_CONDOR, etc.)
  - `status`: OPEN or CLOSED
  - `realizedPnL`: Calculated when all legs are closed
- **StrategyLeg** - Linking table between Strategy and Trade

## Common Pitfalls & Gotchas

### SnapTrade API Field Naming
- **Always use snake_case** when accessing SnapTrade SDK responses
- Common mistake: `trade.optionSymbol` (wrong) vs `trade.option_symbol` (correct)
- The SDK does NOT auto-convert to camelCase

### Mini Options Detection
- Must check `is_mini_option` field to get correct multiplier (10 vs 100)
- Affects P&L calculations significantly
- Incorrect multiplier = 10x P&L error

### Account Isolation
- FIFO matching ONLY happens within the same `accountId`
- Cross-account positions are NOT matched
- Symbol alone is not enough - must include accountId in grouping key

### Date Filter Timing
- Date filters are applied AFTER FIFO matching
- This ensures accurate P&L across reporting periods
- Filtering trades before matching can create orphaned positions

### RLS & Security
- Never query database directly from client components
- Always proxy through API routes with proper auth checks
- Always include `userId` filter in Prisma queries

### Sync Window
- 3-year sync window may still miss opening trades for long positions
- Check for orphaned sells when P&L looks wrong
- Older positions may need manual adjustment

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
- Future-dated trades (likely bad data)
- Ancient trades (>10 years)
- Zero/Negative prices (except expirations)
- Zero quantity trades

## Key UI Components

**Connect Broker Button** (`connect-broker-button.tsx`)
- Initiates SnapTrade OAuth flow
- Generates connection link via `/api/snaptrade/connect`
- Opens broker selection in new window

**Filter Context** (`src/contexts/filter-context.tsx`)
- Global state management for date ranges, account filters
- Persists to localStorage
- Used across dashboard, journal, reports

**Motion Components** (`src/components/motion.tsx`)
- Framer Motion wrappers for animations
- Used for page transitions and micro-interactions

## Environment Variables

Required in `.env`:
```
DATABASE_URL              # PostgreSQL (Supabase pooler with pgbouncer=true)
DIRECT_URL                # PostgreSQL (direct for migrations)
AUTH_SECRET               # NextAuth secret
AUTH_URL                  # App URL
GOOGLE_CLIENT_ID          # Google OAuth
GOOGLE_CLIENT_SECRET
SNAPTRADE_CLIENT_ID       # Brokerage API
SNAPTRADE_CONSUMER_KEY
DATA_ENCRYPTION_KEY       # For encrypting SnapTrade secrets
CRON_SECRET               # For cron job authentication
NEXT_PUBLIC_APP_URL
```

## Deployment Checklist
- [ ] Verify `DATABASE_URL` has `pgbouncer=true`
- [ ] Verify `AUTH_SECRET` and `AUTH_URL` match production
- [ ] Ensure all environment variables are set in Vercel
- [ ] Database migrations run (if needed)
- [ ] No hardcoded secrets or local paths
- [ ] `CRON_SECRET` matches in both environment and cron job calls

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
- `scripts/check-pl-actions.ts` - Debug P&L action types
- `scripts/investigate-pl-trades.ts` - Fast investigation of P&L for specific tickers
- `scripts/simulate-metrics-pl.ts` - Simulates the metrics engine locally for debugging
- `scripts/count-positions.ts` - Helper to count current open slots per user
- `scripts/check-pl-owners.ts` - identifies who owns specific trades in the DB


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

### Recent Improvements

**Disabled Connections Handling** (see `docs/DISABLED_CONNECTIONS_PLAN.md`)
- Phase 1: Visual indicators for disabled/stale connections
- Phase 2: Reconnect flow for disabled broker connections
- Improved sync failure handling during reconnect
- Robust tracking and immediate reconnect support
- Fixed critical bug in authorization-to-account matching logic
- Consolidated connection health checking into main sync process (Vercel Hobby plan optimization)
- **Multi-leg Options Strategy Grouping**: Added `strategy-detection.service.ts` to auto-detect iron condors, spreads, etc.
- **Hybrid Positions Table**: Integrated live broker positions (`getPositions`) as the source of truth for current holdings while retaining FIFO for historical P&L.

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

## Quick Reference: Common Code Patterns

### Secure API Route Template
```typescript
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Always filter by userId
  const data = await prisma.trade.findMany({
    where: {
      account: { userId: session.user.id }
    }
  });

  return Response.json(data);
}
```

### Reading SnapTrade Trade Data
```typescript
// Correct snake_case access
const isOption = !!trade.option_symbol;
const symbol = isOption
  ? trade.option_symbol.ticker
  : trade.symbol?.symbol;

const multiplier = isOption
  ? (trade.option_symbol.is_mini_option ? 10 : 100)
  : 1;

const optionType = trade.option_symbol?.option_type; // CALL or PUT
const strikePrice = trade.option_symbol?.strike_price;
```

### FIFO Matching Query Pattern
```typescript
const trades = await prisma.trade.findMany({
  where: {
    account: { userId: session.user.id },
    accountId: accountId, // Ensure same account
    symbol: symbol,
  },
  orderBy: { timestamp: 'asc' }, // FIFO requires chronological order
});
```

### Cron Job Authentication
```typescript
// In cron endpoint
const authHeader = request.headers.get('authorization');
const token = authHeader?.replace('Bearer ', '');

if (token !== process.env.CRON_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}
```

## 🚨 TOP PRIORITY: Developer Safeguards & Hazard Avoidance

To prevent critical system failures and data loss, adhere to these "Vigilance Lessons" learned during complex feature migrations:

### 1. Zero Tolerance for Code Placeholders
**NEVER** use comments like `// ... rest of logic` or `// (previous code)` in a `replace_file_content` call.
*   **Risk**: The tool performs a literal string replacement. These placeholders literally delete the existing logic they are meant to "skip", leading to broken sync engines, data silos, and silent failures.
*   **Action**: Always provide the **complete, expanded code block** for the entire range you are replacing.

### 2. Trade Grouping Continuity
Any trade ingestion (SnapTrade Sync, CSV Import, etc.) MUST be followed by a position key recalculation.
*   **Mechanism**: Use `tradeGroupingService.recalculatePositionKeys(accountId, symbol)`.
*   **Rationale**: Position-based tagging depends on consistent `positionKey` boundaries. Without immediate recalculation, new trades will be invisible to the tagging system or misgrouped.

### 3. O(N²) Loop Prevention
Processing thousands of trades requires Map-based lookups.
*   **Anti-Pattern**: Using `.filter()` or `.find()` inside a loop over trades.
*   **Pattern**: Pre-group into a `Map<string, T[]>` before processing. This is mandatory for Journal and Analytics APIs to remain performant.

### 4. Schema Evolution Protocol
Changing unique identifiers (like the `v1|...` position key) is a "Nuclear Event".
*   **Requirement**: Never update a key format without also creating a `scripts/migrate-*.ts` script to port existing data.
*   **Verification**: Run a count of orphaned tags before and after migration to ensure zero data loss.


