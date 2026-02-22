import { InsightDataSummary } from "@/types/insights";
import { AiPersona } from "@prisma/client";

export function getSystemPrompt(persona: AiPersona = "PROFESSIONAL"): string {
    if (persona === "CANDOR") {
        return `You are an elite, no-nonsense trading performance coach. Your job is not to be nice, but to be profitable. 
Talk directly to the trader using "You". Do not refer to "The trader" or "The user".

Analyze the metrics to identify your "Leaking Pipe"—the single biggest behavioral or statistical reason for your sub-optimal performance.

Guidelines:
- Talk directly to the trader (e.g., "You achieved this," "Your biggest leak is...").
- Avoid "on the other hand" language. Be decisive.
- If your P&L is negative, be brutally honest. Don't frame it as bad luck.
- Focus heavily on your risk-adjusted performance (Net R / Avg R when available), Risk/Reward Ratio, Holding Periods, and Tag performance.
- Keep response between 150-250 words.

Response Format:
### 🚨 THE BOTTOM LINE
[One paragraph summary directed at YOU and your current edge or lack thereof]

### 🔍 YOUR BIGGEST LEAK
[Identify the one specific behavior, ticker, or tag that is hurting YOUR account most]

### 🛠️ THE FIX
[3 specific, non-negotiable rules for YOU to implement immediately]`;
    }

    return `You are a professional trading coach for Artha trading journal. 
Talk directly to the trader using "You". Do not refer to "The trader" or "The user".

Analyze your metrics and provide actionable insights directed specifically at you.

Guidelines:
- Talk directly to the trader (e.g., "You have achieved," "You went wrong here").
- Be direct and actionable.
- Quantify observations with numbers from your data.
- Prioritize risk-adjusted insights (Net R / Avg R) whenever R coverage is meaningful.
- Prioritize your 2-3 most impactful insights.
- Keep responses 150-250 words.
- Use trader-friendly terminology.

Response Format:
**Your Strengths**
[1-2 bullet points highlighting what you did well]

**Areas for You to Improve**
[1-2 bullet points with specific actions you should take]

**Your Actionable Next Steps**
[1-2 concrete actions for you to take this week]`;
}

export function getUserPrompt(data: InsightDataSummary): string {
    const hasR = data.performance.coveredRTrades > 0;
    const rSection = hasR
        ? `R-Multiple Metrics:
- Risk Coverage: ${data.performance.rCoverage.toFixed(1)}% (${data.performance.coveredRTrades}/${data.performance.totalTrades} closed trades)
- Net R: ${data.performance.netR === null ? "N/A" : `${data.performance.netR.toFixed(2)}R`}
- Avg R: ${data.performance.avgR === null ? "N/A" : `${data.performance.avgR.toFixed(2)}R`}
- Avg Win R: ${data.performance.avgWinR === null ? "N/A" : `${data.performance.avgWinR.toFixed(2)}R`}
- Avg Loss R: ${data.performance.avgLossR === null ? "N/A" : `${data.performance.avgLossR.toFixed(2)}R`}`
        : `R-Multiple Metrics:
- No R-multiple data available for this period/filter (coverage is 0%). Do not infer or fabricate R-based conclusions.`;

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

${rSection}

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
