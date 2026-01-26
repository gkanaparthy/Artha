import { InsightDataSummary } from "@/types/insights";
import { AiPersona } from "@prisma/client";

export interface LLMProvider {
    name: string;
    generateInsights(data: InsightDataSummary, persona?: AiPersona): Promise<string>;
    isAvailable(): boolean;
}
