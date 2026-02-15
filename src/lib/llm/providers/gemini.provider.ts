import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { LLMProvider } from "../provider";
import { InsightDataSummary, AiPersona } from "@/types/insights";
import { getSystemPrompt, getUserPrompt } from "../prompts";

export class GeminiProvider implements LLMProvider {
    name = "Google Gemini";
    private client: GoogleGenAI | null = null;

    private init() {
        if (this.client) return;
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
        if (apiKey) {
            this.client = new GoogleGenAI({ apiKey });
        }
    }

    isAvailable(): boolean {
        this.init();
        return !!this.client;
    }

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "PROFESSIONAL"): Promise<string> {
        this.init();
        if (!this.client) {
            console.warn("[GeminiProvider] API key missing, skipping.");
            throw new Error("Gemini API key not configured");
        }

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

        // Models to try in order of preference
        const modelsToTry = ["gemini-3-flash-preview", "gemini-3-pro-preview"];

        for (const modelName of modelsToTry) {
            try {
                console.log(`[GeminiProvider] Attempting generation with model: ${modelName}`);
                const response = await this.client.models.generateContent({
                    model: modelName,
                    contents: userPrompt,
                    config: {
                        systemInstruction: systemPrompt,
                        temperature: 0.7,
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        ]
                    }
                });

                const text = response.text;
                if (!text) {
                    throw new Error("Empty response text");
                }

                console.log(`[GeminiProvider] Success with ${modelName}`);
                return text;

            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Unknown error";
                console.warn(`[GeminiProvider] Failed with ${modelName}: ${message}`);
                // Continue to next model
            }
        }

        throw new Error("All Gemini models failed to generate insights.");
    }
}
