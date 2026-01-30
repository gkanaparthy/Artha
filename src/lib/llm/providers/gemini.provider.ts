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

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

        // Modern way to set system instructions for Gemini 1.5
        const model = this.genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            systemInstruction: systemPrompt
        });

        try {
            console.log(`[GeminiProvider] Calling generateContent...`);
            const result = await model.generateContent(userPrompt);
            const response = await result.response;
            const text = response.text();

            if (!text) {
                console.error("[GeminiProvider] Empty response text");
                throw new Error("Empty response from Gemini API");
            }

            return text;
        } catch (error: any) {
            console.error("[GeminiProvider] Generation failed:", error);
            // Check for specific safety or rate limit errors
            if (error.message?.includes("429") || error.message?.includes("quota")) {
                throw new Error(`Gemini rate limit exceeded: ${error.message}`);
            }
            if (error.message?.includes("safety")) {
                throw new Error(`Gemini blocked content for safety: ${error.message}`);
            }
            throw new Error(`Gemini API error: ${error.message || "Unknown error"}`);
        }
    }
}
