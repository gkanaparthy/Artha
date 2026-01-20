import { NextRequest, NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';
import { applyRateLimit } from '@/lib/ratelimit';

/**
 * Fast broker connection sync - waits up to 20 seconds for sync to complete.
 * 
 * SERVERLESS REALITY:
 * In Vercel/serverless, execution stops when response is sent. There's no true "background".
 * We MUST wait for the sync to actually complete, but we timeout after 20s to keep UX reasonably fast.
 * 
 * Strategy:
 * - Wait for sync to complete (fetches 3 years of data)
 * - Timeout after 20 seconds to avoid user frustration
 * - If timeout: User gets partial sync, can run full sync manually later
 * 
 * This is a compromise between:
 * - User Experience: 20s is much better than 25-30s
 * - Data Completeness: Most users sync completes within 20s
 * - Reliability: We actually wait, so work completes in serverless
 */
function timeout<T>(promise: Promise<T>, ms: number, timeoutResult: T): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(timeoutResult), ms))
    ]);
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

        console.log('[Fast Sync] Starting sync for user:', session.user.id);

        // Run sync with 20-second timeout  
        // This actually waits (so it works in serverless) but keeps UX reasonably fast
        const result = await timeout(
            snapTradeService.syncTrades(session.user.id),
            20000, // 20 seconds - faster than old 25s, but enough time for most syncs
            {
                synced: 0,
                accounts: 0,
                failedAccounts: [],
                skippedTrades: 0,
                error: '__TIMEOUT__' // Sentinel value to detect timeout
            }
        );

        // Check if we timed out
        if (result.error === '__TIMEOUT__') {
            console.log('[Fast Sync] Timeout for user', session.user.id);
            return NextResponse.json({
                status: 'timeout',
                message: 'Broker connected! Trade sync is taking longer than expected. Please use "Sync Trades" button to complete your full history.',
                partial: true
            });
        }

        // Success!
        console.log('[Fast Sync] Completed for user', session.user.id, '- synced:', result.synced, 'accounts:', result.accounts);

        if (result.error) {
            return NextResponse.json({
                status: 'error',
                message: result.error,
                result
            }, { status: 500 });
        }

        return NextResponse.json({
            status: 'completed',
            message: result.synced > 0
                ? `Successfully synced ${result.synced} trades from ${result.accounts} account(s)!`
                : 'Broker connected! Click "Sync Trades" to load your trading history.',
            result
        });
    } catch (error: unknown) {
        console.error('[Fast Sync] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
