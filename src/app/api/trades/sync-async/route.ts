import { NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';

/**
 * Async trade sync endpoint - Starts sync in background and returns immediately.
 * Used for initial broker connection to avoid user frustration from long waits.
 * 
 * The sync continues in the background, and the user can see trades appear gradually
 * in their dashboard by refreshing or via polling.
 */
export async function POST() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Start sync in background (non-blocking)
        // We don't await this - it runs independently
        snapTradeService.syncTrades(session.user.id)
            .then((result) => {
                console.log('[Async Sync] Completed for user', session.user.id, 'Result:', result);
            })
            .catch((error) => {
                console.error('[Async Sync] Failed for user', session.user.id, error);
            });

        // Return immediately to user
        return NextResponse.json({
            status: 'started',
            message: 'Trade sync started in background. Trades will appear shortly.',
        });
    } catch (error: unknown) {
        console.error('Async sync error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
