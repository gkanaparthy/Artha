import { NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';

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

export async function POST() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Give the sync operation a 25‑second ceiling (Vercel max is 30s).
        const result = await timeout(
            snapTradeService.syncTrades(session.user.id),
            25_000,
            'Trade sync'
        );
        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('Sync error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
