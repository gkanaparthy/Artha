import { InsightDataSummary } from "@/types/insights";

export interface LLMProvider {
    name: string;
    generateInsights(data: InsightDataSummary): Promise<string>;
    isAvailable(): boolean;
}
