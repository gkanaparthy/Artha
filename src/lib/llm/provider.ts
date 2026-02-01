import { InsightDataSummary, AiPersona } from "@/types/insights";

export interface LLMProvider {
    name: string;
    generateInsights(data: InsightDataSummary, persona?: AiPersona): Promise<string>;
    isAvailable(): boolean;
}
