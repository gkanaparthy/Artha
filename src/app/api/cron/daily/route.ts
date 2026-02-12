import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { snapTradeService } from "@/lib/services/snaptrade.service";
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
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[Daily Cron] Starting...");
        const results = {
            trialExpiry: {} as any,
            healthCheck: {} as any,
            sync: {} as any,
            timestamp: new Date().toISOString()
        };

        // ============================================
        // STEP 0: Expire Trials (run first, before sync)
        // ============================================
        try {
            results.trialExpiry = await expireTrials();
        } catch (error) {
            console.error("[Daily Cron] Trial expiry failed:", error);
            results.trialExpiry = { error: error instanceof Error ? error.message : "Failed" };
        }

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
        // STEP 2: Sync All Users (Pro users only)
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
// HELPER: Expire app-only trials → FREE
// ============================================
async function expireTrials() {
    // Find TRIALING users whose trial expired AND who have no Stripe subscription
    // (Users with stripeSubscriptionId are handled by Stripe webhooks)
    const expiredTrials = await prisma.user.findMany({
        where: {
            subscriptionStatus: 'TRIALING',
            trialEndsAt: { lt: new Date() },
            stripeSubscriptionId: null,
        },
        select: { id: true, email: true, trialEndsAt: true },
    });

    let transitioned = 0;

    for (const user of expiredTrials) {
        try {
            await prisma.user.update({
                where: { id: user.id },
                data: { subscriptionStatus: 'FREE' },
            });

            await prisma.subscriptionEvent.create({
                data: {
                    userId: user.id,
                    eventType: 'trial_expired',
                    eventData: {
                        trialEndsAt: user.trialEndsAt?.toISOString(),
                        transitionedAt: new Date().toISOString(),
                    },
                },
            });

            transitioned++;
            console.log(`[Expire Trials] ${user.email} → FREE`);
        } catch (error) {
            console.error(`[Expire Trials] Failed for ${user.email}:`, error);
        }
    }

    console.log(`[Expire Trials] ${transitioned}/${expiredTrials.length} transitioned`);
    return { found: expiredTrials.length, transitioned };
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
    // Only sync users with Pro access (skip FREE/EXPIRED/NONE users to save API calls)
    const users = await prisma.user.findMany({
        where: {
            snapTradeUserId: { not: null },
            snapTradeUserSecret: { not: null },
            subscriptionStatus: {
                in: ['ACTIVE', 'TRIALING', 'LIFETIME', 'GRANDFATHERED', 'PAST_DUE', 'CANCELLED']
            },
        },
        select: { id: true, email: true }
    });

    let successful = 0;
    let failed = 0;
    let totalTrades = 0;

    for (const user of users) {
        try {
            // Skip users with an active initial sync in progress
            const inProgressCount = await prisma.brokerAccount.count({
                where: { userId: user.id, syncStatus: { in: ['PENDING', 'IN_PROGRESS'] } },
            });
            if (inProgressCount > 0) {
                console.log(`[Sync] Skipping user ${user.email} - has PENDING/IN_PROGRESS accounts`);
                continue;
            }

            const result = await snapTradeService.syncTrades(user.id);
            successful++;
            totalTrades += result.synced;

            // Update sync status on all active accounts
            await prisma.brokerAccount.updateMany({
                where: { userId: user.id, disabled: false },
                data: {
                    syncCompletedAt: new Date(),
                    syncStatus: 'COMPLETED',
                },
            });
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
