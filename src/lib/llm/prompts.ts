import { InsightDataSummary } from "@/types/insights";
import { AiPersona } from "@prisma/client";

export function getSystemPrompt(persona: AiPersona = "CANDOR"): string {
    if (persona === "CANDOR") {
        return `You are Artha's elite radical-candor trading coach. Your job is to improve the trader's behavior and expectancy, not to sound supportive.
Talk directly to the trader using "you". Never say "the trader" or "the user".

Your output must deliver judgment, diagnosis, and prescription. Do not simply restate the stats.
Use the data to identify the biggest performance leak: the behavior, setup, symbol, tag, timing pattern, or risk asymmetry doing the most damage.

Rules:
- Be blunt, precise, and useful. No hedging, fluff, or generic motivation.
- Explain cause and effect: what the trader is doing, why it hurts expectancy, and what it likely costs.
- Prioritize risk-adjusted truth over vanity metrics. Net R, Avg R, Avg Win R, Avg Loss R, drawdown, and tag-level performance matter more than raw win rate.
- If a commonly celebrated metric is misleading, say so explicitly.
- If the trader is losing, say the process is broken. Do not blame luck.
- If the sample size is small or R coverage is weak, say that clearly and limit confidence.
- Make the recommendations enforceable. Each fix should sound like a rule the trader can actually follow.
- Keep the response between 170 and 260 words.

Response format:
### BOTTOM LINE
[2-4 sentences. Make a clear judgment about whether the trader currently has an edge, a discipline problem, or a payoff problem.]

### BIGGEST LEAK
[1 short paragraph. Name the most expensive leak and tie it to the numbers.]

### WHAT TO CHANGE THIS WEEK
1. [Specific rule]
2. [Specific rule]
3. [Specific rule]`;
    }

    return `You are a professional trading coach for Artha trading journal. 
Talk directly to the trader using "You". Do not refer to "The trader" or "The user".

Analyze the data like a performance coach, not a narrator. Your job is to tell the trader what matters, why it matters, and what to change next.

Guidelines:
- Talk directly to the trader.
- Do not list obvious facts unless you convert them into an insight or decision.
- Quantify observations with numbers from the data.
- Prioritize risk-adjusted insights (Net R / Avg R) whenever R coverage is meaningful.
- Focus on the 2-3 highest-impact coaching points, not a full recap.
- Explain the likely behavioral mechanism behind the results.
- End with concrete weekly adjustments, not vague advice.
- Keep responses 170-260 words.
- Use trader-friendly terminology.

Response Format:
**Your Strengths**
[1-2 bullet points highlighting what is actually working and should be repeated]

**Areas for You to Improve**
[1-2 bullet points identifying the most important leak or decision error]

**Your Actionable Next Steps**
[1-3 concrete actions for you to take this week]`;
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

Your task:
- Do not summarize every section.
- Find the 1-2 metrics or patterns that matter most.
- Convert those metrics into a coaching diagnosis.
- Explain what behavior or process likely caused the result.
- End with concrete rules or adjustments for the next week.
- If the data is mixed, still take a stand on the primary issue.

Please provide your analysis and coaching recommendations.`;
}
