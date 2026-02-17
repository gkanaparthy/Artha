import { LLMProvider } from "../provider";
import { InsightDataSummary, AiPersona } from "@/types/insights";
import { getSystemPrompt, getUserPrompt } from "../prompts";

const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_RETRY_ATTEMPTS = 1;
const BASE_RETRY_DELAY_MS = 750;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseModelList(raw: string | undefined, fallback: string[]): string[] {
    if (!raw) return fallback;
    const models = raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    return models.length > 0 ? Array.from(new Set(models)) : fallback;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

function isRetryableError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
        lower.includes("timeout") ||
        lower.includes("timed out") ||
        lower.includes("fetch failed") ||
        lower.includes("network") ||
        lower.includes("socket") ||
        lower.includes("503") ||
        lower.includes("502") ||
        lower.includes("500") ||
        lower.includes("429") ||
        lower.includes("aborted")
    );
}

export class GroqProvider implements LLMProvider {
    id = "groq" as const;
    name = "Groq";
    private apiKey: string | undefined;
    private modelsToTry: string[];
    private timeoutMs: number;
    private retryAttempts: number;

    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        const configuredModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
        this.modelsToTry = parseModelList(process.env.GROQ_MODELS, [configuredModel, "llama-3.1-70b-versatile"]);
        this.timeoutMs = parsePositiveInt(process.env.GROQ_TIMEOUT_MS || process.env.LLM_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
        this.retryAttempts = parsePositiveInt(process.env.GROQ_RETRY_ATTEMPTS || process.env.LLM_RETRY_ATTEMPTS, DEFAULT_RETRY_ATTEMPTS);
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
        const errors: string[] = [];

        for (const modelName of this.modelsToTry) {
            let modelError = "Unknown error";
            const maxAttempts = this.retryAttempts + 1;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const controller = new AbortController();
                const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);
                try {
                    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${this.apiKey}`,
                            "Content-Type": "application/json",
                        },
                        signal: controller.signal,
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
                            console.error("[GroqProvider] Error parsing error response:", e);
                        }

                        const normalized = `Groq API error (${response.status}): ${errorMessage.substring(0, 180)}`;
                        modelError = normalized;
                        const hasAttemptsLeft = attempt < maxAttempts;

                        if (isRetryableStatus(response.status) && hasAttemptsLeft) {
                            const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                            console.warn(`[GroqProvider] Retrying ${modelName} after ${response.status} in ${delayMs}ms`);
                            await sleep(delayMs);
                            continue;
                        }

                        break;
                    }

                    const result = await response.json();
                    const content = result?.choices?.[0]?.message?.content;

                    if (!content || typeof content !== "string") {
                        modelError = "Invalid response structure from Groq API";
                        throw new Error(modelError);
                    }

                    console.log(`[GroqProvider] Success with ${modelName}`);
                    return content;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    modelError = message;
                    const retryable = isRetryableError(message);
                    const hasAttemptsLeft = attempt < maxAttempts;

                    console.warn(`[GroqProvider] Failed with ${modelName} on attempt ${attempt}: ${message}`);

                    if (retryable && hasAttemptsLeft) {
                        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                        await sleep(delayMs);
                        continue;
                    }

                    break;
                } finally {
                    clearTimeout(timeoutHandle);
                }
            }

            errors.push(`${modelName}: ${modelError}`);
        }

        throw new Error(`All Groq models failed: ${errors.join(", ")}`);
    }
}
