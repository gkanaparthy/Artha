import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateMetricsFromTrades } from '@/lib/analytics/fifo';
import { FilterOptions } from '@/types/trading';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const accountId = searchParams.get('accountId');

        // 1. Fetch ALL relevant trades for correct FIFO
        // Unlike the previous implementation, we fetch ALL history to calculate cost basis correctly
        // Then we filter the OUTPUT by date.
        const whereClause: any = {
            account: { userId: session.user.id },
            action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'] }
        };

        if (accountId && accountId !== 'all') whereClause.accountId = accountId;

        const trades = await prisma.trade.findMany({
            where: whereClause,
            include: {
                account: {
                    select: { brokerName: true, id: true }
                }
            },
            orderBy: [
                { timestamp: 'asc' },
                { createdAt: 'asc' },
                { id: 'asc' }
            ]
        });

        // 2. Fetch PositionTags
        const positionTags = await prisma.positionTag.findMany({
            where: { userId: session.user.id },
            include: { tagDefinition: true }
        });

        const ptMap = new Map<string, string[]>();
        const defMap = new Map<string, any>();

        positionTags.forEach((pt: any) => {
            // We need to map positionKey robustly
            if (!ptMap.has(pt.positionKey)) ptMap.set(pt.positionKey, []);
            ptMap.get(pt.positionKey)!.push(pt.tagDefinitionId);

            if (!defMap.has(pt.tagDefinitionId)) {
                defMap.set(pt.tagDefinitionId, pt.tagDefinition);
            }
        });

        const filters: FilterOptions = {};
        if (startDate) filters.startDate = new Date(startDate + 'T00:00:00');
        if (endDate) filters.endDate = new Date(endDate + 'T23:59:59');
        (filters as any).positionTags = ptMap;
        (filters as any).tagDefs = defMap;

        // 3. Use robust FIFO engine
        const { filteredTrades, filteredOpenPositions } = calculateMetricsFromTrades(trades, filters);

        // 4. Aggregate by Tag
        const tagAnalytics: Record<string, any> = {};

        // Helper to aggregate stats
        const aggregate = (item: any, pnl: number, isClosed: boolean) => {
            if (!item.tags || item.tags.length === 0) return;

            for (const tag of item.tags) {
                if (!tagAnalytics[tag.id]) {
                    tagAnalytics[tag.id] = {
                        id: tag.id,
                        name: tag.name,
                        color: tag.color,
                        category: tag.category,
                        totalPnL: 0,
                        tradeCount: 0,
                        winCount: 0,
                        lossCount: 0,
                        avgPnL: 0,
                    };
                }

                const stats = tagAnalytics[tag.id];
                stats.totalPnL += pnl;
                stats.tradeCount += 1;
                if (isClosed) {
                    if (pnl > 0) stats.winCount += 1;
                    else if (pnl < 0) stats.lossCount += 1;
                }
            }
        };

        // Aggregate closed trades
        for (const trade of filteredTrades) {
            aggregate(trade, trade.pnl, true);
        }

        // Aggregate open positions (Bug #29)
        for (const pos of filteredOpenPositions) {
            // For now, open positions have 0 realized P&L 
            // but we count them in tradeCount
            aggregate(pos, 0, false);
        }

        // Finalize stats
        const result = Object.values(tagAnalytics).map(stats => ({
            ...stats,
            avgPnL: stats.tradeCount > 0 ? stats.totalPnL / stats.tradeCount : 0,
            winRate: stats.tradeCount > 0 ? (stats.winCount / stats.tradeCount) * 100 : 0,
            // Format P&L for display
            totalPnL: Math.round(stats.totalPnL * 100) / 100
        })).sort((a, b) => b.totalPnL - a.totalPnL);

        return NextResponse.json({ analytics: result });

    } catch (error: any) {
        console.error('Tag analytics error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
