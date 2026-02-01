import { LLMProvider } from "./provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { GroqProvider } from "./providers/groq.provider";
import { InsightDataSummary, AiPersona } from "@/types/insights";

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
            try {
                const available = provider.isAvailable();
                console.log(`[LLMManager] Checking ${provider.name}: Available = ${available}`);

                if (available) {
                    console.log(`[LLMManager] Attempting to generate insights using ${provider.name} (${persona})...`);
                    const insights = await provider.generateInsights(data, persona);
                    console.log(`[LLMManager] Successfully generated insights with ${provider.name}`);
                    return { insights, provider: provider.name };
                } else {
                    errors.push(`${provider.name}: Not available (missing API key)`);
                }
            } catch (error: any) {
                console.error(`[LLMManager] FATAL error with provider ${provider.name}:`, error.message);
                errors.push(`${provider.name}: ${error.message}`);
                continue; // Try next provider
            }
        }

        throw new Error(`All AI providers failed: ${errors.join(", ")}`);
    }
}

export const llmManager = new LLMManager();
