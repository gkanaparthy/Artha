import { LLMProvider } from "./provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { InsightDataSummary } from "@/types/insights";
import { AiPersona } from "@prisma/client";

export class LLMManager {
    private providers: LLMProvider[];

    constructor() {
        this.providers = [
            new GeminiProvider(),
            new GroqProvider(),
        ];
    }

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "PROFESSIONAL"): Promise<{ insights: string; provider: string }> {
        const errors: string[] = [];

        for (const provider of this.providers) {
            if (provider.isAvailable()) {
                try {
                    console.log(`[LLMManager] Attempting to generate insights using ${provider.name} (${persona})...`);
                    const insights = await provider.generateInsights(data, persona);
                    return { insights, provider: provider.name };
                } catch (error: any) {
                    console.error(`[LLMManager] Error with provider ${provider.name}:`, error.message);
                    errors.push(`${provider.name}: ${error.message}`);
                }
            } else {
                console.log(`[LLMManager] Provider ${provider.name} is not available (missing API key)`);
            }
        }

        throw new Error(`All AI providers failed: ${errors.join(", ")}`);
    }
}

export const llmManager = new LLMManager();
