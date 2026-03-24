import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { snapTradeService } from "@/lib/services/snaptrade.service";
import { snapTrade } from '@/lib/snaptrade';
import { safeDecrypt } from '@/lib/encryption';

/**
 * GET /api/cron/daily
 *
 * Unified daily cron (Free Tier = 1 cron limit)
 * 0. Expire trials
 * 1. Check broker connection health + send email alerts
 * 2. Sync all user trades
 * 3. Activation email drip for users who haven't connected a broker
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
            activationDrip: {} as any,
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

        // ============================================
        // STEP 3: Activation Email Drip (unconnected users)
        // ============================================
        try {
            results.activationDrip = await sendActivationDripEmails();
        } catch (error) {
            console.error("[Daily Cron] Activation drip failed:", error);
            results.activationDrip = { error: error instanceof Error ? error.message : "Failed" };
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
        include: { brokerAccounts: { where: { source: 'SNAPTRADE' } } }
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

            for (const localAccount of user.brokerAccounts) {
                const matchingAuth = authList.find(a => a.id === localAccount.authorizationId);
                const isUserDisconnected = localAccount.disabledReason === 'User disconnected - will not sync';
                const snapTradeDisabled = !matchingAuth || matchingAuth.disabled === true;

                // If user explicitly disconnected, keep it disconnected regardless of SnapTrade's health.
                const isDisabled = isUserDisconnected ? true : snapTradeDisabled;
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
                where: { userId: user.id, source: 'SNAPTRADE', syncStatus: { in: ['PENDING', 'IN_PROGRESS'] } },
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
                where: { userId: user.id, disabled: false, source: 'SNAPTRADE' },
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

// ============================================
// HELPER: Send activation drip emails
// T+24h: Broker connection nudge (social proof)
// T+72h: Personal check-in from Gautham
// ============================================
async function sendActivationDripEmails() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find users who completed onboarding but have zero broker accounts
    // Only consider users who signed up within the last 7 days (don't spam old users)
    const unconnectedUsers = await prisma.user.findMany({
        where: {
            onboardingCompleted: true,
            email: { not: null },
            createdAt: { gte: sevenDaysAgo },
            brokerAccounts: { none: {} },
        },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            onboardingData: true,
        },
    });

    let nudgesSent = 0;
    let checkinsSent = 0;
    let skipped = 0;

    for (const user of unconnectedUsers) {
        if (!user.email) continue;

        const onboardingData =
            user.onboardingData &&
                typeof user.onboardingData === "object" &&
                !Array.isArray(user.onboardingData)
                ? (user.onboardingData as Record<string, unknown>)
                : {};

        const accountAge = now.getTime() - user.createdAt.getTime();
        const accountAgeHours = accountAge / (1000 * 60 * 60);
        const displayName = user.name || "Trader";

        try {
            // T+24h: Send broker connection nudge
            if (
                accountAgeHours >= 24 &&
                !onboardingData.nudgeEmailSentAt
            ) {
                const { sendBrokerConnectionNudgeEmail } = await import('@/lib/email');
                await sendBrokerConnectionNudgeEmail(user.email, displayName);

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        onboardingData: {
                            ...onboardingData,
                            nudgeEmailSentAt: now.toISOString(),
                        },
                    },
                });

                nudgesSent++;
                console.log(`[Activation Drip] T+24h nudge sent to ${user.email}`);
            }
            // T+72h: Send personal check-in
            else if (
                accountAgeHours >= 72 &&
                onboardingData.nudgeEmailSentAt &&
                !onboardingData.checkinEmailSentAt
            ) {
                const { sendOnboardingCheckInEmail } = await import('@/lib/email');
                await sendOnboardingCheckInEmail(user.email, displayName);

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        onboardingData: {
                            ...onboardingData,
                            checkinEmailSentAt: now.toISOString(),
                        },
                    },
                });

                checkinsSent++;
                console.log(`[Activation Drip] T+72h check-in sent to ${user.email}`);
            } else {
                skipped++;
            }
        } catch (error) {
            console.error(`[Activation Drip] Error for ${user.email}:`, error);
        }

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[Activation Drip] Nudges: ${nudgesSent}, Check-ins: ${checkinsSent}, Skipped: ${skipped}`);
    return { totalEligible: unconnectedUsers.length, nudgesSent, checkinsSent, skipped };
}

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes
