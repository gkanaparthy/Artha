import { LLMProvider } from "../provider";
import { InsightDataSummary } from "@/types/insights";
import { AiPersona } from "@prisma/client";
import { getSystemPrompt, getUserPrompt } from "../prompts";

export class GroqProvider implements LLMProvider {
    name = "Groq";
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "PROFESSIONAL"): Promise<string> {
        if (!this.apiKey) {
            throw new Error("Groq API key not configured");
        }

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
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
                console.error("[GroqProvider] Error parsing error response:", e);
            }
            throw new Error(`Groq API error (${response.status}): ${errorMessage.substring(0, 100)}`);
        }

        const result = await response.json();

        if (!result.choices?.[0]?.message?.content) {
            console.error("[GroqProvider] Invalid response structure:", JSON.stringify(result));
            throw new Error("Invalid response structure from Groq API");
        }

        return result.choices[0].message.content;
    }
}
