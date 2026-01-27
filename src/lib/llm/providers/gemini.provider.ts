import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider } from "../provider";
import { InsightDataSummary } from "@/types/insights";
import { AiPersona } from "@prisma/client";
import { getSystemPrompt, getUserPrompt } from "../prompts";

export class GeminiProvider implements LLMProvider {
    name = "Google Gemini";
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    isAvailable(): boolean {
        return !!this.genAI;
    }

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "PROFESSIONAL"): Promise<string> {
        if (!this.genAI) {
            throw new Error("Gemini API key not configured");
        }

        const model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

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
