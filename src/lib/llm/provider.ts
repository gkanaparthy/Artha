import { InsightDataSummary, AiPersona } from "@/types/insights";

export type LLMProviderId = "gemini" | "kimi" | "groq";

export interface LLMProvider {
    id: LLMProviderId;
    name: string;
    generateInsights(data: InsightDataSummary, persona?: AiPersona): Promise<string>;
    isAvailable(): boolean;
}
