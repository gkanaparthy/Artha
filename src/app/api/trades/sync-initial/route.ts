import { NextRequest, NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applyRateLimit } from '@/lib/ratelimit';
import { sendSyncCompleteEmail } from '@/lib/email';

/**
 * POST /api/trades/sync-initial
 *
 * Called immediately after broker connection. Designed to be fast (< 5s typical, 15s max).
 * 1. Discovers broker accounts (fast)
 * 2. Sets new accounts to PENDING sync status
 * 3. Attempts a quick sync with 15s timeout
 * 4. If trades found → COMPLETED; if 0 trades → stays PENDING for webhook
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
        console.log('[Sync Initial] Starting for user:', userId);

        // Step 1: Discover accounts (fast, ~1-2s)
        const accountsBefore = await prisma.brokerAccount.findMany({
            where: { userId },
            select: { id: true, snapTradeAccountId: true },
        });
        const beforeIds = new Set(accountsBefore.map(a => a.snapTradeAccountId));

        const discovery = await snapTradeService.syncAccounts(userId);
        if (discovery.error) {
            return NextResponse.json({
                status: 'failed',
                message: discovery.error,
                accounts: 0,
                synced: 0,
            }, { status: 500 });
        }

        // Step 2: Mark newly created or re-connected accounts as IN_PROGRESS
        const accountsAfter = await prisma.brokerAccount.findMany({
            where: { userId },
            select: { id: true, snapTradeAccountId: true, disabled: true, brokerName: true },
        });

        const accountsToSyncIds: string[] = [];

        for (const acc of accountsAfter) {
            const isNew = !beforeIds.has(acc.snapTradeAccountId);
            // Only mark accounts that are genuinely new or were re-enabled (not already active)
            const existedBefore = accountsBefore.some(a => a.snapTradeAccountId === acc.snapTradeAccountId);

            if (isNew || (acc.disabled === false && !existedBefore)) {
                await prisma.brokerAccount.update({
                    where: { id: acc.id },
                    data: {
                        syncStatus: 'IN_PROGRESS', // Set to IN_PROGRESS now to prevent webhook race
                        syncStartedAt: new Date(),
                        syncRetryCount: 0,
                        syncError: null,
                    },
                });
                accountsToSyncIds.push(acc.id);
            }
        }

        // Step 3: Attempt quick sync with 30s timeout
        let result;
        try {
            result = await timeout(
                snapTradeService.syncTrades(userId),
                30000,
                { synced: 0, accounts: 0, failedAccounts: [], skippedTrades: 0, error: '__TIMEOUT__' }
            );
        } catch (syncError) {
            // Unhandled crash: revert accounts
            await prisma.brokerAccount.updateMany({
                where: { id: { in: accountsToSyncIds }, syncStatus: 'IN_PROGRESS' },
                data: { syncStatus: 'FAILED', syncError: syncError instanceof Error ? syncError.message : 'Sync crashed' },
            });
            throw syncError;
        }

        // Handle timeout — set back to PENDING, webhook will handle
        if (result.error === '__TIMEOUT__') {
            console.log('[Sync Initial] Timeout for user', userId, '- reverting to PENDING for webhook');
            await prisma.brokerAccount.updateMany({
                where: { id: { in: accountsToSyncIds }, syncStatus: 'IN_PROGRESS' },
                data: { syncStatus: 'PENDING' },
            });

            return NextResponse.json({
                status: 'pending',
                message: 'Broker connected! Your trades are being prepared...',
                accounts: discovery.accounts,
                synced: 0,
            });
        }

        // Handle real error
        if (result.error && result.error !== '__TIMEOUT__') {
            await prisma.brokerAccount.updateMany({
                where: { id: { in: accountsToSyncIds } },
                data: { syncStatus: 'FAILED', syncError: result.error },
            });

            return NextResponse.json({
                status: 'failed',
                message: result.error,
                accounts: discovery.accounts,
                synced: 0,
            }, { status: 500 });
        }

        // Update individual account sync status based on per-broker results
        for (const acc of accountsAfter) {
            if (!accountsToSyncIds.includes(acc.id)) continue;

            const isFailed = result.failedAccounts.includes(acc.brokerName || acc.snapTradeAccountId);

            await prisma.brokerAccount.update({
                where: { id: acc.id },
                data: {
                    syncStatus: isFailed ? 'FAILED' : 'COMPLETED',
                    syncCompletedAt: new Date(),
                    syncTradeCount: result.synced, // This is aggregate, but it's better than nothing
                    syncError: isFailed ? `Initial sync failed for ${acc.brokerName}` : null,
                },
            });
        }

        if (result.synced > 0) {
            // Send email
            if (session.user.email) {
                sendSyncCompleteEmail(session.user.email, result.synced, result.accounts)
                    .catch(err => console.error('[Sync Initial] Email failed:', err));
            }

            console.log('[Sync Initial] Completed with', result.synced, 'trades');
            return NextResponse.json({
                status: 'completed',
                message: `${result.synced} trades imported!`,
                accounts: result.accounts,
                synced: result.synced,
            });
        }

        // 0 trades but no error — broker data not ready yet, stay PENDING
        console.log('[Sync Initial] 0 trades, staying PENDING for webhook');
        await prisma.brokerAccount.updateMany({
            where: { id: { in: accountsToSyncIds }, syncStatus: 'IN_PROGRESS' },
            data: { syncStatus: 'PENDING' },
        });

        return NextResponse.json({
            status: 'pending',
            message: 'Broker connected! Your trades are being prepared...',
            accounts: discovery.accounts,
            synced: 0,
        });
    } catch (error) {
        console.error('[Sync Initial] Error:', error);
        // Fallback safety
        try {
            const session = await auth();
            if (session?.user?.id) {
                await prisma.brokerAccount.updateMany({
                    where: { userId: session.user.id, syncStatus: 'IN_PROGRESS' },
                    data: { syncStatus: 'FAILED', syncError: 'System error during initial sync' },
                });
            }
        } catch (e) { /* ignore */ }

        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ status: 'failed', message, accounts: 0, synced: 0 }, { status: 500 });
    }
}

export const runtime = "nodejs";
export const maxDuration = 45;
