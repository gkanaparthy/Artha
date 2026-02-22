import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

import { calculateMetricsFromTrades } from '@/lib/analytics/fifo';
import { FilterOptions, TradeInput } from '@/types/trading';
import {
    buildPositionClosedUnits,
    computeTradeRisk,
    getFuturesMultiplierWarning,
} from '@/lib/analytics/r-multiple';

type TagDefinitionMapValue = {
    id: string;
    name: string;
    color: string;
    category: string;
    icon: string | null;
};

type MetricsFilterOptions = FilterOptions & {
    positionTags?: Map<string, string[]>;
    tagDefs?: Map<string, TagDefinitionMapValue>;
};

// ... (keep surrounding code) ...

// Use the shared implementation
// but we need to format the result to match the expected API output
// The shared function returns { filteredTrades, filteredOpenPositions, unrealizedCost }
// We need to implement the aggregation logic here or move it to the shared file.
// Ideally, the aggregation logic (lines 504-649) should also be shared or kept here if specific to this view.
// Given the complexity, let's keep the aggregation here for now but use the shared FIFO engine.

function getMetrics(
    trades: TradeInput[],
    filters?: MetricsFilterOptions,
    positionRiskMap: Map<string, number> = new Map(),
    tradeGroupRiskMap: Map<string, number> = new Map()
) {
    const {
        filteredTrades,
        filteredOpenPositions,
        unrealizedCost,
        allClosedTrades,
    } = calculateMetricsFromTrades(trades, filters);

    const round2 = (value: number) => Math.round(value * 100) / 100;
    const round1 = (value: number) => Math.round(value * 10) / 10;

    // Allocate position-level risk using all CLOSED lots only.
    // This keeps each closed trade's R stable under winners/losers/date filters.
    const combinedRiskMap = new Map<string, number>(tradeGroupRiskMap);
    for (const [positionKey, risk] of positionRiskMap.entries()) {
        combinedRiskMap.set(positionKey, risk);
    }
    const positionUnits = buildPositionClosedUnits(allClosedTrades || [], combinedRiskMap);

    const tradesWithR = filteredTrades.map((trade) => {
        const risk = computeTradeRisk(trade, positionRiskMap, positionUnits, tradeGroupRiskMap);

        return {
            ...trade,
            rMultiple: risk.rMultiple,
            initialRiskUsd: risk.initialRiskUsd,
            allocatedRiskUsd: risk.allocatedRiskUsd,
            riskSource: risk.riskSource,
            futuresMultiplierWarning: getFuturesMultiplierWarning(trade),
        };
    });

    // Calculate metrics from filtered trades
    const winningTrades = tradesWithR.filter(t => t.pnl > 0);
    const losingTrades = tradesWithR.filter(t => t.pnl < 0);

    const totalClosedTrades = tradesWithR.length;
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

    const netPnL = tradesWithR.reduce((sum, t) => sum + t.pnl, 0);
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map(t => t.pnl))
        : 0;
    const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map(t => t.pnl))
        : 0;

    const avgTrade = totalClosedTrades > 0 ? netPnL / totalClosedTrades : 0;

    const sortedClosedTrades = [...tradesWithR].sort(
        (a, b) => a.closedAt.getTime() - b.closedAt.getTime()
    );

    const rTrades = sortedClosedTrades.flatMap((t) => {
        if (typeof t.rMultiple !== 'number' || !Number.isFinite(t.rMultiple)) {
            return [];
        }
        return [{ ...t, rMultiple: t.rMultiple }];
    });
    const winningRTrades = rTrades.filter(t => t.rMultiple > 0);
    const losingRTrades = rTrades.filter(t => t.rMultiple < 0);
    const netR = rTrades.reduce((sum, t) => sum + t.rMultiple, 0);
    const avgR = rTrades.length > 0 ? netR / rTrades.length : null;
    const avgWinR = winningRTrades.length > 0
        ? winningRTrades.reduce((sum, t) => sum + t.rMultiple, 0) / winningRTrades.length
        : null;
    const avgLossR = losingRTrades.length > 0
        ? losingRTrades.reduce((sum, t) => sum + t.rMultiple, 0) / losingRTrades.length
        : null;
    const maxR = rTrades.length > 0 ? Math.max(...rTrades.map(t => t.rMultiple)) : null;
    const minR = rTrades.length > 0 ? Math.min(...rTrades.map(t => t.rMultiple)) : null;
    const rCoverage = totalClosedTrades > 0 ? (rTrades.length / totalClosedTrades) * 100 : 0;
    const monthlyRMap = new Map<string, number>();
    for (const trade of rTrades) {
        const monthKey = trade.closedAt.toISOString().slice(0, 7);
        monthlyRMap.set(monthKey, (monthlyRMap.get(monthKey) || 0) + trade.rMultiple);
    }
    const monthlyR = Array.from(monthlyRMap.entries())
        .map(([month, r]) => ({ month, r: round2(r) }))
        .sort((a, b) => a.month.localeCompare(b.month));

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
    for (const trade of tradesWithR) {
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
        netPnL: round2(netPnL),
        winRate: round1(winRate),
        totalTrades: totalClosedTrades,
        avgWin: round2(avgWin),
        avgLoss: round2(avgLoss),
        avgWinPct: round1(avgWinPct),
        avgLossPct: round1(avgLossPct),
        profitFactor: profitFactor === Infinity ? null : round2(profitFactor),
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        largestWin: round2(largestWin),
        largestLoss: round2(largestLoss),
        avgTrade: round2(avgTrade),
        netR: rTrades.length > 0 ? round2(netR) : null,
        avgR: avgR === null ? null : round2(avgR),
        avgWinR: avgWinR === null ? null : round2(avgWinR),
        avgLossR: avgLossR === null ? null : round2(avgLossR),
        maxR: maxR === null ? null : round2(maxR),
        minR: minR === null ? null : round2(minR),
        rCoverage: round1(rCoverage),
        rMultiple: rTrades.length > 0 ? {
            coverage: round1(rCoverage),
            coveredTrades: rTrades.length,
            totalTrades: totalClosedTrades,
            netR: round2(netR),
            avgR: avgR === null ? 0 : round2(avgR),
            avgWinR: avgWinR === null ? null : round2(avgWinR),
            avgLossR: avgLossR === null ? null : round2(avgLossR),
            maxR: maxR === null ? 0 : round2(maxR),
            minR: minR === null ? 0 : round2(minR),
            monthlyR,
        } : null,
        unrealizedCost: round2(unrealizedCost),
        mtdPnL: (() => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            let sum = 0;
            for (const t of tradesWithR) {
                const closed = new Date(t.closedAt);
                if (closed >= startOfMonth) sum += t.pnl;
            }
            return round2(sum);
        })(),
        ytdPnL: (() => {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            let sum = 0;
            for (const t of tradesWithR) {
                const closed = new Date(t.closedAt);
                if (closed >= startOfYear) sum += t.pnl;
            }
            return round2(sum);
        })(),
        openPositionsCount: filteredOpenPositions.length,
        closedTrades: sortedClosedTrades.map(t => ({
            ...t,
            closedAt: t.closedAt.toISOString(),
            openedAt: t.openedAt.toISOString(),
            pnl: round2(t.pnl),
            rMultiple: t.rMultiple === null || t.rMultiple === undefined ? null : round2(t.rMultiple),
            initialRiskUsd: t.initialRiskUsd === null || t.initialRiskUsd === undefined ? null : round2(t.initialRiskUsd),
            allocatedRiskUsd: t.allocatedRiskUsd === null || t.allocatedRiskUsd === undefined ? null : round2(t.allocatedRiskUsd),
            riskSource: t.riskSource ?? null,
            futuresMultiplierWarning: t.futuresMultiplierWarning ?? null,
        })),
        openPositions: filteredOpenPositions.map(p => ({
            ...p,
            openedAt: p.openedAt.toISOString(),
            entryPrice: round2(p.entryPrice),
            currentValue: round2(p.currentValue),
            expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
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
        const status = searchParams.get('status');
        const action = searchParams.get('action');
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
        const positionRisks = await prisma.positionRisk.findMany({
            where: { userId: session.user.id },
            select: {
                positionKey: true,
                initialRiskUsd: true,
            },
        });
        const tradeGroups = await prisma.tradeGroup.findMany({
            where: {
                userId: session.user.id,
                maxLoss: { not: null },
            },
            select: {
                maxLoss: true,
                legs: {
                    select: {
                        trade: {
                            select: { positionKey: true },
                        },
                    },
                },
            },
        });

        // Map positionKey to its tag definition IDs
        const ptMap = new Map<string, string[]>();
        const defMap = new Map<string, TagDefinitionMapValue>();
        positionTags.forEach((pt) => {
            if (!ptMap.has(pt.positionKey)) ptMap.set(pt.positionKey, []);
            ptMap.get(pt.positionKey)!.push(pt.tagDefinitionId);
            if (!defMap.has(pt.tagDefinitionId)) {
                defMap.set(pt.tagDefinitionId, pt.tagDefinition);
            }
        });
        const riskMap = new Map<string, number>();
        positionRisks.forEach((risk) => {
            riskMap.set(risk.positionKey, risk.initialRiskUsd);
        });
        const tradeGroupRiskMap = new Map<string, number>();
        for (const group of tradeGroups) {
            const maxLoss = Math.abs(group.maxLoss ?? 0);
            if (maxLoss <= 0) continue;

            for (const leg of group.legs) {
                const positionKey = leg.trade.positionKey;
                if (!positionKey) continue;
                const existing = tradeGroupRiskMap.get(positionKey) || 0;
                tradeGroupRiskMap.set(positionKey, Math.max(existing, maxLoss));
            }
        }

        const filters: MetricsFilterOptions = {};
        if (startDate) filters.startDate = new Date(startDate + 'T00:00:00');
        if (endDate) {
            filters.endDate = new Date(endDate + 'T23:59:59');
        }
        if (symbol) filters.symbol = symbol;
        if (accountId) filters.accountId = accountId;
        if (assetType) filters.assetType = assetType;
        if (status) filters.status = status;
        if (action) filters.action = action;
        if (tagIds && tagIds.length > 0) {
            filters.tagIds = tagIds;
            filters.tagFilterMode = tagFilterMode;
        }
        filters.positionTags = ptMap;
        filters.tagDefs = defMap;

        const metrics = getMetrics(
            trades,
            Object.keys(filters).length > 0 ? filters : undefined,
            riskMap,
            tradeGroupRiskMap
        );

        return NextResponse.json(metrics);

    } catch (error: unknown) {
        console.error('Metrics error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
