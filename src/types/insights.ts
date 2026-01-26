export interface InsightDataSummary {
    period: {
        startDate: string;
        endDate: string;
        tradingDays: number;
    };
    performance: {
        netPnL: number;
        winRate: number;
        totalTrades: number;
        avgWin: number;
        avgLoss: number;
        profitFactor: number;
        riskRewardRatio: number;
        largestWin: number;
        largestLoss: number;
        maxDrawdown: number;
        avgHoldingPeriod: string;
        mtdPnL: number;
        ytdPnL: number;
    };
    patterns: {
        winStreak: number;
        lossStreak: number;
        dayOfWeekPerformance: Record<string, number>;
        monthlyTrend: Record<string, number>;
    };
    topSymbols: {
        symbol: string;
        pnl: number;
        trades: number;
        winRate: number;
    }[];
    tagInsights: {
        category: string;
        name: string;
        totalPnL: number;
        tradeCount: number;
        winRate: number;
    }[];
    assetMix: {
        stocks: { trades: number; pnl: number };
        options: { trades: number; pnl: number };
    };
}

export interface AIInsightResponse {
    insights: string;
    cached: boolean;
    timestamp: string;
    provider: string;
}
