import { LLMProvider } from "../provider";
import { InsightDataSummary, AiPersona } from "@/types/insights";
import { getSystemPrompt, getUserPrompt } from "../prompts";

export class KimiProvider implements LLMProvider {
    name = "Kimi K2.5";
    private apiKey: string | undefined;
    private baseUrl: string;
    private modelsToTry: string[];

    constructor() {
        this.apiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
        this.baseUrl = (process.env.KIMI_BASE_URL || process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1").replace(/\/+$/, "");

        const configuredModel = process.env.KIMI_MODEL || process.env.KIMI_MODEL_ID || "kimi-k2.5";
        this.modelsToTry = [
            configuredModel,
            "kimi-k2-0905-preview",
            "kimi-k2-turbo-preview",
            "kimi-k2-thinking",
        ].filter((value, index, array) => !!value && array.indexOf(value) === index);
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "PROFESSIONAL"): Promise<string> {
        if (!this.apiKey) {
            throw new Error("Kimi API key not configured");
        }

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

        const errors: string[] = [];

        for (const modelName of this.modelsToTry) {
            try {
                console.log(`[KimiProvider] Attempting generation with model: ${modelName}`);

                const response = await fetch(`${this.baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: modelName,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt },
                        ],
                        temperature: 0.7,
                    }),
                });

                if (!response.ok) {
                    let errorMessage = response.statusText;
                    try {
                        const contentType = response.headers.get("content-type");
                        if (contentType && contentType.includes("application/json")) {
                            const error = await response.json();
                            errorMessage = error.error?.message || errorMessage;
                        } else {
                            errorMessage = await response.text();
                        }
                    } catch (e) {
                        console.error("[KimiProvider] Error parsing error response:", e);
                    }
                    throw new Error(`Kimi API error (${response.status}): ${errorMessage.substring(0, 200)}`);
                }

                const result = await response.json();
                const content = result.choices?.[0]?.message?.content;

                if (!content || typeof content !== "string") {
                    throw new Error("Invalid response structure from Kimi API");
                }

                console.log(`[KimiProvider] Success with ${modelName}`);
                return content;
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Unknown error";
                console.warn(`[KimiProvider] Failed with ${modelName}: ${message}`);
                errors.push(`${modelName}: ${message}`);
            }
        }

        throw new Error(`All Kimi models failed: ${errors.join(", ")}`);
    }
}
