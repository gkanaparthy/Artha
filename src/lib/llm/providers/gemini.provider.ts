import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider } from "../provider";
import { InsightDataSummary } from "@/types/insights";

export class GeminiProvider implements LLMProvider {
    name = "Google Gemini";
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    isAvailable(): boolean {
        return !!this.genAI;
    }

    async generateInsights(data: InsightDataSummary): Promise<string> {
        if (!this.genAI) {
            throw new Error("Gemini API key not configured");
        }

        const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
- Options: $${data.assetMix.options.pnl.toFixed(2)} (${data.assetMix.options.trades} trades)

Please provide your analysis and coaching recommendations.`;

        try {
            const result = await model.generateContent([systemPrompt, userPrompt]);
            const response = await result.response;
            const text = response.text();

            if (!text) {
                throw new Error("Empty response from Gemini API");
            }

            return text;
        } catch (error: any) {
            console.error("[GeminiProvider] Generation failed:", error);
            throw new Error(`Gemini API error: ${error.message || "Unknown error"}`);
        }
    }
}
