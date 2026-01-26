import { prisma } from "@/lib/prisma";
import { calculateMetricsFromTrades } from "@/lib/analytics/fifo";
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
            where.accountId = filters.accountId;
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

        // 3. Process with FIFO engine
        const { filteredTrades } = calculateMetricsFromTrades(trades, enrichedFilters);

        // 4. Calculations
        const winningTrades = filteredTrades.filter(t => t.pnl > 0);
        const losingTrades = filteredTrades.filter(t => t.pnl < 0);
        const netPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);

        // Profit Factor
        const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? null : 0);

        // Max Drawdown
        let maxDrawdown = 0;
        let peakPnL = 0;
        let currentPnL = 0;
        const sortedTrades = [...filteredTrades].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
        for (const t of sortedTrades) {
            currentPnL += t.pnl;
            if (currentPnL > peakPnL) peakPnL = currentPnL;
            const dd = peakPnL - currentPnL;
            if (dd > maxDrawdown) maxDrawdown = dd;
        }

        // Avg Holding Period (simple version)
        let totalHoldingTime = 0;
        for (const t of filteredTrades) {
            totalHoldingTime += t.closedAt.getTime() - t.openedAt.getTime();
        }
        const avgHoldingPeriodMs = filteredTrades.length > 0 ? totalHoldingTime / filteredTrades.length : 0;
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

        for (const t of filteredTrades) {
            const day = daysArr[t.closedAt.getDay()];
            dayOfWeekPerformance[day] = (dayOfWeekPerformance[day] || 0) + t.pnl;

            const month = t.closedAt.toISOString().slice(0, 7);
            monthlyTrend[month] = (monthlyTrend[month] || 0) + t.pnl;
        }

        // Top Symbols
        const symbolsMap = new Map<string, { pnl: number; trades: number; wins: number }>();
        for (const t of filteredTrades) {
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
        for (const t of filteredTrades) {
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

        return {
            period: {
                startDate: filters.startDate?.toISOString().split('T')[0] || (trades[0]?.timestamp ? trades[0].timestamp.toISOString().split('T')[0] : '1970-01-01'),
                endDate: filters.endDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
                tradingDays: new Set(filteredTrades.map(t => t.closedAt.toISOString().split('T')[0])).size
            },
            performance: {
                netPnL: Math.round(netPnL * 100) / 100,
                winRate: filteredTrades.length > 0 ? winningTrades.length / filteredTrades.length : 0,
                totalTrades: filteredTrades.length,
                avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
                avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
                profitFactor: profitFactor === null ? 0 : Math.round(profitFactor * 100) / 100,
                riskRewardRatio: losingTrades.length > 0 && winningTrades.length > 0 ? (totalWins / winningTrades.length) / (totalLosses / losingTrades.length) : 0,
                largestWin: Math.round(Math.max(...(winningTrades.length ? winningTrades.map(t => t.pnl) : [0])) * 100) / 100,
                largestLoss: Math.round(Math.min(...(losingTrades.length ? losingTrades.map(t => t.pnl) : [0])) * 100) / 100,
                maxDrawdown: Math.round(maxDrawdown * 100) / 100,
                avgHoldingPeriod,
                mtdPnL: (() => {
                    if (filters.startDate || filters.endDate) return 0; // Disable for custom ranges
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    let sum = 0;
                    for (const t of filteredTrades) {
                        if (t.closedAt >= startOfMonth) sum += t.pnl;
                    }
                    return Math.round(sum * 100) / 100;
                })(),
                ytdPnL: (() => {
                    if (filters.startDate || filters.endDate) return 0; // Disable for custom ranges
                    const now = new Date();
                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                    let sum = 0;
                    for (const t of filteredTrades) {
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
                    trades: filteredTrades.filter(t => t.type === 'STOCK').length,
                    pnl: Math.round(filteredTrades.filter(t => t.type === 'STOCK').reduce((sum, t) => sum + t.pnl, 0) * 100) / 100
                },
                options: {
                    trades: filteredTrades.filter(t => t.type === 'OPTION').length,
                    pnl: Math.round(filteredTrades.filter(t => t.type === 'OPTION').reduce((sum, t) => sum + t.pnl, 0) * 100) / 100
                }
            }
        };
    }
}

export const insightsDataService = new InsightsDataService();
