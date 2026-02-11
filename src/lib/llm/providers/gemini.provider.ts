import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider } from "../provider";
import { InsightDataSummary, AiPersona } from "@/types/insights";
import { getSystemPrompt, getUserPrompt } from "../prompts";

export class GeminiProvider implements LLMProvider {
    name = "Google Gemini";
    private genAI: GoogleGenerativeAI | null = null;

    private init() {
        if (this.genAI) return;
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    isAvailable(): boolean {
        this.init();
        return !!this.genAI;
    }

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "PROFESSIONAL"): Promise<string> {
        this.init();
        if (!this.genAI) {
            console.warn("[GeminiProvider] API key missing, skipping.");
            throw new Error("Gemini API key not configured");
        }

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

        // Models to try in order of preference
        // gemini-3-flash-preview is the latest available as per user request.
        const modelsToTry = ["gemini-3-flash-preview", "gemini-2.0-flash", "gemini-1.5-pro"];

        for (const modelName of modelsToTry) {
            try {
                console.log(`[GeminiProvider] Attempting generation with model: ${modelName}`);
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: {
                        role: "system",
                        parts: [{ text: systemPrompt }]
                    }
                });

                const result = await model.generateContent(userPrompt);
                const response = await result.response;
                const text = response.text();

                if (!text) {
                    throw new Error("Empty response text");
                }

                console.log(`[GeminiProvider] Success with ${modelName}`);
                return text;

            } catch (error: any) {
                console.warn(`[GeminiProvider] Failed with ${modelName}: ${error.message}`);
            }
        }

        throw new Error("All Gemini models failed to generate insights.");
    }
}
