import { NextRequest, NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applyRateLimit } from '@/lib/ratelimit';
import { sendSyncCompleteEmail } from '@/lib/email';

const MAX_RETRIES = 5;
const EMPTY_ACCOUNT_THRESHOLD = 3; // After 3 retries with 0 trades, consider genuinely empty

/**
 * POST /api/trades/sync-retry
 *
 * Retries sync for accounts in PENDING or FAILED state.
 * Called automatically by dashboard polling (after 2 min of PENDING)
 * or manually by user clicking retry.
 *
 * Concurrency guard: skips if any account is IN_PROGRESS.
 * After EMPTY_ACCOUNT_THRESHOLD retries with 0 trades → marks COMPLETED (genuinely empty).
 */
function timeout<T>(promise: Promise<T>, ms: number, timeoutResult: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(timeoutResult), ms))
    ]);
}

export async function POST(request: NextRequest) {
    try {
        const rateLimitResponse = await applyRateLimit(request, 'sync');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // Find retryable accounts
        const retryableAccounts = await prisma.brokerAccount.findMany({
            where: {
                userId,
                disabled: false,
                syncStatus: { in: ['PENDING', 'FAILED'] },
                syncRetryCount: { lt: MAX_RETRIES },
            },
        });

        if (retryableAccounts.length === 0) {
            return NextResponse.json({ status: 'no_action', message: 'No accounts need retry' });
        }

        // Check Pro Access (skip for very recent accounts as a grace period)
        const { getSubscriptionInfo } = await import('@/lib/subscription');
        const sub = await getSubscriptionInfo(userId);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const needsProCheck = retryableAccounts.some(acc =>
            acc.createdAt < twentyFourHoursAgo && acc.syncRetryCount >= 1
        );

        if (needsProCheck && !sub.canAccessPro) {
            return NextResponse.json({
                error: 'Pro access required for trade syncing. Your trial may have ended.'
            }, { status: 402 });
        }

        // Concurrency guard: skip if any account is already syncing
        const inProgressCount = await prisma.brokerAccount.count({
            where: { userId, syncStatus: 'IN_PROGRESS' },
        });
        if (inProgressCount > 0) {
            return NextResponse.json({ status: 'skipped', message: 'Sync already in progress' });
        }

        // IDs of accounts we are about to sync
        const accountsToSyncIds = retryableAccounts.map(a => a.id);

        // Set accounts to IN_PROGRESS and increment retry count
        await prisma.brokerAccount.updateMany({
            where: { id: { in: accountsToSyncIds } },
            data: {
                syncStatus: 'IN_PROGRESS',
                syncRetryCount: { increment: 1 },
                syncError: null,
            },
        });

        console.log(`[Sync Retry] Retrying ${retryableAccounts.length} accounts for user ${userId}`);

        let result;
        try {
            // Attempt sync with 20s timeout
            result = await timeout(
                snapTradeService.syncTrades(userId),
                20000,
                { synced: 0, accounts: 0, failedAccounts: [], skippedTrades: 0, error: '__TIMEOUT__' }
            );
        } catch (syncError) {
            // Unhandled crash in syncTrades: revert to FAILED
            await prisma.brokerAccount.updateMany({
                where: { id: { in: accountsToSyncIds }, syncStatus: 'IN_PROGRESS' },
                data: { syncStatus: 'FAILED', syncError: syncError instanceof Error ? syncError.message : 'Sync crashed' },
            });
            throw syncError;
        }

        // Refresh accounts to get updated retry counts
        const updatedAccounts = await prisma.brokerAccount.findMany({
            where: { id: { in: accountsToSyncIds } },
        });

        if (result.error === '__TIMEOUT__') {
            // Timeout — set back to PENDING (not FAILED)
            await prisma.brokerAccount.updateMany({
                where: { id: { in: accountsToSyncIds }, syncStatus: 'IN_PROGRESS' },
                data: { syncStatus: 'PENDING', syncError: 'Sync timed out, will retry' },
            });
            return NextResponse.json({ status: 'timeout', synced: 0, accounts: retryableAccounts.length });
        }

        // Update individual account sync status based on per-broker results
        for (const acc of updatedAccounts) {
            const isFailed = result.failedAccounts.includes(acc.brokerName || acc.snapTradeAccountId);

            if (isFailed) {
                await prisma.brokerAccount.update({
                    where: { id: acc.id },
                    data: { syncStatus: 'FAILED', syncError: 'Broker returned error during retry' },
                });
            } else if (result.synced > 0 || acc.syncRetryCount >= EMPTY_ACCOUNT_THRESHOLD) {
                // Either trades found OR enough retries reached to consider genuinely empty
                await prisma.brokerAccount.update({
                    where: { id: acc.id },
                    data: {
                        syncStatus: 'COMPLETED',
                        syncCompletedAt: new Date(),
                        syncTradeCount: result.synced,
                        syncError: null,
                    },
                });
                console.log(`[Sync Retry] Account ${acc.id} marked COMPLETED (synced: ${result.synced}, retries: ${acc.syncRetryCount})`);
            } else {
                // 0 trades found but not yet at threshold
                await prisma.brokerAccount.update({
                    where: { id: acc.id },
                    data: { syncStatus: 'PENDING' },
                });
            }
        }

        if (result.synced > 0 && session.user.email) {
            sendSyncCompleteEmail(session.user.email, result.synced, result.accounts)
                .catch(err => console.error('[Sync Retry] Email failed:', err));
        }

        return NextResponse.json({
            status: result.synced > 0 ? 'completed' : 'pending',
            synced: result.synced,
            accounts: retryableAccounts.length
        });

    } catch (error) {
        console.error('[Sync Retry] Error:', error);
        // Fallback safety: try to clear any stuck IN_PROGRESS accounts for this user
        try {
            const session = await auth();
            if (session?.user?.id) {
                await prisma.brokerAccount.updateMany({
                    where: { userId: session.user.id, syncStatus: 'IN_PROGRESS' },
                    data: { syncStatus: 'FAILED', syncError: 'System error during retry' },
                });
            }
        } catch (e) { /* ignore */ }

        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
