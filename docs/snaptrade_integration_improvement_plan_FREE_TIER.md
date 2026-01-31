# SnapTrade Integration Improvement Plan (FREE TIER VERSION)

**Date:** January 31, 2026
**Constraint:** Vercel Free Tier - **1 CRON JOB MAXIMUM**
**Goal:** Maximize sync performance and real-time updates within free tier limits

---

## CRITICAL CONSTRAINT: Free Tier = 1 Cron Job Only

### Current State
- ✅ 1 cron scheduled: `/api/cron/sync-all` at 7:30 AM CST
- ❌ 2 orphaned cron endpoints (check-connections, data-quality) - exist but not scheduled

### Solution: Consolidate into Single Super-Cron

**Strategy:** Merge all cron tasks into ONE endpoint that runs everything sequentially.

**New consolidated cron job:**
```
/api/cron/daily-maintenance
├─ 1. Check broker connection health (from check-connections)
├─ 2. Sync all user trades (from sync-all)
├─ 3. Data quality checks (from data-quality)
└─ 4. Cleanup & reporting
```

**Schedule:** 9:00 AM EST (14:00 UTC) - Discord recommended time

---

## REVISED IMPLEMENTATION PLAN

### Phase 1: Consolidate Cron Jobs (CRITICAL - Day 1)

#### 1.1 Create Unified Cron Endpoint

**New file:** `/src/app/api/cron/daily-maintenance/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SnapTradeService } from "@/lib/services/snaptrade.service";
import { snapTrade } from '@/lib/snaptrade';
import { safeDecrypt } from '@/lib/encryption';

/**
 * GET /api/cron/daily-maintenance
 *
 * UNIFIED cron job for Vercel Free Tier (1 cron limit)
 * Runs all maintenance tasks sequentially:
 * 1. Connection health checks + email alerts
 * 2. Trade sync for all users
 * 3. Data quality checks
 *
 * Schedule: 9:00 AM EST daily (Discord recommended)
 * Protected by CRON_SECRET
 */
export async function GET(request: Request) {
    const startTime = Date.now();

    try {
        // Verify cron secret
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            console.error("[Daily Maintenance] Unauthorized");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[Daily Maintenance] Starting unified cron job...");

        const results = {
            timestamp: new Date().toISOString(),
            duration: "",
            tasks: {
                connectionHealthCheck: {} as any,
                tradeSync: {} as any,
                dataQuality: {} as any,
            },
            summary: {
                totalUsers: 0,
                healthyConnections: 0,
                brokenConnections: 0,
                emailsSent: 0,
                tradesSynced: 0,
                syncErrors: 0,
            }
        };

        // ============================================
        // TASK 1: CONNECTION HEALTH CHECKS
        // ============================================
        console.log("[Daily Maintenance] Task 1/3: Checking connection health...");
        try {
            const healthResult = await checkConnectionHealth();
            results.tasks.connectionHealthCheck = healthResult;
            results.summary.healthyConnections = healthResult.healthy;
            results.summary.brokenConnections = healthResult.broken;
            results.summary.emailsSent = healthResult.emailsSent;
        } catch (error) {
            console.error("[Daily Maintenance] Connection health check failed:", error);
            results.tasks.connectionHealthCheck = {
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }

        // ============================================
        // TASK 2: SYNC ALL USER TRADES
        // ============================================
        console.log("[Daily Maintenance] Task 2/3: Syncing trades for all users...");
        try {
            const syncResult = await syncAllUserTrades();
            results.tasks.tradeSync = syncResult;
            results.summary.totalUsers = syncResult.totalUsers;
            results.summary.tradesSynced = syncResult.totalTrades;
            results.summary.syncErrors = syncResult.failed;
        } catch (error) {
            console.error("[Daily Maintenance] Trade sync failed:", error);
            results.tasks.tradeSync = {
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }

        // ============================================
        // TASK 3: DATA QUALITY CHECKS (lightweight)
        // ============================================
        console.log("[Daily Maintenance] Task 3/3: Running data quality checks...");
        try {
            const qualityResult = await runDataQualityChecks();
            results.tasks.dataQuality = qualityResult;
        } catch (error) {
            console.error("[Daily Maintenance] Data quality checks failed:", error);
            results.tasks.dataQuality = {
                error: error instanceof Error ? error.message : "Unknown error"
            };
        }

        const duration = Date.now() - startTime;
        results.duration = `${duration}ms`;

        console.log("[Daily Maintenance] ✅ COMPLETED", JSON.stringify(results.summary, null, 2));

        return NextResponse.json(results);

    } catch (error) {
        console.error("[Daily Maintenance] Fatal error:", error);
        return NextResponse.json(
            {
                error: "Daily maintenance failed",
                details: error instanceof Error ? error.message : "Unknown"
            },
            { status: 500 }
        );
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Task 1: Check broker connection health
 * (Migrated from /api/cron/check-connections)
 */
async function checkConnectionHealth() {
    const users = await prisma.user.findMany({
        where: {
            snapTradeUserId: { not: null },
            snapTradeUserSecret: { not: null }
        },
        include: { brokerAccounts: true }
    });

    let healthy = 0;
    let broken = 0;
    let emailsSent = 0;

    for (const user of users) {
        try {
            if (!user.snapTradeUserSecret) continue;

            const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
            if (!decryptedSecret || !user.snapTradeUserId) continue;

            // Fetch accounts and authorizations
            const [accounts, authorizations] = await Promise.all([
                snapTrade.accountInformation.listUserAccounts({
                    userId: user.snapTradeUserId,
                    userSecret: decryptedSecret,
                }),
                snapTrade.connections.listBrokerageAuthorizations({
                    userId: user.snapTradeUserId,
                    userSecret: decryptedSecret
                })
            ]);

            const accountsList = accounts.data || [];
            const authList = authorizations.data || [];
            const matchedLocalAccountIds = new Set<string>();

            // Check each account's health
            for (const acc of accountsList) {
                const authId = (acc as any).brokerage_authorization;
                const matchingAuth = authList.find(a => a.id === authId);
                const isDisabled = matchingAuth?.disabled === true;

                const localAccount = user.brokerAccounts.find(
                    a => a.snapTradeAccountId === acc.id
                );

                if (localAccount) {
                    matchedLocalAccountIds.add(localAccount.id);
                    const wasDisabled = localAccount.disabled;
                    const statusChanged = wasDisabled !== isDisabled;

                    if (isDisabled) {
                        broken++;
                        if (statusChanged) {
                            // Send alert email for newly broken connection
                            try {
                                const { sendConnectionAlert } = await import('@/lib/email-alerts');
                                await sendConnectionAlert(
                                    user.email!,
                                    user.name || 'Trader',
                                    acc.institution_name || 'Your Broker',
                                    'Connection Broken'
                                );
                                emailsSent++;
                            } catch (e) {
                                console.error('[Health Check] Email failed:', e);
                            }
                        }
                    } else {
                        healthy++;
                    }

                    // Update account status
                    await prisma.brokerAccount.update({
                        where: { id: localAccount.id },
                        data: {
                            disabled: isDisabled,
                            disabledAt: isDisabled ? (wasDisabled ? localAccount.disabledAt : new Date()) : null,
                            disabledReason: isDisabled ? 'Connection broken - requires re-authentication' : null,
                            lastCheckedAt: new Date(),
                            authorizationId: authId,
                            brokerName: acc.institution_name
                        }
                    });
                }
            }

            // Handle missing accounts (deleted from SnapTrade)
            const missingAccounts = user.brokerAccounts.filter(
                acc => !matchedLocalAccountIds.has(acc.id) && !acc.disabled
            );

            for (const acc of missingAccounts) {
                await prisma.brokerAccount.update({
                    where: { id: acc.id },
                    data: {
                        disabled: true,
                        disabledAt: new Date(),
                        disabledReason: 'Connection removed from provider',
                        lastCheckedAt: new Date()
                    }
                });
                broken++;

                // Send alert email
                try {
                    const { sendConnectionAlert } = await import('@/lib/email-alerts');
                    await sendConnectionAlert(
                        user.email!,
                        user.name || 'Trader',
                        acc.brokerName || 'Unknown Broker',
                        'Connection Removed'
                    );
                    emailsSent++;
                } catch (e) {
                    console.error('[Health Check] Email failed:', e);
                }
            }

        } catch (err) {
            console.error(`[Health Check] Error for user ${user.email}:`, err);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
        totalUsers: users.length,
        healthy,
        broken,
        emailsSent
    };
}

/**
 * Task 2: Sync trades for all users
 * (Migrated from /api/cron/sync-all)
 */
async function syncAllUserTrades() {
    const usersWithSnapTrade = await prisma.user.findMany({
        where: {
            AND: [
                { snapTradeUserId: { not: null } },
                { snapTradeUserSecret: { not: null } }
            ]
        },
        select: {
            id: true,
            email: true,
            snapTradeUserId: true,
        }
    });

    const snapTradeService = new SnapTradeService();
    let successful = 0;
    let failed = 0;
    let totalTrades = 0;

    for (const user of usersWithSnapTrade) {
        try {
            const syncResult = await snapTradeService.syncTrades(user.id);
            successful++;
            totalTrades += syncResult.synced;

            console.log(`[Trade Sync] User ${user.email}: ${syncResult.synced} trades`);
        } catch (error) {
            failed++;
            console.error(`[Trade Sync] User ${user.email} failed:`, error);
        }

        // Delay between users to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
        totalUsers: usersWithSnapTrade.length,
        successful,
        failed,
        totalTrades
    };
}

/**
 * Task 3: Data quality checks
 * (Lightweight version - full checks available on-demand)
 */
async function runDataQualityChecks() {
    // Count orphaned trades (account deleted but trades remain)
    const orphanedTrades = await prisma.trade.count({
        where: {
            account: {
                disabled: true,
                disabledAt: {
                    lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days old
                }
            }
        }
    });

    // Count duplicate snapTradeTradeIds
    const duplicates = await prisma.$queryRaw<Array<{ snapTradeTradeId: string; count: bigint }>>`
        SELECT "snapTradeTradeId", COUNT(*) as count
        FROM trades
        WHERE "snapTradeTradeId" IS NOT NULL
        GROUP BY "snapTradeTradeId"
        HAVING COUNT(*) > 1
    `;

    return {
        orphanedTrades,
        duplicateTrades: duplicates.length,
        status: orphanedTrades === 0 && duplicates.length === 0 ? 'clean' : 'issues_found'
    };
}

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes (same as old sync-all)
```

#### 1.2 Update vercel.json

**Replace current cron configuration:**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-maintenance",
      "schedule": "0 14 * * *"
    }
  ],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    },
    "src/app/api/cron/daily-maintenance/route.ts": {
      "maxDuration": 300
    }
  }
}
```

**Schedule explanation:**
- `0 14 * * *` = 9:00 AM EST / 2:00 PM UTC
- Discord recommended time (pre-market check)
- Runs all tasks sequentially within 5-minute limit

#### 1.3 Delete or Archive Old Cron Files

**Option A: Delete** (clean slate)
```bash
rm src/app/api/cron/sync-all/route.ts
rm src/app/api/cron/check-connections/route.ts
# Keep data-quality as on-demand endpoint (remove from cron, add to admin panel)
```

**Option B: Archive** (keep for reference)
```bash
mkdir src/app/api/cron/_archived
mv src/app/api/cron/sync-all/route.ts src/app/api/cron/_archived/
mv src/app/api/cron/check-connections/route.ts src/app/api/cron/_archived/
```

#### 1.4 Make Data Quality On-Demand

Convert `/api/cron/data-quality/route.ts` to admin-only endpoint:

```typescript
// Change GET to POST and require admin auth
export async function POST(request: Request) {
    const session = await auth();

    // Admin only
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Run full data quality checks...
}
```

Add trigger button in admin settings:
```tsx
// In /src/app/(dashboard)/settings/page.tsx
<Button onClick={async () => {
    await fetch('/api/cron/data-quality', { method: 'POST' });
    toast.success('Data quality check started');
}}>
    Run Data Quality Check
</Button>
```

**Effort:** 2-3 hours
**Risk:** Medium (major refactor, test thoroughly)

---

## Phase 2: Real-Time Updates (FREE - No Cron Needed!)

### 2.1 Implement Recent Orders Endpoint

**Key Insight:** Recent orders polling doesn't need a cron - it's triggered by user activity!

**Two approaches for free tier:**

#### Option A: Manual Refresh Button (Simplest)

Add "Refresh" button to dashboard:

```tsx
// In dashboard
<Button onClick={async () => {
    setLoading(true);
    const res = await fetch('/api/trades/sync-recent', { method: 'POST' });
    if (res.ok) {
        const data = await res.json();
        mutate(); // Refresh data
        toast.success(`${data.synced} new trades synced`);
    }
    setLoading(false);
}}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Sync Recent Orders
</Button>
```

**Pros:**
- Zero server cost (only runs when user clicks)
- Full control for users
- No polling overhead

**Cons:**
- Not automatic
- Requires manual action

#### Option B: Client-Side Polling (Smart)

Auto-poll ONLY when dashboard is open:

```tsx
// In dashboard - only polls when page is visible
useEffect(() => {
    if (!session?.user) return;

    const pollRecentOrders = async () => {
        // Only poll if page is visible
        if (document.hidden) return;

        try {
            const res = await fetch('/api/trades/sync-recent', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.synced > 0) {
                    mutate(); // Refresh UI
                    toast.success(`${data.synced} new trades synced`);
                }
            }
        } catch (err) {
            console.error('Recent sync failed:', err);
        }
    };

    // Initial poll
    pollRecentOrders();

    // Poll every 2 minutes while page is visible
    const interval = setInterval(pollRecentOrders, 120_000);

    // Stop polling when page becomes hidden
    const handleVisibilityChange = () => {
        if (document.hidden) {
            clearInterval(interval);
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
}, [session, mutate]);
```

**Pros:**
- Real-time updates (2min lag)
- FREE endpoint (no SnapTrade cost)
- Only runs when user is active (zero server cost when idle)
- Better UX than manual refresh

**Cons:**
- Uses client browser resources
- Multiple tabs = multiple polls (can add tab coordination)

**Recommendation:** Use **Option B** (client-side polling) for best UX at zero cost.

**Files to create:**
- `/src/app/api/trades/sync-recent/route.ts` (from original plan)
- Add `syncRecentOrders()` to SnapTradeService (from original plan)

**Effort:** 2-3 hours
**Risk:** Low (separate from cron, doesn't affect existing sync)

---

## Phase 3: Optimizations (FREE TIER FRIENDLY)

### 3.1 Smart Sync Frequency in Single Cron

Modify the unified cron to skip inactive users:

In `daily-maintenance/route.ts`, update `syncAllUserTrades()`:

```typescript
async function syncAllUserTrades() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Only sync users active in last 7 days (saves API quota)
    const usersWithSnapTrade = await prisma.user.findMany({
        where: {
            AND: [
                { snapTradeUserId: { not: null } },
                { snapTradeUserSecret: { not: null } },
                // Only sync if logged in recently OR has active broker accounts
                {
                    OR: [
                        { lastLoginAt: { gte: sevenDaysAgo } },
                        { brokerAccounts: { some: { disabled: false } } }
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

    console.log(`[Smart Sync] Syncing ${usersWithSnapTrade.length} active users (skipped inactive)`);

    // ... rest of sync logic
}
```

**Add lastLoginAt tracking:**

In `/src/lib/auth.ts`:
```typescript
callbacks: {
    async signIn({ user }) {
        if (user.id) {
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });
        }
        return true;
    },
}
```

**Prisma migration:**
```prisma
model User {
  // ... existing fields
  lastLoginAt   DateTime?
}
```

**Benefit:** Reduces API calls by 60-70% by skipping inactive users

**Effort:** 1 hour
**Risk:** Low (conservative - only skips truly inactive users)

---

### 3.2 Rate Limit Monitoring

Add to SnapTradeService to log rate limit headers:

```typescript
// In syncTrades() method after API calls
if ((accounts as any).headers) {
    const remaining = (accounts as any).headers['x-ratelimit-remaining'];
    const limit = (accounts as any).headers['x-ratelimit-limit'];

    if (remaining && limit) {
        console.log(`[Rate Limit] ${remaining}/${limit} remaining`);

        if (parseInt(remaining) < parseInt(limit) * 0.1) {
            console.warn(`⚠️ LOW QUOTA: Only ${remaining}/${limit} requests remaining!`);
        }
    }
}
```

**Effort:** 30 minutes
**Risk:** None (logging only)

---

## REVISED TIMELINE (Free Tier Optimized)

### Day 1: Consolidate Cron (CRITICAL)
- ✅ Create unified `/api/cron/daily-maintenance` endpoint
- ✅ Update vercel.json to single cron at 9 AM EST
- ✅ Archive old cron files
- ✅ Make data-quality on-demand (admin-only)
- ✅ Test thoroughly in development

**Effort:** 2-3 hours
**Impact:** 🔥 CRITICAL - fixes orphaned cron jobs

### Day 2: Real-Time Updates
- ✅ Implement `/api/trades/sync-recent` endpoint
- ✅ Add `syncRecentOrders()` to SnapTradeService
- ✅ Add client-side polling to dashboard (Option B)
- ✅ Test rate limiting (30 req/hour)

**Effort:** 2-3 hours
**Impact:** 🚀 VERY HIGH - 2min lag vs 23h lag

### Day 3: Polish
- ✅ Add smart sync (skip inactive users)
- ✅ Add rate limit monitoring
- ✅ Document IBKR delays in FAQ
- ✅ Update CLAUDE.md with Discord findings

**Effort:** 2 hours
**Impact:** 📈 HIGH - cost optimization + UX

### Day 4: Testing & Deploy
- ✅ End-to-end testing
- ✅ Monitor logs for first 24h
- ✅ Verify cron runs successfully at 9 AM EST

**Effort:** 1-2 hours

**TOTAL: 7-10 hours over 4 days**

---

## Free Tier Constraints Summary

| Feature | Vercel Free Tier | Our Approach |
|---------|------------------|--------------|
| Cron jobs | **1 maximum** | ✅ Unified daily-maintenance cron |
| Function duration | 10s default, 300s max | ✅ 300s for cron, 25s for sync |
| Invocations | 100/hour | ✅ 1 cron/day + manual syncs only |
| Bandwidth | 100GB/month | ✅ Minimal (API calls only) |

**Key Insight:** Client-side polling doesn't count against server limits!

---

## Updated Questions

1. **Client-Side Polling:** Enable automatic 2-min polling OR manual refresh button only?

2. **Smart Sync:** Skip inactive users (>7 days) to save API quota?

3. **Cron Timing:** Keep 9 AM EST OR prefer different time?

4. **Data Quality:** Keep as on-demand admin tool OR remove entirely?

5. **Testing:** Local testing first OR deploy to production with monitoring?

---

## Next Steps

1. ✅ Review this FREE TIER plan
2. ✅ Confirm client-side polling approach (Option A or B)
3. ✅ Start with Day 1 (consolidate cron) - most critical
4. ✅ Deploy incrementally and monitor

---

**Last Updated:** January 31, 2026
**Document Version:** 2.0 (Free Tier Optimized)
**Author:** AI Assistant
