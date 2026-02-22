import { prisma } from "@/lib/prisma";
import { calculateMetricsFromTrades } from "@/lib/analytics/fifo";
import { buildPositionClosedUnits, computeTradeRisk } from "@/lib/analytics/r-multiple";
import { InsightDataSummary } from "@/types/insights";
import { FilterOptions } from "@/types/trading";

export class InsightsDataService {
    async getInsightDataSummary(userId: string, filters: FilterOptions = {}): Promise<InsightDataSummary> {
        // 1. Fetch trades
        const where: any = {
            account: { userId },
            action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'] }
        };

        if (filters.accountId && filters.accountId !== 'all') {
            const accountIds = Array.isArray(filters.accountId)
                ? filters.accountId
                : filters.accountId.split(',').filter(Boolean);

            if (accountIds.length > 0) {
                where.accountId = { in: accountIds };
            }
        }

        // We can safely filter by endDate at the SQL level
        if (filters.endDate) {
            where.timestamp = { lte: filters.endDate };
        }

        const trades = await prisma.trade.findMany({
            where,
            orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
        });

        // 2. Fetch position tags
        const positionTags = await prisma.positionTag.findMany({
            where: { userId },
            include: { tagDefinition: true }
        });
        const positionRisks = await prisma.positionRisk.findMany({
            where: { userId },
            select: {
                positionKey: true,
                initialRiskUsd: true,
            },
        });
        const tradeGroups = await prisma.tradeGroup.findMany({
            where: {
                userId,
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

        const ptMap = new Map<string, string[]>();
        const defMap = new Map<string, any>();
        positionTags.forEach((pt: any) => {
            if (!ptMap.has(pt.positionKey)) ptMap.set(pt.positionKey, []);
            ptMap.get(pt.positionKey)!.push(pt.tagDefinitionId);
            if (!defMap.has(pt.tagDefinitionId)) {
                defMap.set(pt.tagDefinitionId, pt.tagDefinition);
            }
        });

        const enrichedFilters = {
            ...filters,
            positionTags: ptMap,
            tagDefs: defMap
        };
        const positionRiskMap = new Map<string, number>();
        positionRisks.forEach((risk) => {
            positionRiskMap.set(risk.positionKey, risk.initialRiskUsd);
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

        // 3. Process with FIFO engine
        const { filteredTrades, allClosedTrades } = calculateMetricsFromTrades(trades, enrichedFilters);
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
            };
        });

        // 4. Calculations
        const winningTrades = tradesWithR.filter(t => t.pnl > 0);
        const losingTrades = tradesWithR.filter(t => t.pnl < 0);
        const netPnL = tradesWithR.reduce((sum, t) => sum + t.pnl, 0);
        const round2 = (value: number) => Math.round(value * 100) / 100;
        const round1 = (value: number) => Math.round(value * 10) / 10;

        // Profit Factor
        const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? null : 0);

        // Max Drawdown
        let maxDrawdown = 0;
        let peakPnL = 0;
        let currentPnL = 0;
        const sortedTrades = [...tradesWithR].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
        for (const t of sortedTrades) {
            currentPnL += t.pnl;
            if (currentPnL > peakPnL) peakPnL = currentPnL;
            const dd = peakPnL - currentPnL;
            if (dd > maxDrawdown) maxDrawdown = dd;
        }

        // Avg Holding Period (simple version)
        let totalHoldingTime = 0;
        for (const t of tradesWithR) {
            totalHoldingTime += t.closedAt.getTime() - t.openedAt.getTime();
        }
        const avgHoldingPeriodMs = tradesWithR.length > 0 ? totalHoldingTime / tradesWithR.length : 0;
        const hours = Math.floor(avgHoldingPeriodMs / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        const avgHoldingPeriod = days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`;

        // Streaks
        let winStreak = 0;
        let lossStreak = 0;
        let currentWinStreak = 0;
        let currentLossStreak = 0;
        for (const t of sortedTrades) {
            if (t.pnl > 0) {
                currentWinStreak++;
                currentLossStreak = 0;
                if (currentWinStreak > winStreak) winStreak = currentWinStreak;
            } else if (t.pnl < 0) {
                currentLossStreak++;
                currentWinStreak = 0;
                if (currentLossStreak > lossStreak) lossStreak = currentLossStreak;
            }
        }

        // Patterns
        const dayOfWeekPerformance: Record<string, number> = {};
        const monthlyTrend: Record<string, number> = {};
        const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (const t of tradesWithR) {
            const day = daysArr[t.closedAt.getDay()];
            dayOfWeekPerformance[day] = (dayOfWeekPerformance[day] || 0) + t.pnl;

            const month = t.closedAt.toISOString().slice(0, 7);
            monthlyTrend[month] = (monthlyTrend[month] || 0) + t.pnl;
        }

        // Top Symbols
        const symbolsMap = new Map<string, { pnl: number; trades: number; wins: number }>();
        for (const t of tradesWithR) {
            const s = symbolsMap.get(t.symbol) || { pnl: 0, trades: 0, wins: 0 };
            s.pnl += t.pnl;
            s.trades++;
            if (t.pnl > 0) s.wins++;
            symbolsMap.set(t.symbol, s);
        }
        const topSymbols = Array.from(symbolsMap.entries())
            .map(([symbol, s]) => ({
                symbol,
                pnl: Math.round(s.pnl * 100) / 100,
                trades: s.trades,
                winRate: s.wins / s.trades
            }))
            .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
            .slice(0, 10);

        // Tag Insights
        const tagInsightsMap = new Map<string, { category: string; name: string; pnl: number; trades: number; wins: number }>();
        for (const t of tradesWithR) {
            if (!t.positionKey) continue;
            const tags = ptMap.get(t.positionKey) || [];
            for (const tagId of tags) {
                const def = enrichedFilters.tagDefs.get(tagId);
                if (def) {
                    const key = `${def.category}:${def.name}`;
                    const ti = tagInsightsMap.get(key) || { category: def.category, name: def.name, pnl: 0, trades: 0, wins: 0 };
                    ti.pnl += t.pnl;
                    ti.trades++;
                    if (t.pnl > 0) ti.wins++;
                    tagInsightsMap.set(key, ti);
                }
            }
        }
        const tagInsightsArr = Array.from(tagInsightsMap.values())
            .map(ti => ({
                ...ti,
                totalPnL: Math.round(ti.pnl * 100) / 100,
                tradeCount: ti.trades,
                winRate: ti.wins / ti.trades
            }))
            .sort((a, b) => b.totalPnL - a.totalPnL)
            .slice(0, 20);

        const rTrades = sortedTrades.flatMap((t) => {
            if (typeof t.rMultiple !== "number" || !Number.isFinite(t.rMultiple)) return [];
            return [{ ...t, rMultiple: t.rMultiple }];
        });
        const winningRTrades = rTrades.filter((t) => t.rMultiple > 0);
        const losingRTrades = rTrades.filter((t) => t.rMultiple < 0);
        const netR = rTrades.reduce((sum, t) => sum + t.rMultiple, 0);
        const avgR = rTrades.length > 0 ? netR / rTrades.length : null;
        const avgWinR = winningRTrades.length > 0
            ? winningRTrades.reduce((sum, t) => sum + t.rMultiple, 0) / winningRTrades.length
            : null;
        const avgLossR = losingRTrades.length > 0
            ? losingRTrades.reduce((sum, t) => sum + t.rMultiple, 0) / losingRTrades.length
            : null;
        const rCoverage = tradesWithR.length > 0 ? (rTrades.length / tradesWithR.length) * 100 : 0;

        return {
            period: {
                startDate: filters.startDate?.toISOString().split('T')[0] || (trades[0]?.timestamp ? trades[0].timestamp.toISOString().split('T')[0] : '1970-01-01'),
                endDate: filters.endDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                tradingDays: new Set(tradesWithR.map(t => t.closedAt.toISOString().split('T')[0])).size
            },
            performance: {
                netPnL: round2(netPnL),
                winRate: tradesWithR.length > 0 ? winningTrades.length / tradesWithR.length : 0,
                totalTrades: tradesWithR.length,
                avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
                avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
                profitFactor: profitFactor === null ? 0 : Math.round(profitFactor * 100) / 100,
                riskRewardRatio: losingTrades.length > 0 && winningTrades.length > 0 ? (totalWins / winningTrades.length) / (totalLosses / losingTrades.length) : 0,
                netR: rTrades.length > 0 ? round2(netR) : null,
                avgR: avgR === null ? null : round2(avgR),
                avgWinR: avgWinR === null ? null : round2(avgWinR),
                avgLossR: avgLossR === null ? null : round2(avgLossR),
                rCoverage: round1(rCoverage),
                coveredRTrades: rTrades.length,
                largestWin: Math.round(Math.max(...(winningTrades.length ? winningTrades.map(t => t.pnl) : [0])) * 100) / 100,
                largestLoss: Math.round(Math.min(...(losingTrades.length ? losingTrades.map(t => t.pnl) : [0])) * 100) / 100,
                maxDrawdown: Math.round(maxDrawdown * 100) / 100,
                avgHoldingPeriod,
                mtdPnL: (() => {
                    if (filters.startDate || filters.endDate) return 0; // Disable for custom ranges
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    let sum = 0;
                    for (const t of tradesWithR) {
                        if (t.closedAt >= startOfMonth) sum += t.pnl;
                    }
                    return Math.round(sum * 100) / 100;
                })(),
                ytdPnL: (() => {
                    if (filters.startDate || filters.endDate) return 0; // Disable for custom ranges
                    const now = new Date();
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    let sum = 0;
                    for (const t of tradesWithR) {
                        if (t.closedAt >= startOfYear) sum += t.pnl;
                    }
                    return Math.round(sum * 100) / 100;
                })()
            },
            patterns: {
                winStreak,
                lossStreak,
                dayOfWeekPerformance,
                monthlyTrend
            },
            topSymbols,
            tagInsights: tagInsightsArr,
            assetMix: {
                stocks: {
                    trades: tradesWithR.filter(t => t.type === 'STOCK').length,
                    pnl: Math.round(tradesWithR.filter(t => t.type === 'STOCK').reduce((sum, t) => sum + t.pnl, 0) * 100) / 100
                },
                options: {
                    trades: tradesWithR.filter(t => t.type === 'OPTION').length,
                    pnl: Math.round(tradesWithR.filter(t => t.type === 'OPTION').reduce((sum, t) => sum + t.pnl, 0) * 100) / 100
                }
            }
        };
    }
}

export const insightsDataService = new InsightsDataService();
