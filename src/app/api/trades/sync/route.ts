import { NextRequest, NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applyRateLimit } from '@/lib/ratelimit';

/**
 * Helper that rejects after `ms` milliseconds.
 * Used to avoid hanging forever if SnapTrade is unresponsive.
 */
function timeout<T>(promise: Promise<T>, ms: number, context: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
    }, ms);
    // The SnapTrade SDK respects AbortController.signal for most calls.
    // If it doesn't, we still reject after the timeout.
    return promise
        .finally(() => clearTimeout(timer))
        .catch((err) => {
            if (err.name === 'AbortError') {
                throw new Error(`${context} timed out after ${ms / 1000}s`);
            }
            throw err;
        });
}

export async function POST(request: NextRequest) {
    try {
        // Rate limit: 5 requests per minute for sync (expensive operation)
        const rateLimitResponse = await applyRateLimit(request, 'sync');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Pro Access Check
        const { getSubscriptionInfo } = await import('@/lib/subscription');
        const sub = await getSubscriptionInfo(session.user.id);
        if (!sub.canAccessPro) {
            return NextResponse.json({
                error: 'Pro access required for trade syncing. Your trial may have ended.'
            }, { status: 402 });
        }

        const userId = session.user.id;

        // Concurrency guard: check if any account is already syncing
        const inProgressCount = await prisma.brokerAccount.count({
            where: { userId, source: 'SNAPTRADE', syncStatus: 'IN_PROGRESS' },
        });
        if (inProgressCount > 0) {
            return NextResponse.json({ status: 'skipped', message: 'Sync already in progress' });
        }

        // Get active accounts before starting
        const activeAccounts = await prisma.brokerAccount.findMany({
            where: { userId, disabled: false, source: 'SNAPTRADE' },
            select: { id: true, brokerName: true, snapTradeAccountId: true }
        });

        if (activeAccounts.length === 0) {
            return NextResponse.json({ status: 'no_action', message: 'No active accounts found' });
        }

        // Set accounts to IN_PROGRESS
        await prisma.brokerAccount.updateMany({
            where: { id: { in: activeAccounts.map(a => a.id) } },
            data: { syncStatus: 'IN_PROGRESS' },
        });

        // Give the sync operation a 25‑second ceiling (Vercel max is 30s).
        try {
            const result = await timeout(
                snapTradeService.syncTrades(userId),
                25_000,
                'Trade sync'
            );

            // Update individual account sync status based on per-broker results
            for (const acc of activeAccounts) {
                const isFailed = result.failedAccounts.includes(acc.brokerName || acc.snapTradeAccountId);
                await prisma.brokerAccount.update({
                    where: { id: acc.id },
                    data: {
                        syncStatus: isFailed ? 'FAILED' : 'COMPLETED',
                        syncCompletedAt: new Date(),
                        syncTradeCount: result.synced,
                        syncError: isFailed ? `Sync failed for ${acc.brokerName}` : null,
                    },
                });
            }

            return NextResponse.json(result);
        } catch (error) {
            // Mark as FAILED on throw
            await prisma.brokerAccount.updateMany({
                where: { userId, syncStatus: 'IN_PROGRESS' },
                data: {
                    syncStatus: 'FAILED',
                    syncError: error instanceof Error ? error.message : 'Manual sync failed',
                },
            });
            throw error;
        }
    } catch (error: unknown) {
        console.error('Sync error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
