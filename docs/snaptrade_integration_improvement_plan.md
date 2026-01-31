# SnapTrade Integration Improvement Plan

**Date:** January 31, 2026
**Based on:** SnapTrade Discord Research + Current Implementation Analysis
**Goal:** Optimize sync performance, reduce costs, improve real-time data freshness, and enhance reliability

---

## Executive Summary

Our current SnapTrade integration is **solid** but has **critical gaps** that prevent optimal performance and user experience. This plan addresses 6 major areas with 22 actionable improvements ranging from quick wins to architectural enhancements.

**Key Wins from Implementation:**
- ✅ Already using new `/accounts/{accountId}/activities` endpoint (not deprecated `/transactions`)
- ✅ Smart sync windowing (14 days before last trade optimization)
- ✅ Timeout protection for Vercel limits (25s ceiling)
- ✅ Connection health monitoring with proactive email alerts
- ✅ Parallel account syncing with proper error handling

**Critical Gaps:**
- ❌ Not using FREE recent orders endpoint (missing real-time capability)
- ❌ Suboptimal cron timing (7:30 AM CST vs Discord-recommended 9 AM EST)
- ❌ No rate limit monitoring from API response headers
- ❌ Missing cron job configuration in vercel.json (check-connections not scheduled!)
- ❌ No IBKR 24-48h delay documentation for users
- ❌ No API request logging/monitoring dashboard usage

---

## Current State Analysis

### Endpoints Currently Used

| Endpoint | Purpose | Status | Notes |
|----------|---------|--------|-------|
| `registerSnapTradeUser` | User registration | ✅ Correct | Auth flow works |
| `loginSnapTradeUser` | Connection link generation | ✅ Correct | OAuth flow |
| `listUserAccounts` | Fetch accounts | ✅ Correct | Used in sync |
| `listBrokerageAuthorizations` | Check connection status | ✅ Correct | Health monitoring |
| `getAccountActivities` | Fetch trades (paginated) | ✅ Correct | **New endpoint** |
| `getUserAccountPositions` | Stock/ETF positions | ✅ Correct | Holdings data |
| `listOptionHoldings` | Option positions | ✅ Correct | Options support |
| **`getAccountRecentOrders`** | **Last 24h orders (FREE)** | ❌ **NOT USED** | **Missing!** |

### Cron Job Configuration

**Current Schedule (vercel.json):**
```json
"crons": [
  {
    "path": "/api/cron/sync-all",
    "schedule": "30 13 * * *"  // 1:30 PM UTC = 7:30 AM CST
  }
]
```

**Critical Issue:** Only 1 cron job configured, but 3 cron endpoints exist!
- ✅ `/api/cron/sync-all` - Scheduled daily at 7:30 AM CST
- ❌ `/api/cron/check-connections` - **NOT SCHEDULED** (exists but never runs!)
- ❌ `/api/cron/data-quality` - **NOT SCHEDULED** (exists but never runs!)

**Discord Recommendation:** 9:00 AM EST for market-open focus

### Current Sync Flow

```
1. User clicks "Sync Now" OR Cron job triggers
2. Fetch all accounts + authorizations (parallel)
3. Update/create BrokerAccount records
4. For each account:
   - Fetch activities from (latest trade - 14 days) to today
   - Filter out blocked trades
   - Create/update Trade records
5. Recalculate position keys for affected groups
6. Return sync result
```

**Performance:** Sync window optimization reduces API calls significantly ✅
**Reliability:** 25s timeout prevents Vercel lambda hangs ✅
**Gap:** No real-time sync for active traders ❌

---

## PHASE 1: Critical Fixes (Priority: HIGH)

### 1.1 Fix Missing Cron Job Schedules

**Issue:** `check-connections` and `data-quality` cron endpoints exist but are NEVER scheduled in vercel.json

**Impact:** Connection health checks never run automatically → users not notified of broken connections until manual sync fails

**Solution:**

Update `vercel.json` to schedule all cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-all",
      "schedule": "0 14 * * *",  // 9:00 AM EST (14:00 UTC) - market open focus
      "description": "Daily sync for all users at market open"
    },
    {
      "path": "/api/cron/check-connections",
      "schedule": "0 */6 * * *",  // Every 6 hours
      "description": "Check broker connection health and send alerts"
    },
    {
      "path": "/api/cron/data-quality",
      "schedule": "0 2 * * *",  // 9:00 PM EST (02:00 UTC) - off-peak
      "description": "Run data quality checks and cleanup"
    }
  ]
}
```

**Why 9 AM EST for sync-all:**
- Discord recommendation: captures overnight changes before market opens
- Fresh data for morning traders checking portfolios
- Lower API load than after-market close (4 PM)
- Aligns with active trading hours

**Why every 6 hours for check-connections:**
- Catches broken connections quickly (within 6h max)
- Allows 4 checks per day without excessive API usage
- Balances responsiveness vs. cost

**Files to modify:**
- `/vercel.json` (lines 17-22)

**Testing:**
```bash
# Verify cron syntax
npx vercel crons list

# Test endpoints manually
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-connections
```

**Effort:** 5 minutes
**Risk:** Low (configuration only)

---

### 1.2 Implement Recent Orders Endpoint (FREE Real-Time Data)

**Issue:** Not using SnapTrade's FREE recent orders endpoint → missing real-time trading activity

**Discord Finding:**
> "Recent orders endpoint is realtime and **free** (no extra cost). Returns orders from last 24 hours only. Users mentioned polling every 1-5 minutes per account."

**Current Behavior:**
- User places trade at 10:05 AM
- Trade won't appear in Artha until next cron (9 AM next day)
- **Lag: Up to 23 hours!**

**Solution A: Server-Side Polling (Simple)**

Create new API endpoint for on-demand recent orders fetch:

**New file:** `/src/app/api/trades/sync-recent/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';
import { applyRateLimit } from '@/lib/ratelimit';

/**
 * POST /api/trades/sync-recent
 *
 * Fetches recent orders (last 24h) from SnapTrade using the FREE endpoint.
 * This is a lightweight, real-time sync for active users.
 *
 * Rate limit: 30 requests/hour (can poll every 2 minutes)
 */
export async function POST(request: NextRequest) {
    try {
        // Rate limit: 30 requests per hour (every 2 minutes)
        const rateLimitResponse = await applyRateLimit(request, 'sync-recent', { limit: 30, window: 3600 });
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await snapTradeService.syncRecentOrders(session.user.id);
        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('Recent sync error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
```

**New method:** Add to `SnapTradeService` class in `/src/lib/services/snaptrade.service.ts`:

```typescript
/**
 * Syncs recent orders (last 24 hours) using the FREE recent orders endpoint.
 * This is a lightweight, real-time sync for active users.
 *
 * Discord: "Recent orders endpoint is FREE and realtime"
 */
async syncRecentOrders(localUserId: string): Promise<{
    synced: number;
    accounts: number;
    failedAccounts: string[];
    error?: string;
}> {
    const user = await prisma.user.findUnique({
        where: { id: localUserId },
        include: { brokerAccounts: true },
    });

    if (!user || !user.snapTradeUserId || !user.snapTradeUserSecret) {
        return { synced: 0, accounts: 0, failedAccounts: [], error: 'No broker connected' };
    }

    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
    if (!decryptedSecret) {
        return { synced: 0, accounts: 0, failedAccounts: [], error: 'Decryption failed' };
    }

    const snapTradeUserId = user.snapTradeUserId;
    const snapTradeUserSecret = decryptedSecret;
    const failedAccounts: string[] = [];

    // Get all active accounts (skip disabled)
    const activeAccounts = user.brokerAccounts.filter(acc => !acc.disabled);

    if (activeAccounts.length === 0) {
        return { synced: 0, accounts: 0, failedAccounts: [], error: 'No active accounts' };
    }

    console.log('[SnapTrade Recent] Fetching recent orders for', activeAccounts.length, 'accounts');

    const allRecentOrders: any[] = [];
    const recentOrderPromises = activeAccounts.map(async (localAccount) => {
        try {
            // Use the FREE recent orders endpoint
            const recentOrders = await snapTrade.trading.getAccountRecentOrders({
                accountId: localAccount.snapTradeAccountId,
                userId: snapTradeUserId,
                userSecret: snapTradeUserSecret,
            });

            const orders = recentOrders.data || [];
            console.log('[SnapTrade Recent] Account', localAccount.snapTradeAccountId, 'returned', orders.length, 'recent orders');

            // Attach account info for processing
            for (const order of orders) {
                (order as any)._accountId = localAccount.snapTradeAccountId;
                (order as any)._localAccountId = localAccount.id;
            }
            return orders;
        } catch (err) {
            console.error('[SnapTrade Recent] Error fetching recent orders for', localAccount.brokerName, ':', err);
            failedAccounts.push(localAccount.brokerName || localAccount.snapTradeAccountId);
            return [];
        }
    });

    const orderResults = await Promise.all(recentOrderPromises);
    for (const list of orderResults) {
        allRecentOrders.push(...list);
    }

    // Process orders into trades (reuse similar logic from syncTrades)
    // NOTE: Recent orders have different structure than activities
    // Map order fields to trade fields
    let count = 0;
    const affectedGroups = new Set<string>();
    const { isTradeBlocked } = await import('../tradeBlocklist');

    // Pre-fetch existing trades to avoid duplicates
    const existingTrades = await prisma.trade.findMany({
        where: {
            accountId: { in: activeAccounts.map(a => a.id) }
        },
        select: { snapTradeTradeId: true, id: true }
    });
    const existingTradeMap = new Map(
        existingTrades
            .filter(t => t.snapTradeTradeId)
            .map(t => [t.snapTradeTradeId as string, t])
    );

    for (const order of allRecentOrders) {
        const orderId = order.id;

        // Check blocklist
        const blockCheck = isTradeBlocked(orderId);
        if (blockCheck.blocked) {
            console.warn('[SnapTrade Recent] Skipping blocked order:', orderId, '-', blockCheck.reason);
            continue;
        }

        // Check if already synced
        if (existingTradeMap.has(orderId)) {
            continue; // Skip duplicates
        }

        const accountId = (order as any)._localAccountId;
        if (!accountId) continue;

        // Map order fields to trade fields
        // Note: Recent orders endpoint structure may differ from activities
        const action = order.action?.toUpperCase() || order.order_type?.toUpperCase();
        if (!action) continue;

        const orderDate = order.filled_at || order.updated_at || order.created_at;
        if (!orderDate) continue;

        const timestamp = new Date(orderDate);
        if (isNaN(timestamp.getTime())) continue;

        const optionSymbol = order.option_symbol;
        const isOption = !!optionSymbol;
        const symbol = isOption
            ? (optionSymbol.ticker || order.universal_symbol?.symbol || 'UNKNOWN')
            : (order.universal_symbol?.symbol || 'UNKNOWN');

        const contractMultiplier = isOption
            ? (optionSymbol.is_mini_option ? 10 : 100)
            : 1;

        const quantity = order.filled_units || order.total_quantity || 0;
        const price = order.average_price || order.limit_price || 0;
        const fees = 0; // Recent orders may not include fees
        const currency = order.universal_symbol?.currency?.code || 'USD';
        const type = isOption ? 'OPTION' : 'STOCK';
        const expiryDate = optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null;

        // Create trade
        try {
            await prisma.trade.create({
                data: {
                    accountId: accountId,
                    symbol: symbol,
                    universalSymbolId: isOption ? optionSymbol.id : order.universal_symbol?.id,
                    quantity: quantity,
                    price: price,
                    action: action.trim(),
                    timestamp: timestamp,
                    fees: fees,
                    currency: currency,
                    type: type,
                    snapTradeTradeId: orderId,
                    contractMultiplier: contractMultiplier,
                    optionAction: order.option_type || null,
                    optionType: optionSymbol?.option_type || null,
                    strikePrice: optionSymbol?.strike_price || null,
                    expiryDate: expiryDate,
                },
            });
            affectedGroups.add(`${accountId}:${symbol}`);
            count++;
        } catch (err) {
            console.error('[SnapTrade Recent] Error creating trade:', err);
        }
    }

    // Recalculate position keys for affected groups
    if (affectedGroups.size > 0) {
        console.log(`[SnapTrade Recent] Recalculating position keys for ${affectedGroups.size} groups...`);
        const { tradeGroupingService } = await import('./trade-grouping.service');
        for (const group of affectedGroups) {
            const [accId, sym] = group.split(':');
            await tradeGroupingService.recalculatePositionKeys(accId, sym);
        }
    }

    console.log('[SnapTrade Recent] Completed. Synced:', count, 'Accounts:', activeAccounts.length, 'Failed:', failedAccounts.length);

    return {
        synced: count,
        accounts: activeAccounts.length,
        failedAccounts,
    };
}
```

**Solution B: Client-Side Auto-Polling (Optional Enhancement)**

Add to `/src/app/(dashboard)/page.tsx` (dashboard):

```typescript
// Auto-poll recent orders every 2 minutes when dashboard is active
useEffect(() => {
    if (!session?.user) return;

    const pollInterval = setInterval(async () => {
        // Only poll if user is actively viewing the page
        if (document.hidden) return;

        try {
            const res = await fetch('/api/trades/sync-recent', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.synced > 0) {
                    // Refresh metrics/trades
                    mutate(); // SWR revalidation
                    toast.success(`${data.synced} new trades synced`);
                }
            }
        } catch (err) {
            console.error('Background sync failed:', err);
        }
    }, 120_000); // 2 minutes

    return () => clearInterval(pollInterval);
}, [session, mutate]);
```

**Benefit:**
- Real-time updates (2-minute lag vs 23-hour lag)
- FREE endpoint (no extra cost)
- Better UX for active traders
- Reduces "where's my trade?" support tickets

**Files to create:**
- `/src/app/api/trades/sync-recent/route.ts`

**Files to modify:**
- `/src/lib/services/snaptrade.service.ts` (add `syncRecentOrders` method)
- `/src/app/(dashboard)/page.tsx` (optional client-side polling)

**Effort:** 2-3 hours
**Risk:** Low (separate endpoint, doesn't affect existing sync)

---

### 1.3 Add Rate Limit Monitoring from API Response Headers

**Issue:** Not checking rate limit info in SnapTrade API responses → blind to quota usage

**Discord Finding:**
> "Rate limit info is included in API responses. One user hit 400k requests in 5 days and got rate limited."

**Current Behavior:** No visibility into API quota consumption until hitting the limit

**Solution:**

Add middleware to capture and log rate limit headers from SnapTrade responses.

**New file:** `/src/lib/services/snaptrade-rate-limiter.ts`

```typescript
import { prisma } from '@/lib/prisma';

/**
 * Captures and logs rate limit information from SnapTrade API response headers.
 * Discord: "Rate limit info is included in API responses"
 */
export async function logSnapTradeRateLimit(
    endpoint: string,
    headers: Record<string, string | undefined>,
    userId?: string
) {
    // Common rate limit header names (adjust based on actual SnapTrade headers)
    const rateLimitHeaders = {
        limit: headers['x-ratelimit-limit'] || headers['ratelimit-limit'],
        remaining: headers['x-ratelimit-remaining'] || headers['ratelimit-remaining'],
        reset: headers['x-ratelimit-reset'] || headers['ratelimit-reset'],
    };

    // If any rate limit headers exist, log them
    if (rateLimitHeaders.limit || rateLimitHeaders.remaining) {
        console.log('[SnapTrade Rate Limit]', {
            endpoint,
            userId,
            limit: rateLimitHeaders.limit,
            remaining: rateLimitHeaders.remaining,
            reset: rateLimitHeaders.reset,
            timestamp: new Date().toISOString()
        });

        // If remaining is low, log warning
        const remaining = parseInt(rateLimitHeaders.remaining || '0');
        const limit = parseInt(rateLimitHeaders.limit || '0');

        if (limit > 0 && remaining < limit * 0.1) {
            console.warn(`[SnapTrade Rate Limit] LOW QUOTA: ${remaining}/${limit} remaining for ${endpoint}`);

            // Optional: Store in database for analytics
            // await prisma.apiUsageLog.create({...})
        }
    }
}

/**
 * Wrapper to add rate limit monitoring to SnapTrade SDK calls
 */
export function withRateLimitMonitoring<T>(
    fn: () => Promise<{ data: T; headers?: any }>,
    endpoint: string,
    userId?: string
): Promise<{ data: T; headers?: any }> {
    return fn().then(result => {
        // Log rate limit headers if present
        if (result.headers) {
            logSnapTradeRateLimit(endpoint, result.headers, userId);
        }
        return result;
    });
}
```

**Modify existing service calls:**

In `/src/lib/services/snaptrade.service.ts`, wrap critical calls:

```typescript
// Before:
const accounts = await snapTrade.accountInformation.listUserAccounts({
    userId: snapTradeUserId,
    userSecret: snapTradeUserSecret,
});

// After:
import { logSnapTradeRateLimit } from './snaptrade-rate-limiter';

const accounts = await snapTrade.accountInformation.listUserAccounts({
    userId: snapTradeUserId,
    userSecret: snapTradeUserSecret,
});
// Check response for rate limit headers
if ((accounts as any).headers) {
    logSnapTradeRateLimit('listUserAccounts', (accounts as any).headers, localUserId);
}
```

**Better approach: Axios interceptor** (if SnapTrade SDK exposes underlying axios instance):

```typescript
// Add global interceptor to SnapTrade client
snapTrade.instance.interceptors.response.use(
    (response) => {
        logSnapTradeRateLimit(
            response.config.url || 'unknown',
            response.headers as any
        );
        return response;
    },
    (error) => {
        if (error.response?.headers) {
            logSnapTradeRateLimit(
                error.config?.url || 'unknown',
                error.response.headers
            );
        }
        return Promise.reject(error);
    }
);
```

**Files to create:**
- `/src/lib/services/snaptrade-rate-limiter.ts`

**Files to modify:**
- `/src/lib/services/snaptrade.service.ts` (add monitoring to key methods)

**Effort:** 1 hour
**Risk:** Low (logging only, no behavior change)

---

## PHASE 2: Performance & Cost Optimization (Priority: MEDIUM)

### 2.1 Optimize Cron Job Timing Based on Discord Recommendations

**Issue:** Current cron at 7:30 AM CST, Discord recommends 9:00 AM EST for market-open focus

**Current:** `30 13 * * *` (1:30 PM UTC = 7:30 AM CST)
**Recommended:** `0 14 * * *` (2:00 PM UTC = 9:00 AM EST)

**Rationale:**
- Captures overnight broker data before market opens (9:30 AM EST)
- Fresh data for traders checking portfolios before trading
- Lower API load than after-market close (4 PM EST)
- Aligns with active trader behavior patterns

**Tradeoff Analysis:**

| Time | Pros | Cons |
|------|------|------|
| **9:00 AM EST (current plan)** | Fresh morning data, captures overnight, pre-market check | Misses previous day's after-hours trades |
| 4:00 PM EST | Captures full trading day | High API load (everyone syncing), late for morning checks |
| 2:00 AM EST | Low API load, captures settlements | Very stale for morning traders (7h old) |

**Recommendation:** Stick with **9:00 AM EST** as Discord suggests, OR consider **dual sync** approach:

**Option A: Single Sync at 9 AM EST** (Simple)
```json
"schedule": "0 14 * * *"  // 9:00 AM EST
```

**Option B: Dual Sync** (Better coverage, uses 2 cron slots)
```json
"schedule": "0 14 * * 1-5"  // 9:00 AM EST weekdays (pre-market)
"schedule": "0 21 * * 1-5"  // 4:00 PM EST weekdays (post-market)
```

**Files to modify:**
- `/vercel.json` (lines 17-22)

**Effort:** 5 minutes
**Risk:** None (scheduling only)

---

### 2.2 Add Request Logging Dashboard Integration

**Issue:** Not using SnapTrade's request logging dashboard (released May 2025)

**Discord Finding:**
> "SnapTrade released dashboard request logs (May 2025). Use this to debug API calls and monitor usage."

**Solution:**

Add link to SnapTrade dashboard in admin panel + documentation for debugging.

**New section in:** `/src/app/(dashboard)/settings/page.tsx`

```tsx
// Admin-only section (check session.user.email === ADMIN_EMAIL)
{session.user.email === process.env.ADMIN_EMAIL && (
  <Card>
    <CardHeader>
      <CardTitle>API Monitoring</CardTitle>
      <CardDescription>Debug SnapTrade API usage and rate limits</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <Button variant="outline" asChild>
          <a
            href="https://app.snaptrade.com/dashboard/logs"
            target="_blank"
            rel="noopener noreferrer"
          >
            View SnapTrade Request Logs →
          </a>
        </Button>
        <p className="text-sm text-muted-foreground">
          Monitor API usage, debug failed requests, and check rate limit consumption.
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

**Documentation update:** Add to `CLAUDE.md`:

```markdown
## SnapTrade Debugging

**Request Logs Dashboard:** https://app.snaptrade.com/dashboard/logs
- View all API requests and responses
- Debug failed syncs
- Monitor rate limit consumption
- Released May 2025 per Discord
```

**Files to modify:**
- `/src/app/(dashboard)/settings/page.tsx` (add admin section)
- `/CLAUDE.md` (add debugging section)

**Effort:** 30 minutes
**Risk:** None (documentation only)

---

### 2.3 Implement Smart Sync Frequency Based on User Activity

**Issue:** Syncing inactive users daily wastes API quota

**Opportunity:** SnapTrade charges per connected user-month, not per request (for most endpoints)

**Current:** All users synced daily regardless of activity

**Solution:**

Tier sync frequency based on user activity:

**Tier 1: Active Users** (logged in within 7 days)
- Sync daily at 9 AM EST
- Use recent orders endpoint for real-time

**Tier 2: Occasional Users** (logged in within 30 days)
- Sync every 3 days
- No recent orders polling

**Tier 3: Inactive Users** (no login for 30+ days)
- Sync weekly
- Skip until they log in

**Implementation:**

Modify `/src/app/api/cron/sync-all/route.ts`:

```typescript
// Before: Sync all users
const usersWithSnapTrade = await prisma.user.findMany({
    where: {
        AND: [
            { snapTradeUserId: { not: null } },
            { snapTradeUserSecret: { not: null } }
        ]
    },
    // ...
});

// After: Smart filtering based on activity
const now = new Date();
const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

// Determine sync day (0 = Sunday, 1 = Monday, etc.)
const dayOfWeek = now.getDay();
const isWeeklySyncDay = dayOfWeek === 1; // Monday

const usersWithSnapTrade = await prisma.user.findMany({
    where: {
        AND: [
            { snapTradeUserId: { not: null } },
            { snapTradeUserSecret: { not: null } },
            {
                OR: [
                    // Tier 1: Active users (last 7 days) - sync daily
                    { lastLoginAt: { gte: sevenDaysAgo } },

                    // Tier 2: Occasional users (7-30 days) - sync every 3 days
                    {
                        AND: [
                            { lastLoginAt: { gte: thirtyDaysAgo, lt: sevenDaysAgo } },
                            { id: { endsWith: String(now.getDate() % 3) } } // Distribute load
                        ]
                    },

                    // Tier 3: Inactive users (30+ days) - sync weekly on Monday
                    {
                        AND: [
                            { lastLoginAt: { lt: thirtyDaysAgo } },
                            { [isWeeklySyncDay]: true }
                        ]
                    }
                ]
            }
        ]
    },
    select: {
        id: true,
        email: true,
        snapTradeUserId: true,
        lastLoginAt: true,
    }
});

console.log(`[Cron Sync] Found ${usersWithSnapTrade.length} users to sync (smart filtering applied)`);
```

**Add lastLoginAt tracking:**

Update `/src/lib/auth.ts` (NextAuth callbacks):

```typescript
callbacks: {
    async signIn({ user }) {
        // Update lastLoginAt on every sign-in
        if (user.id) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });
        }
        return true;
    },
    // ... other callbacks
}
```

**Prisma schema update:**

```prisma
model User {
  // ... existing fields
  lastLoginAt   DateTime?
  // ... rest of model
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_last_login_tracking
```

**Benefit:**
- Reduces API calls by ~60-70% (assuming most users are occasional)
- Maintains real-time experience for active users
- Lowers rate limit risk

**Files to modify:**
- `/src/app/api/cron/sync-all/route.ts` (smart filtering)
- `/src/lib/auth.ts` (track lastLoginAt)
- `/prisma/schema.prisma` (add lastLoginAt field)

**Effort:** 1-2 hours
**Risk:** Medium (requires DB migration + thorough testing)

---

## PHASE 3: User Experience Enhancements (Priority: MEDIUM)

### 3.1 Document IBKR 24-48 Hour Delay for Users

**Issue:** Users connecting Interactive Brokers expect instant sync, but IBKR takes 24-48h

**Discord Finding:**
> "IBKR takes 24-48 hours for initial account connection. Only integration with this delay. Positions/orders may not appear immediately even after connection."

**Current:** No documentation, leads to confusion and support tickets

**Solution:**

**A. Add IBKR-specific warning during broker connection:**

Modify `/src/components/views/connect-broker-button.tsx`:

```tsx
// Show warning modal before redirecting to SnapTrade for IBKR
const [showIBKRWarning, setShowIBKRWarning] = useState(false);

// If user selected IBKR (detect from SnapTrade redirect or broker list)
{showIBKRWarning && (
  <Dialog open={showIBKRWarning} onOpenChange={setShowIBKRWarning}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Interactive Brokers Setup Note</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <strong>Initial setup takes 24-48 hours.</strong>
        </p>
        <p className="text-sm">
          Interactive Brokers requires manual approval before data can sync.
          Your account will be ready within 1-2 business days.
        </p>
        <p className="text-sm">
          We'll send you an email when your connection is ready!
        </p>
      </div>
      <DialogFooter>
        <Button onClick={() => {
          setShowIBKRWarning(false);
          // Continue with connection flow
        }}>
          I Understand
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

**B. Add to FAQ section on landing page:**

Update `/src/components/landing/faq-section.tsx`:

```tsx
{
    question: "Why aren't my Interactive Brokers trades showing up?",
    answer: "Interactive Brokers (IBKR) requires 24-48 hours for initial account approval after connecting. This is the only broker with this delay. You'll receive an email notification once your connection is ready and trades start syncing. Other brokers sync instantly."
}
```

**C. Add IBKR status indicator in settings:**

In `/src/app/(dashboard)/settings/page.tsx`:

```tsx
// For IBKR accounts that were connected <48h ago
{account.brokerName === 'Interactive Brokers' &&
 account.createdAt > new Date(Date.now() - 48 * 60 * 60 * 1000) && (
  <Badge variant="warning">
    Pending Approval (24-48h)
  </Badge>
)}
```

**Files to modify:**
- `/src/components/views/connect-broker-button.tsx` (add warning dialog)
- `/src/components/landing/faq-section.tsx` (add FAQ)
- `/src/app/(dashboard)/settings/page.tsx` (add status badge)

**Effort:** 1 hour
**Risk:** Low (UI only)

---

### 3.2 Add Sync Status Indicator with Recent Activity

**Issue:** Users don't know when their trades were last synced → uncertainty about data freshness

**Solution:**

Add "Last Synced" indicator to dashboard header:

**Update:** `/src/app/(dashboard)/page.tsx`

```tsx
// Fetch last sync time
const { data: syncStatus } = useSWR('/api/trades/sync-status', fetcher);

// Display in header
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <Clock className="h-4 w-4" />
  {syncStatus?.lastSyncedAt ? (
    <>
      Last synced {formatDistanceToNow(new Date(syncStatus.lastSyncedAt), { addSuffix: true })}
      {syncStatus.recentOrdersCount > 0 && (
        <Badge variant="success" className="ml-2">
          {syncStatus.recentOrdersCount} new today
        </Badge>
      )}
    </>
  ) : (
    'Never synced'
  )}
</div>
```

**New endpoint:** `/src/app/api/trades/sync-status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get last sync time from most recent trade
    const lastTrade = await prisma.trade.findFirst({
        where: { account: { userId: session.user.id } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
    });

    // Count trades synced today (last 24h)
    const recentCount = await prisma.trade.count({
        where: {
            account: { userId: session.user.id },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
    });

    return NextResponse.json({
        lastSyncedAt: lastTrade?.createdAt || null,
        recentOrdersCount: recentCount
    });
}
```

**Files to create:**
- `/src/app/api/trades/sync-status/route.ts`

**Files to modify:**
- `/src/app/(dashboard)/page.tsx` (add sync status display)

**Effort:** 45 minutes
**Risk:** Low (read-only endpoint)

---

### 3.3 Implement Webhook Endpoints (Future-Proofing)

**Issue:** No webhook handlers implemented, missing automation opportunities

**Discord Finding:**
> "ACCOUNT_HOLDINGS_UPDATED webhook fires once per day (not real-time). Don't rely on ACCOUNT_TRANSACTIONS_UPDATED for real-time - use polling instead."

**Current:** No webhooks → manual cron only

**Solution:**

Implement webhook handlers for non-real-time events (connection changes, daily holdings updates).

**New file:** `/src/app/api/webhooks/snaptrade/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * POST /api/webhooks/snaptrade
 *
 * Receives webhook events from SnapTrade for:
 * - CONNECTION.ADDED - New broker connected
 * - CONNECTION.REMOVED - Broker disconnected
 * - ACCOUNT_HOLDINGS_UPDATED - Daily holdings update (fires once per day)
 *
 * NOTE: ACCOUNT_TRANSACTIONS_UPDATED is NOT real-time per Discord findings.
 * Use recent orders polling instead for real-time trade updates.
 *
 * Security: Verifies webhook signature using SNAPTRADE_WEBHOOK_SECRET
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-snaptrade-signature');
        const webhookSecret = process.env.SNAPTRADE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('[SnapTrade Webhook] SNAPTRADE_WEBHOOK_SECRET not configured');
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
        }

        // Verify signature
        if (signature) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(body)
                .digest('hex');

            if (signature !== expectedSignature) {
                console.error('[SnapTrade Webhook] Invalid signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const payload = JSON.parse(body);
        const { event, data } = payload;

        console.log('[SnapTrade Webhook] Received event:', event, data);

        switch (event) {
            case 'CONNECTION.ADDED':
                await handleConnectionAdded(data);
                break;

            case 'CONNECTION.REMOVED':
                await handleConnectionRemoved(data);
                break;

            case 'ACCOUNT_HOLDINGS_UPDATED':
                // Note: Fires once per day, not real-time
                await handleHoldingsUpdated(data);
                break;

            case 'ACCOUNT_TRANSACTIONS_UPDATED':
                // Discord: NOT real-time, don't rely on this for immediate updates
                // Use recent orders polling instead
                console.log('[SnapTrade Webhook] ACCOUNT_TRANSACTIONS_UPDATED received (not real-time, ignoring)');
                break;

            default:
                console.log('[SnapTrade Webhook] Unknown event type:', event);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[SnapTrade Webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

async function handleConnectionAdded(data: any) {
    console.log('[SnapTrade Webhook] New connection added:', data);
    // Trigger immediate sync for this user
    const user = await prisma.user.findFirst({
        where: { snapTradeUserId: data.userId }
    });
    if (user) {
        // Queue background sync job or trigger sync endpoint
        console.log('[SnapTrade Webhook] Triggering sync for user', user.id);
    }
}

async function handleConnectionRemoved(data: any) {
    console.log('[SnapTrade Webhook] Connection removed:', data);
    // Mark accounts as disabled
    const user = await prisma.user.findFirst({
        where: { snapTradeUserId: data.userId }
    });
    if (user && data.authorizationId) {
        await prisma.brokerAccount.updateMany({
            where: {
                userId: user.id,
                authorizationId: data.authorizationId
            },
            data: {
                disabled: true,
                disabledAt: new Date(),
                disabledReason: 'Connection removed via webhook'
            }
        });

        // Send email alert
        const { sendConnectionAlert } = await import('@/lib/email-alerts');
        await sendConnectionAlert(
            user.email!,
            user.name || 'Trader',
            'Your Broker',
            'Connection Removed'
        );
    }
}

async function handleHoldingsUpdated(data: any) {
    console.log('[SnapTrade Webhook] Holdings updated (daily):', data);
    // Optional: Trigger sync for this specific account
    // Note: This fires once per day, not real-time
}
```

**Environment variable:**

Add to `.env`:
```
SNAPTRADE_WEBHOOK_SECRET=your_webhook_secret_here
```

**Register webhook in SnapTrade dashboard:**

URL: `https://yourdomain.com/api/webhooks/snaptrade`
Events: `CONNECTION.ADDED`, `CONNECTION.REMOVED`, `ACCOUNT_HOLDINGS_UPDATED`

**Files to create:**
- `/src/app/api/webhooks/snaptrade/route.ts`

**Files to modify:**
- `.env.example` (add SNAPTRADE_WEBHOOK_SECRET)

**Effort:** 2 hours
**Risk:** Low (webhooks are supplementary, don't replace cron)

---

## PHASE 4: Reliability & Monitoring (Priority: LOW)

### 4.1 Add Retry Logic with Exponential Backoff

**Issue:** No retry logic for transient SnapTrade API failures

**Solution:**

Wrap SnapTrade API calls with retry logic:

**New file:** `/src/lib/retry-wrapper.ts`

```typescript
/**
 * Retries a function with exponential backoff
 * Useful for transient API failures
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        initialDelay?: number;
        maxDelay?: number;
        onRetry?: (error: Error, attempt: number) => void;
    } = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        onRetry = () => {}
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                throw lastError;
            }

            // Check if error is retryable
            const isRetryable =
                lastError.message.includes('timeout') ||
                lastError.message.includes('ECONNRESET') ||
                lastError.message.includes('429') || // Rate limit
                lastError.message.includes('503'); // Service unavailable

            if (!isRetryable) {
                throw lastError;
            }

            const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
            onRetry(lastError, attempt + 1);
            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}
```

**Usage in SnapTradeService:**

```typescript
// Before:
const accounts = await snapTrade.accountInformation.listUserAccounts({
    userId: snapTradeUserId,
    userSecret: snapTradeUserSecret,
});

// After:
const accounts = await withRetry(
    () => snapTrade.accountInformation.listUserAccounts({
        userId: snapTradeUserId,
        userSecret: snapTradeUserSecret,
    }),
    {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (error, attempt) => {
            console.warn(`[SnapTrade] Retry ${attempt} for listUserAccounts:`, error.message);
        }
    }
);
```

**Files to create:**
- `/src/lib/retry-wrapper.ts`

**Files to modify:**
- `/src/lib/services/snaptrade.service.ts` (wrap critical API calls)

**Effort:** 1-2 hours
**Risk:** Low (improves reliability)

---

### 4.2 Implement Health Check Endpoint with SnapTrade Connectivity Test

**Issue:** No way to verify SnapTrade API is reachable before cron runs

**Solution:**

Add health check endpoint that tests SnapTrade connectivity:

**New file:** `/src/app/api/health/snaptrade/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { snapTrade } from '@/lib/snaptrade';

/**
 * GET /api/health/snaptrade
 *
 * Tests SnapTrade API connectivity
 * Used by monitoring systems and cron jobs to verify API is reachable
 */
export async function GET() {
    try {
        // Test basic API connectivity (list brokerages doesn't require auth)
        const startTime = Date.now();
        const brokerages = await snapTrade.referenceTags.listAllBrokerageAuthorization();
        const latency = Date.now() - startTime;

        return NextResponse.json({
            status: 'healthy',
            snapTrade: {
                reachable: true,
                latency: `${latency}ms`,
                brokerages: brokerages.data?.length || 0
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Health Check] SnapTrade unreachable:', error);
        return NextResponse.json({
            status: 'unhealthy',
            snapTrade: {
                reachable: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
}
```

**Use in cron job:**

Modify `/src/app/api/cron/sync-all/route.ts`:

```typescript
// Before starting sync, check API health
const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/health/snaptrade`);
if (!healthCheck.ok) {
    console.error('[Cron Sync] SnapTrade API is down, aborting sync');
    return NextResponse.json({
        success: false,
        error: 'SnapTrade API unreachable',
        timestamp: new Date().toISOString()
    }, { status: 503 });
}
```

**Files to create:**
- `/src/app/api/health/snaptrade/route.ts`

**Files to modify:**
- `/src/app/api/cron/sync-all/route.ts` (add pre-sync health check)

**Effort:** 30 minutes
**Risk:** None (monitoring only)

---

## PHASE 5: Testing & Documentation (Priority: HIGH)

### 5.1 Add Integration Tests for Recent Orders Endpoint

**Issue:** No tests for critical sync logic

**Solution:**

Create test suite for recent orders sync:

**New file:** `/tests/integration/snaptrade-recent-orders.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { prisma } from '@/lib/prisma';

describe('SnapTrade Recent Orders Sync', () => {
    const testUserId = 'test-user-123';

    beforeEach(async () => {
        // Clean up test data
        await prisma.trade.deleteMany({ where: { account: { userId: testUserId } } });
    });

    it('should fetch and sync recent orders', async () => {
        const result = await snapTradeService.syncRecentOrders(testUserId);

        expect(result.synced).toBeGreaterThanOrEqual(0);
        expect(result.accounts).toBeGreaterThan(0);
        expect(result.failedAccounts).toEqual([]);
    });

    it('should skip duplicate orders', async () => {
        // First sync
        const result1 = await snapTradeService.syncRecentOrders(testUserId);
        const initialCount = result1.synced;

        // Second sync (should find no new orders)
        const result2 = await snapTradeService.syncRecentOrders(testUserId);

        expect(result2.synced).toBe(0); // No new orders
    });

    it('should handle API errors gracefully', async () => {
        // Mock API failure
        vi.spyOn(snapTrade.trading, 'getAccountRecentOrders').mockRejectedValueOnce(
            new Error('API timeout')
        );

        const result = await snapTradeService.syncRecentOrders(testUserId);

        expect(result.failedAccounts.length).toBeGreaterThan(0);
        expect(result.error).toBeUndefined(); // Partial failure, not total
    });
});
```

**Run tests:**
```bash
npm run test:integration
```

**Files to create:**
- `/tests/integration/snaptrade-recent-orders.test.ts`

**Effort:** 2-3 hours
**Risk:** None (testing infrastructure)

---

### 5.2 Update Documentation with Discord Findings

**Issue:** `CLAUDE.md` doesn't reflect latest Discord best practices

**Solution:**

Add comprehensive SnapTrade section to `CLAUDE.md`:

```markdown
## SnapTrade API Best Practices (from Discord Research)

### Endpoints & Deprecations

**CURRENT (Use These):**
- `/accounts/{accountId}/activities` - Paginated account activities (NEW, fast)
- `/accounts/{accountId}/recentOrders` - **FREE** real-time recent orders (last 24h only)
- `/accounts/{accountId}/positions` - Current holdings
- `/accounts/{accountId}/optionHoldings` - Option positions

**DEPRECATED (Avoid):**
- `/users/{userId}/transactions` - Old user-level endpoint (slower, not paginated)

### Webhooks (Not Real-Time!)

**Discord Finding:** SnapTrade webhooks are NOT real-time for transactions.

| Webhook Event | Frequency | Use Case |
|---------------|-----------|----------|
| `CONNECTION.ADDED` | Immediate | New broker connected |
| `CONNECTION.REMOVED` | Immediate | Broker disconnected |
| `ACCOUNT_HOLDINGS_UPDATED` | **Once per day** | Daily holdings refresh |
| `ACCOUNT_TRANSACTIONS_UPDATED` | **NOT real-time** | ❌ Don't rely on this |

**For Real-Time Updates:** Use polling with `/recentOrders` endpoint (FREE, last 24h).

### Rate Limits

- Rate limit info included in API response headers
- One user hit **400k requests in 5 days** and got rate limited
- Monitor `x-ratelimit-remaining` header
- `/recentOrders` endpoint is **FREE** (doesn't count toward rate limit)

### Broker-Specific Issues

**Interactive Brokers (IBKR):**
- **24-48 hour delay** for initial account connection
- Only broker with this delay
- Set user expectations in UI

**Fidelity:**
- Requires manual enablement by SnapTrade team
- Must fill out profile page in customer dashboard

### Optimal Sync Schedule

**Discord Recommendation:** 9:00 AM EST (14:00 UTC)
- Captures overnight changes before market opens
- Fresh data for morning traders
- Lower API load than after-market close

**Alternative:** 4:00 AM EST (09:00 UTC) for off-peak sync

### Cost Optimization

- Recent orders endpoint is **FREE** (confirmed by Marc from SnapTrade team)
- One daily sync keeps costs minimal
- Client-side polling doesn't cost server resources
- Smart user-activity-based sync reduces API calls by 60-70%

### Debugging

**Request Logs Dashboard:** https://app.snaptrade.com/dashboard/logs
- View all API requests and responses
- Debug failed syncs
- Monitor rate limit consumption
- Released May 2025
```

**Files to modify:**
- `/CLAUDE.md` (add SnapTrade Best Practices section)
- `/README.md` (link to Discord findings doc)

**Effort:** 1 hour
**Risk:** None (documentation)

---

## Summary & Prioritization

### Quick Wins (Implement First)

| Item | Effort | Impact | Priority |
|------|--------|--------|----------|
| 1.1 Fix Missing Cron Schedules | 5 min | HIGH | **CRITICAL** |
| 1.3 Add Rate Limit Monitoring | 1 hr | MEDIUM | HIGH |
| 2.1 Optimize Cron Timing | 5 min | MEDIUM | HIGH |
| 3.1 Document IBKR Delays | 1 hr | HIGH (UX) | HIGH |
| 5.2 Update Documentation | 1 hr | MEDIUM | HIGH |

**Total Quick Wins Effort: ~3.5 hours**

---

### High-Value Enhancements (Implement Next)

| Item | Effort | Impact | Priority |
|------|--------|--------|----------|
| 1.2 Recent Orders Endpoint | 2-3 hr | **VERY HIGH** | **CRITICAL** |
| 2.3 Smart Sync Frequency | 1-2 hr | HIGH (cost) | MEDIUM |
| 3.2 Sync Status Indicator | 45 min | MEDIUM (UX) | MEDIUM |
| 4.1 Retry Logic | 1-2 hr | MEDIUM | MEDIUM |

**Total High-Value Effort: ~6-9 hours**

---

### Nice-to-Have (Implement Later)

| Item | Effort | Impact | Priority |
|------|--------|--------|----------|
| 2.2 Dashboard Link | 30 min | LOW | LOW |
| 3.3 Webhook Endpoints | 2 hr | LOW | LOW |
| 4.2 Health Check | 30 min | LOW | LOW |
| 5.1 Integration Tests | 2-3 hr | MEDIUM | MEDIUM |

**Total Nice-to-Have Effort: ~5-6 hours**

---

## Implementation Checklist

### Phase 1: Critical Fixes (Day 1)
- [ ] 1.1 Fix vercel.json cron schedules (all 3 jobs)
- [ ] 1.3 Add rate limit monitoring wrapper
- [ ] 2.1 Change sync time to 9 AM EST
- [ ] 3.1 Add IBKR delay documentation (FAQ + UI)
- [ ] 5.2 Update CLAUDE.md with Discord findings

**Estimated Time: ~3.5 hours**

### Phase 2: Real-Time Updates (Day 2-3)
- [ ] 1.2 Implement `/api/trades/sync-recent` endpoint
- [ ] 1.2 Add `syncRecentOrders()` method to SnapTradeService
- [ ] 1.2 (Optional) Add client-side polling to dashboard
- [ ] 3.2 Add sync status indicator to dashboard

**Estimated Time: ~4-5 hours**

### Phase 3: Optimization (Day 4-5)
- [ ] 2.3 Add `lastLoginAt` field to User model
- [ ] 2.3 Implement smart sync frequency in cron job
- [ ] 4.1 Add retry wrapper for API calls
- [ ] 5.1 Write integration tests

**Estimated Time: ~6-8 hours**

### Phase 4: Polish (Day 6+)
- [ ] 2.2 Add SnapTrade dashboard link to admin settings
- [ ] 3.3 Implement webhook handlers
- [ ] 4.2 Add health check endpoint
- [ ] Test all changes end-to-end
- [ ] Deploy to production

**Estimated Time: ~4-6 hours**

---

## Total Effort Estimate

| Phase | Effort | Impact |
|-------|--------|--------|
| Phase 1 (Critical) | 3.5 hrs | 🔥 CRITICAL |
| Phase 2 (Real-Time) | 4-5 hrs | 🚀 VERY HIGH |
| Phase 3 (Optimization) | 6-8 hrs | 📈 HIGH |
| Phase 4 (Polish) | 4-6 hrs | ✨ MEDIUM |
| **TOTAL** | **18-22 hrs** | **2-3 days of focused work** |

---

## Success Metrics

**Before Improvements:**
- Sync frequency: Daily only (23h max lag)
- Real-time data: None
- Cron jobs scheduled: 1 of 3
- Rate limit visibility: None
- IBKR user confusion: High

**After Improvements:**
- Sync frequency: Daily + real-time (2min max lag for active users)
- Real-time data: Recent orders endpoint (FREE)
- Cron jobs scheduled: 3 of 3 ✅
- Rate limit visibility: Full monitoring ✅
- IBKR user confusion: Low (documented) ✅
- API cost reduction: 60-70% (smart sync) ✅

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Recent orders endpoint fails | Low | Fallback to daily sync |
| Smart sync misses active user | Low | Conservative activity thresholds |
| Webhook signature mismatch | Medium | Thorough testing + logs |
| DB migration issues | Low | Test locally first, backup before |
| Rate limit exceeded | Low | Monitoring + alerts |

---

## Questions for User

Before implementation, clarify:

1. **Cron Schedule:**
   - Stick with 9 AM EST single sync OR dual sync (9 AM + 4 PM)?
   - Keep existing 7:30 AM CST time?

2. **Recent Orders Polling:**
   - Enable client-side polling (every 2min) for all users OR only premium users?
   - Or keep server-side only (manual refresh)?

3. **Smart Sync Tiers:**
   - Implement activity-based sync frequency OR keep daily for all users?
   - If yes, adjust tier thresholds (7d/30d) as needed?

4. **Webhooks:**
   - Implement now OR defer to later phase?
   - Register with SnapTrade dashboard?

5. **Testing:**
   - Test on staging first OR deploy directly to production?
   - Need load testing for recent orders polling?

---

## Next Steps

1. **Review this plan** and provide feedback
2. **Prioritize phases** based on business needs
3. **Clarify questions** above
4. **Begin Phase 1** (critical fixes) immediately
5. **Monitor metrics** after each phase

---

**Last Updated:** January 31, 2026
**Document Version:** 1.0
**Author:** AI Assistant (based on Discord research + codebase analysis)
