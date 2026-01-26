import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

import { calculateMetricsFromTrades } from '@/lib/analytics/fifo';
import { FilterOptions } from '@/types/trading';

// ... (keep surrounding code) ...

// Use the shared implementation
// but we need to format the result to match the expected API output
// The shared function returns { filteredTrades, filteredOpenPositions, unrealizedCost }
// We need to implement the aggregation logic here or move it to the shared file.
// Ideally, the aggregation logic (lines 504-649) should also be shared or kept here if specific to this view.
// Given the complexity, let's keep the aggregation here for now but use the shared FIFO engine.

function getMetrics(trades: any[], filters?: any) {
    const { filteredTrades, filteredOpenPositions, unrealizedCost } = calculateMetricsFromTrades(trades, filters);

    // Calculate metrics from filtered trades
    const winningTrades = filteredTrades.filter(t => t.pnl > 0);
    const losingTrades = filteredTrades.filter(t => t.pnl < 0);

    const totalClosedTrades = filteredTrades.length;
    const winRate = totalClosedTrades > 0 ? (winningTrades.length / totalClosedTrades) * 100 : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

    const avgWinPct = winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => {
            const costBasis = t.entryPrice * t.quantity * t.multiplier;
            return sum + (costBasis > 0 ? (t.pnl / costBasis) * 100 : 0);
        }, 0) / winningTrades.length
        : 0;
    const avgLossPct = losingTrades.length > 0
        ? Math.abs(losingTrades.reduce((sum, t) => {
            const costBasis = t.entryPrice * t.quantity * t.multiplier;
            return sum + (costBasis > 0 ? (t.pnl / costBasis) * 100 : 0);
        }, 0) / losingTrades.length)
        : 0;

    const netPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map(t => t.pnl))
        : 0;
    const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map(t => t.pnl))
        : 0;

    const avgTrade = totalClosedTrades > 0 ? netPnL / totalClosedTrades : 0;

    const sortedClosedTrades = [...filteredTrades].sort(
        (a, b) => a.closedAt.getTime() - b.closedAt.getTime()
    );

    let cumulative = 0;
    const cumulativePnL = sortedClosedTrades.map((t) => {
        cumulative += t.pnl;
        return {
            date: t.closedAt.toISOString().split('T')[0],
            pnl: Math.round(t.pnl * 100) / 100,
            cumulative: Math.round(cumulative * 100) / 100,
            symbol: t.symbol,
        };
    });

    const monthlyPerformance = new Map<string, number>();
    for (const trade of sortedClosedTrades) {
        const monthKey = trade.closedAt.toISOString().slice(0, 7);
        monthlyPerformance.set(monthKey, (monthlyPerformance.get(monthKey) || 0) + trade.pnl);
    }
    const monthlyData = Array.from(monthlyPerformance.entries())
        .map(([month, pnl]) => ({
            month,
            pnl: Math.round(pnl * 100) / 100,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    const symbolPerformance = new Map<string, { pnl: number; trades: number; wins: number }>();
    for (const trade of filteredTrades) {
        const existing = symbolPerformance.get(trade.symbol) || { pnl: 0, trades: 0, wins: 0 };
        existing.pnl += trade.pnl;
        existing.trades += 1;
        if (trade.pnl > 0) existing.wins += 1;
        symbolPerformance.set(trade.symbol, existing);
    }
    const symbolData = Array.from(symbolPerformance.entries())
        .map(([symbol, data]) => ({
            symbol,
            pnl: Math.round(data.pnl * 100) / 100,
            trades: data.trades,
            winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
        }))
        .sort((a, b) => b.pnl - a.pnl);

    return {
        netPnL: Math.round(netPnL * 100) / 100,
        winRate: Math.round(winRate * 10) / 10,
        totalTrades: totalClosedTrades,
        avgWin: Math.round(avgWin * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        avgWinPct: Math.round(avgWinPct * 10) / 10,
        avgLossPct: Math.round(avgLossPct * 10) / 10,
        profitFactor: profitFactor === Infinity ? null : Math.round(profitFactor * 100) / 100,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        largestWin: Math.round(largestWin * 100) / 100,
        largestLoss: Math.round(largestLoss * 100) / 100,
        avgTrade: Math.round(avgTrade * 100) / 100,
        unrealizedCost: Math.round(unrealizedCost * 100) / 100,
        mtdPnL: (() => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            let sum = 0;
            for (const t of filteredTrades) {
                const closed = new Date(t.closedAt);
                if (closed >= startOfMonth) sum += t.pnl;
            }
            return Math.round(sum * 100) / 100;
        })(),
        ytdPnL: (() => {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            let sum = 0;
            for (const t of filteredTrades) {
                const closed = new Date(t.closedAt);
                if (closed >= startOfYear) sum += t.pnl;
            }
            return Math.round(sum * 100) / 100;
        })(),
        openPositionsCount: filteredOpenPositions.length,
        closedTrades: sortedClosedTrades.map(t => ({
            ...t,
            closedAt: t.closedAt.toISOString(),
            openedAt: t.openedAt.toISOString(),
            pnl: Math.round(t.pnl * 100) / 100,
        })),
        openPositions: filteredOpenPositions.map(p => ({
            ...p,
            openedAt: p.openedAt.toISOString(),
            entryPrice: Math.round(p.entryPrice * 100) / 100,
            currentValue: Math.round(p.currentValue * 100) / 100,
        })),
        cumulativePnL,
        monthlyData,
        symbolData,
    };
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const symbol = searchParams.get('symbol');
        const accountId = searchParams.get('accountId');
        const assetType = searchParams.get('assetType');
        const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean);
        const tagFilterMode = searchParams.get('tagFilterMode') as 'any' | 'all' || 'any';

        // IMPORTANT: Fetch ALL trades for FIFO lot matching
        // Date filters are applied AFTER FIFO processing on the closedTrades output
        // This ensures positions that span date boundaries are correctly matched
        const trades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: session.user.id
                },
                action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'] }
            },
            include: {
                account: {
                    select: { brokerName: true, id: true }
                }
            },
            orderBy: [
                { timestamp: 'asc' },
                { createdAt: 'asc' }, // SnapTrade returns in order, so import order = execution order
                { id: 'asc' } // Fallback
            ]
        });

        // Fetch position tags for the user
        const positionTags = await prisma.positionTag.findMany({
            where: { userId: session.user.id },
            include: { tagDefinition: true }
        });

        // Map positionKey to its tag definition IDs
        const ptMap = new Map<string, string[]>();
        const defMap = new Map<string, any>();
        positionTags.forEach((pt: any) => {
            if (!ptMap.has(pt.positionKey)) ptMap.set(pt.positionKey, []);
            ptMap.get(pt.positionKey)!.push(pt.tagDefinitionId);
            if (!defMap.has(pt.tagDefinitionId)) {
                defMap.set(pt.tagDefinitionId, pt.tagDefinition);
            }
        });

        const filters: FilterOptions = {};
        if (startDate) filters.startDate = new Date(startDate + 'T00:00:00');
        if (endDate) {
            filters.endDate = new Date(endDate + 'T23:59:59');
        }
        if (symbol) filters.symbol = symbol;
        if (accountId) filters.accountId = accountId;
        if (assetType) filters.assetType = assetType;
        if (tagIds && tagIds.length > 0) {
            filters.tagIds = tagIds;
            filters.tagFilterMode = tagFilterMode;
        }
        (filters as any).positionTags = ptMap;
        (filters as any).tagDefs = defMap;

        const metrics = getMetrics(trades, Object.keys(filters).length > 0 ? filters : undefined);

        return NextResponse.json(metrics);

    } catch (error: unknown) {
        console.error('Metrics error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
