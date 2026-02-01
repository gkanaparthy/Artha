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
            throw new Error("Gemini API key not configured");
        }

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

        // Using Gemini 2.0 Flash for best performance/cost balance
        const model = this.genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: {
                role: "system",
                parts: [{ text: systemPrompt }]
            }
        });

        try {
            console.log(`[GeminiProvider] Using model: gemini-2.0-flash`);
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
