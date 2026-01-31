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
        // Rate limit check: 30 per hour
        const rateLimitResponse = await applyRateLimit(request, 'sync_recent');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[Recent Sync API] Starting for user ${session.user.id}`);
        const result = await snapTradeService.syncRecentOrders(session.user.id);

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('Recent sync error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export const runtime = "nodejs";
export const maxDuration = 25;
