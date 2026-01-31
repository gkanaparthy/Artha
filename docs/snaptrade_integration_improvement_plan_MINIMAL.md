# SnapTrade Integration Improvement Plan - MINIMAL (What You Actually Need)

**Date:** January 31, 2026
**Constraints:**
- ✅ Vercel Free Tier (1 cron job only)
- ✅ No IBKR users (skip broker-specific docs)
- ✅ Early stage (focus on essentials only)

**Goal:** Fix critical gaps with minimal effort

---

## TL;DR - 3 Essential Fixes Only

| Fix | Why | Effort |
|-----|-----|--------|
| **1. Consolidate cron jobs** | You have orphaned endpoints that never run | 2 hrs |
| **2. Add real-time recent orders** | Users wait 23h for trades (FREE fix!) | 2 hrs |
| **3. Better cron timing** | 9 AM EST = pre-market sync (Discord best practice) | 5 min |

**Total effort: ~5 hours**

---

## Fix #1: Consolidate Cron Jobs (CRITICAL)

### Problem
You have **3 cron endpoint files** but Vercel Free Tier only allows **1 scheduled cron**.

**Current state:**
- ✅ `/api/cron/sync-all` - Scheduled and runs daily
- ❌ `/api/cron/check-connections` - Exists but NEVER runs (not in vercel.json)
- ❌ `/api/cron/data-quality` - Exists but NEVER runs (not in vercel.json)

**Impact:** Connection health checks never happen → users not notified of broken brokers until manual sync fails.

### Solution: Merge Everything into One Endpoint

**New file:** `/src/app/api/cron/daily/route.ts`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SnapTradeService } from "@/lib/services/snaptrade.service";
import { snapTrade } from '@/lib/snaptrade';
import { safeDecrypt } from '@/lib/encryption';

/**
 * GET /api/cron/daily
 *
 * Unified daily cron (Free Tier = 1 cron limit)
 * 1. Check broker connection health + send email alerts
 * 2. Sync all user trades
 *
 * Schedule: 9 AM EST (Discord recommended)
 */
export async function GET(request: Request) {
    try {
        // Auth check
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[Daily Cron] Starting...");
        const results = { healthCheck: {}, sync: {} };

        // ============================================
        // STEP 1: Check Connection Health
        // ============================================
        try {
            results.healthCheck = await checkConnectionHealth();
        } catch (error) {
            console.error("[Daily Cron] Health check failed:", error);
            results.healthCheck = { error: error instanceof Error ? error.message : "Failed" };
        }

        // ============================================
        // STEP 2: Sync All Users
        // ============================================
        try {
            results.sync = await syncAllUsers();
        } catch (error) {
            console.error("[Daily Cron] Sync failed:", error);
            results.sync = { error: error instanceof Error ? error.message : "Failed" };
        }

        console.log("[Daily Cron] ✅ Complete");
        return NextResponse.json(results);

    } catch (error) {
        console.error("[Daily Cron] Fatal error:", error);
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

// ============================================
// HELPER: Check connection health + send alerts
// ============================================
async function checkConnectionHealth() {
    const users = await prisma.user.findMany({
        where: {
            snapTradeUserId: { not: null },
            snapTradeUserSecret: { not: null }
        },
        include: { brokerAccounts: true }
    });

    let broken = 0;
    let emailsSent = 0;

    for (const user of users) {
        try {
            if (!user.snapTradeUserSecret) continue;

            const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
            if (!decryptedSecret || !user.snapTradeUserId) continue;

            // Get authorizations to check disabled status
            const authorizations = await snapTrade.connections.listBrokerageAuthorizations({
                userId: user.snapTradeUserId,
                userSecret: decryptedSecret
            });

            const authList = authorizations.data || [];

            // Check each local account
            for (const localAccount of user.brokerAccounts) {
                const matchingAuth = authList.find(a => a.id === localAccount.authorizationId);
                const isDisabled = !matchingAuth || matchingAuth.disabled === true;
                const wasDisabled = localAccount.disabled;

                // If newly broken, send alert
                if (isDisabled && !wasDisabled) {
                    broken++;

                    // Update DB
                    await prisma.brokerAccount.update({
                        where: { id: localAccount.id },
                        data: {
                            disabled: true,
                            disabledAt: new Date(),
                            disabledReason: 'Connection broken - requires re-authentication',
                            lastCheckedAt: new Date()
                        }
                    });

                    // Send email
                    try {
                        const { sendConnectionAlert } = await import('@/lib/email-alerts');
                        await sendConnectionAlert(
                            user.email!,
                            user.name || 'Trader',
                            localAccount.brokerName || 'Your Broker',
                            'Connection Broken'
                        );
                        emailsSent++;
                    } catch (e) {
                        console.error('[Health Check] Email failed:', e);
                    }
                } else if (!isDisabled && wasDisabled) {
                    // Re-enabled - update status
                    await prisma.brokerAccount.update({
                        where: { id: localAccount.id },
                        data: {
                            disabled: false,
                            disabledAt: null,
                            disabledReason: null,
                            lastCheckedAt: new Date()
                        }
                    });
                } else {
                    // No change - just update lastCheckedAt
                    await prisma.brokerAccount.update({
                        where: { id: localAccount.id },
                        data: { lastCheckedAt: new Date() }
                    });
                }
            }

        } catch (err) {
            console.error(`[Health Check] Error for ${user.email}:`, err);
        }

        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit protection
    }

    return { totalUsers: users.length, brokenConnections: broken, emailsSent };
}

// ============================================
// HELPER: Sync all user trades
// ============================================
async function syncAllUsers() {
    const users = await prisma.user.findMany({
        where: {
            AND: [
                { snapTradeUserId: { not: null } },
                { snapTradeUserSecret: { not: null } }
            ]
        },
        select: { id: true, email: true }
    });

    const snapTradeService = new SnapTradeService();
    let successful = 0;
    let failed = 0;
    let totalTrades = 0;

    for (const user of users) {
        try {
            const result = await snapTradeService.syncTrades(user.id);
            successful++;
            totalTrades += result.synced;
        } catch (error) {
            failed++;
            console.error(`[Sync] User ${user.email} failed:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit protection
    }

    return { totalUsers: users.length, successful, failed, totalTrades };
}

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes
```

**Update vercel.json:**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 14 * * *"
    }
  ],
  "functions": {
    "src/app/api/cron/daily/route.ts": {
      "maxDuration": 300
    }
  }
}
```

**Schedule:** `0 14 * * *` = 9:00 AM EST / 2:00 PM UTC (Discord recommended)

**Delete old files:**
```bash
rm src/app/api/cron/sync-all/route.ts
rm src/app/api/cron/check-connections/route.ts
rm src/app/api/cron/data-quality/route.ts  # Not needed for now
```

**Effort:** 2 hours (coding + testing)
**Impact:** 🔥 CRITICAL - Fixes orphaned health checks

---

## Fix #2: Real-Time Recent Orders (FREE!)

### Problem
Users place trade at 10 AM → won't see it in Artha until 9 AM next day = **23 hour lag!**

### Discord Finding
> "Recent orders endpoint is **FREE** and realtime. Returns last 24 hours only."

### Solution: Client-Side Polling (Zero Server Cost)

#### Step 1: Create Recent Orders API Endpoint

**New file:** `/src/app/api/trades/sync-recent/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';
import { applyRateLimit } from '@/lib/ratelimit';

/**
 * POST /api/trades/sync-recent
 *
 * Syncs recent orders (last 24h) using FREE SnapTrade endpoint.
 * Rate limit: 30 req/hour (every 2 minutes OK)
 */
export async function POST(request: NextRequest) {
    try {
        // Rate limit: 30 per hour
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
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
```

#### Step 2: Add Method to SnapTradeService

**In `/src/lib/services/snaptrade.service.ts`**, add this method:

```typescript
/**
 * Syncs recent orders (last 24h) using FREE SnapTrade endpoint.
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
        include: { brokerAccounts: { where: { disabled: false } } } // Only active accounts
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
    const allRecentOrders: any[] = [];

    console.log('[Recent Orders] Fetching for', user.brokerAccounts.length, 'accounts');

    // Fetch recent orders for each account (parallel)
    const promises = user.brokerAccounts.map(async (account) => {
        try {
            const recentOrders = await snapTrade.trading.getAccountRecentOrders({
                accountId: account.snapTradeAccountId,
                userId: snapTradeUserId,
                userSecret: snapTradeUserSecret,
            });

            const orders = recentOrders.data || [];
            console.log('[Recent Orders] Account', account.brokerName, ':', orders.length, 'orders');

            // Tag with account info
            for (const order of orders) {
                (order as any)._accountId = account.id;
            }
            return orders;
        } catch (err) {
            console.error('[Recent Orders] Error for', account.brokerName, ':', err);
            failedAccounts.push(account.brokerName || account.snapTradeAccountId);
            return [];
        }
    });

    const results = await Promise.all(promises);
    for (const list of results) {
        allRecentOrders.push(...list);
    }

    // Get existing trade IDs to skip duplicates
    const existingTrades = await prisma.trade.findMany({
        where: { accountId: { in: user.brokerAccounts.map(a => a.id) } },
        select: { snapTradeTradeId: true }
    });
    const existingIds = new Set(existingTrades.map(t => t.snapTradeTradeId).filter(Boolean));

    let synced = 0;
    const { isTradeBlocked } = await import('../tradeBlocklist');

    // Process orders into trades
    for (const order of allRecentOrders) {
        const orderId = order.id;

        // Skip if already synced
        if (existingIds.has(orderId)) continue;

        // Check blocklist
        if (isTradeBlocked(orderId).blocked) continue;

        const accountId = (order as any)._accountId;
        if (!accountId) continue;

        // Parse order fields
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
                    fees: 0, // Recent orders may not include fees
                    currency: order.universal_symbol?.currency?.code || 'USD',
                    type: isOption ? 'OPTION' : 'STOCK',
                    snapTradeTradeId: orderId,
                    contractMultiplier: contractMultiplier,
                    optionAction: order.option_type || null,
                    optionType: optionSymbol?.option_type || null,
                    strikePrice: optionSymbol?.strike_price || null,
                    expiryDate: optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null,
                },
            });
            synced++;
        } catch (err) {
            console.error('[Recent Orders] Create trade failed:', err);
        }
    }

    console.log('[Recent Orders] Synced:', synced, 'Failed accounts:', failedAccounts.length);

    return {
        synced,
        accounts: user.brokerAccounts.length,
        failedAccounts,
    };
}
```

#### Step 3: Add Client-Side Polling to Dashboard

**In `/src/app/(dashboard)/page.tsx`:**

```tsx
"use client";

import { useEffect } from 'react';
import useSWR from 'swr';

export default function DashboardPage() {
    const { data: metrics, mutate } = useSWR('/api/metrics', fetcher);

    // Auto-poll recent orders every 2 minutes (ONLY when page visible)
    useEffect(() => {
        const pollRecentOrders = async () => {
            // Skip if page not visible (tab inactive)
            if (document.hidden) return;

            try {
                const res = await fetch('/api/trades/sync-recent', { method: 'POST' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.synced > 0) {
                        mutate(); // Refresh metrics
                        console.log(`✅ Synced ${data.synced} new trades`);
                    }
                }
            } catch (err) {
                console.error('Recent sync failed:', err);
            }
        };

        // Poll every 2 minutes
        const interval = setInterval(pollRecentOrders, 120_000);

        return () => clearInterval(interval);
    }, [mutate]);

    return (
        {/* ... rest of dashboard */}
    );
}
```

**Why this works:**
- ✅ FREE endpoint (no SnapTrade cost)
- ✅ Only runs when dashboard is open (zero server cost when idle)
- ✅ 2-minute lag vs 23-hour lag
- ✅ No cron needed (client-side)

**Effort:** 2 hours (code + test)
**Impact:** 🚀 VERY HIGH - Real-time updates at zero cost

---

## Fix #3: Optimize Cron Timing

### Problem
Current: 7:30 AM CST
Discord recommendation: 9:00 AM EST (pre-market check)

### Solution
Already done in Fix #1! Change `vercel.json` schedule to:

```json
"schedule": "0 14 * * *"  // 9:00 AM EST / 2:00 PM UTC
```

**Why 9 AM EST:**
- Captures overnight broker data
- Fresh data before market opens (9:30 AM)
- Lower API load than after-market
- Discord best practice

**Effort:** 5 minutes (already included in Fix #1)
**Impact:** Medium (better data freshness)

---

## BONUS: Rate Limit Monitoring (Optional)

### Add simple logging to see quota usage

**In `/src/lib/services/snaptrade.service.ts`**, after API calls:

```typescript
// After any SnapTrade API call, log rate limit
if ((result as any).headers) {
    const remaining = (result as any).headers['x-ratelimit-remaining'];
    const limit = (result as any).headers['x-ratelimit-limit'];

    if (remaining && limit) {
        console.log(`[Rate Limit] ${remaining}/${limit} remaining`);

        // Warn if low
        if (parseInt(remaining) < parseInt(limit) * 0.1) {
            console.warn(`⚠️ LOW QUOTA: ${remaining}/${limit} remaining!`);
        }
    }
}
```

**Effort:** 30 minutes
**Impact:** Low (visibility only, no behavior change)

---

## Implementation Plan

### Day 1: Consolidate Cron (2 hours)
1. Create `/src/app/api/cron/daily/route.ts`
2. Update `vercel.json` (schedule + duration)
3. Delete old cron files
4. Test locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily`
5. Deploy and verify runs at 9 AM EST next day

### Day 2: Recent Orders (2 hours)
1. Create `/src/app/api/trades/sync-recent/route.ts`
2. Add `syncRecentOrders()` method to SnapTradeService
3. Add client-side polling to dashboard
4. Test: Manual sync button first, then enable auto-polling
5. Monitor for 24h to verify no rate limit issues

### Day 3: Polish (30 min)
1. Add rate limit logging (optional)
2. Update CLAUDE.md with changes
3. Monitor production for any issues

**TOTAL: ~5 hours over 3 days**

---

## What We're Skipping (For Now)

| Item | Why Skip | When to Add |
|------|----------|-------------|
| IBKR documentation | No IBKR users | When first IBKR user connects |
| Data quality checks | Not critical early stage | When data issues appear |
| Webhooks | Not real-time anyway | Maybe never (polling works) |
| Smart sync tiers | Premature optimization | When you have 100+ users |
| Health check endpoint | Already in daily cron | If you need standalone monitoring |
| Integration tests | Time-consuming | When team grows or bugs increase |

---

## Summary

**3 Essential Fixes:**
1. ✅ Consolidate 3 cron files → 1 unified daily cron
2. ✅ Add FREE real-time recent orders (2min lag!)
3. ✅ Change cron to 9 AM EST (Discord best practice)

**Effort:** ~5 hours
**Impact:** 🔥 Fixes critical gaps + massive UX improvement

**Result:**
- Connection health checks actually run ✅
- Real-time data (2min lag vs 23h) ✅
- Optimal sync timing ✅
- Zero extra cost ✅

---

## Next Steps

1. Review this plan - make sense?
2. Start with Day 1 (cron consolidation) - most critical
3. Deploy incrementally, monitor logs
4. Add recent orders polling after cron is stable

Questions?

---

**Last Updated:** January 31, 2026
**Version:** 3.0 - MINIMAL (What You Actually Need)
