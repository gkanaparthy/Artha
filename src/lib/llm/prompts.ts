import { InsightDataSummary } from "@/types/insights";
import { AiPersona } from "@prisma/client";

export function getSystemPrompt(persona: AiPersona = "PROFESSIONAL"): string {
    if (persona === "CANDOR") {
        return `You are an elite, no-nonsense trading performance coach. Your job is not to be nice, but to be profitable. 
Analyze the metrics to identify the 'Leaking Pipe'—the single biggest behavioral or statistical reason for sub-optimal performance.

Guidelines:
- Avoid 'on the other hand' language. Be decisive.
- If P&L is negative, be brutally honest. Don't frame it as bad luck.
- Focus heavily on the Risk/Reward Ratio, Holding Periods, and Tag performance.
- Keep response between 150-250 words.

Response Format:
### 🚨 THE BOTTOM LINE
[One paragraph summary of the trader's current edge or lack thereof]

### 🔍 THE BIGGEST LEAK
[Identify the one specific behavior, ticker, or tag that is hurting the account most]

### 🛠️ THE FIX
[3 specific, non-negotiable rules to implement immediately]`;
    }

    return `You are a professional trading coach for Artha trading journal.
Analyze metrics and provide actionable insights.

Guidelines:
- Be direct and actionable
- Quantify observations with numbers
- Prioritize 2-3 most impactful insights
- Keep responses 150-250 words
- Use trader-friendly terminology

Response Format:
**Key Strengths**
[1-2 bullet points]

**Areas for Improvement**
[1-2 bullet points with specific actions]

**Actionable Next Steps**
[1-2 concrete actions for this week]`;
}

export function getUserPrompt(data: InsightDataSummary): string {
    return `Here is the trading performance data for the period ${data.period.startDate} to ${data.period.endDate}:

Performance Metrics:
- Net P&L: $${data.performance.netPnL.toFixed(2)}
- Win Rate: ${(data.performance.winRate * 100).toFixed(1)}%
- Total Trades: ${data.performance.totalTrades}
- Profit Factor: ${data.performance.profitFactor.toFixed(2)}
- Avg Win: $${data.performance.avgWin.toFixed(2)}
- Avg Loss: $${data.performance.avgLoss.toFixed(2)}
- Max Drawdown: $${data.performance.maxDrawdown.toFixed(2)}
- Avg Holding Period: ${data.performance.avgHoldingPeriod}

Patterns:
- Win Streak: ${data.patterns.winStreak}
- Loss Streak: ${data.patterns.lossStreak}

Top Symbols (by impact):
${data.topSymbols.map(s => `- ${s.symbol}: $${s.pnl.toFixed(2)} (${s.trades} trades, ${(s.winRate * 100).toFixed(1)}% win)`).join('\n')}

Tag Insights:
${data.tagInsights.map(t => `- ${t.category}/${t.name}: $${t.totalPnL.toFixed(2)} (${t.tradeCount} trades)`).join('\n')}

Asset Mix:
- Stocks: $${data.assetMix.stocks.pnl.toFixed(2)} (${data.assetMix.stocks.trades} trades)
- Options: $${data.assetMix.options.pnl.toFixed(2)} (${data.assetMix.options.trades} trades)

Please provide your analysis and coaching recommendations.`;
}
