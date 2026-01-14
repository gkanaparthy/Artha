import { NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/positions
 * Returns current positions with live market prices and unrealized P&L.
 * Fetches both stock and option positions from all connected accounts.
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await snapTradeService.getPositions(session.user.id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Calculate totals
        const totalMarketValue = result.positions.reduce(
            (sum, p) => sum + (p.marketValue || 0),
            0
        );
        const totalUnrealizedPnl = result.positions.reduce(
            (sum, p) => sum + (p.openPnl || 0),
            0
        );

        return NextResponse.json({
            positions: result.positions,
            summary: {
                totalPositions: result.positions.length,
                totalMarketValue: Math.round(totalMarketValue * 100) / 100,
                totalUnrealizedPnl: Math.round(totalUnrealizedPnl * 100) / 100,
                stockPositions: result.positions.filter(p => p.type === 'STOCK').length,
                optionPositions: result.positions.filter(p => p.type === 'OPTION').length,
            },
        });

    } catch (error: unknown) {
        console.error('Positions error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
