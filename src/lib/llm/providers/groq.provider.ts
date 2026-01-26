import { LLMProvider } from "../provider";
import { InsightDataSummary } from "@/types/insights";

export class GroqProvider implements LLMProvider {
    name = "Groq";
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async generateInsights(data: InsightDataSummary): Promise<string> {
        if (!this.apiKey) {
            throw new Error("Groq API key not configured");
        }

        const systemPrompt = `You are a professional trading coach for Artha trading journal.
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

        const userPrompt = `Here is the trading performance data for the period ${data.period.startDate} to ${data.period.endDate}:

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

Top Symbols:
${data.topSymbols.map(s => `- ${s.symbol}: $${s.pnl.toFixed(2)} (${s.trades} trades, ${(s.winRate * 100).toFixed(1)}% win)`).join('\n')}

Tag Insights:
${data.tagInsights.map(t => `- ${t.category}/${t.name}: $${t.totalPnL.toFixed(2)} (${t.tradeCount} trades)`).join('\n')}

Asset Mix:
- Stocks: $${data.assetMix.stocks.pnl.toFixed(2)} (${data.assetMix.stocks.trades} trades)
- Options: $${data.assetMix.options.pnl.toFixed(2)} (${data.assetMix.options.trades} trades)`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            let errorMessage = response.statusText;
            try {
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                    const error = await response.json();
                    errorMessage = error.error?.message || errorMessage;
                } else {
                    errorMessage = await response.text();
                }
            } catch (e) {
                console.error("[GroqProvider] Error parsing error response:", e);
            }
            throw new Error(`Groq API error (${response.status}): ${errorMessage.substring(0, 100)}`);
        }

        const result = await response.json();

        if (!result.choices?.[0]?.message?.content) {
            console.error("[GroqProvider] Invalid response structure:", JSON.stringify(result));
            throw new Error("Invalid response structure from Groq API");
        }

        return result.choices[0].message.content;
    }
}
