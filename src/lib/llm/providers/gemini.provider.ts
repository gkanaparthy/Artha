import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { LLMProvider } from "../provider";
import { InsightDataSummary, AiPersona } from "@/types/insights";
import { getSystemPrompt, getUserPrompt } from "../prompts";

const DEFAULT_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
];
const DEFAULT_TIMEOUT_MS = 20000;
const DEFAULT_RETRY_ATTEMPTS = 1;
const BASE_RETRY_DELAY_MS = 750;

type GeminiGenerateContentResponse = {
    text?: string | null;
};

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

function isRetryableError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
        lower.includes("timeout") ||
        lower.includes("timed out") ||
        lower.includes("fetch failed") ||
        lower.includes("network") ||
        lower.includes("503") ||
        lower.includes("502") ||
        lower.includes("500") ||
        lower.includes("429") ||
        lower.includes("unavailable") ||
        lower.includes("overloaded")
    );
}

export class GeminiProvider implements LLMProvider {
    id = "gemini" as const;
    name = "Google Gemini";
    private client: GoogleGenAI | null = null;
    private readonly modelsToTry: string[];
    private readonly timeoutMs: number;
    private readonly retryAttempts: number;

    constructor() {
        this.modelsToTry = parseModelList(process.env.GEMINI_MODELS, DEFAULT_GEMINI_MODELS);
        this.timeoutMs = parsePositiveInt(process.env.GEMINI_TIMEOUT_MS || process.env.LLM_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
        this.retryAttempts = parsePositiveInt(process.env.GEMINI_RETRY_ATTEMPTS || process.env.LLM_RETRY_ATTEMPTS, DEFAULT_RETRY_ATTEMPTS);
    }

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

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "CANDOR"): Promise<string> {
        this.init();
        if (!this.client) {
            console.warn("[GeminiProvider] API key missing, skipping.");
            throw new Error("Gemini API key not configured");
        }

        const systemPrompt = getSystemPrompt(persona);
        const userPrompt = getUserPrompt(data);

        const errors: string[] = [];

        for (const modelName of this.modelsToTry) {
            let modelError = "Unknown error";
            const maxAttempts = this.retryAttempts + 1;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
                try {
                    console.log(`[GeminiProvider] Attempting generation with model: ${modelName} (attempt ${attempt}/${maxAttempts})`);

                    const timeoutPromise = new Promise<never>((_, reject) => {
                        timeoutHandle = setTimeout(() => {
                            reject(new Error(`Gemini request timed out after ${this.timeoutMs}ms`));
                        }, this.timeoutMs);
                    });

                    const response = await Promise.race([
                        this.client.models.generateContent({
                            model: modelName,
                            contents: userPrompt,
                            config: {
                                systemInstruction: systemPrompt,
                                temperature: 1.0,
                                safetySettings: [
                                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                                ],
                            },
                        }),
                        timeoutPromise,
                    ]) as GeminiGenerateContentResponse;

                    const text = response?.text;
                    if (!text || typeof text !== "string") {
                        throw new Error("Empty response text");
                    }

                    console.log(`[GeminiProvider] Success with ${modelName}`);
                    return text;
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Unknown error";
                    modelError = message;
                    const retryable = isRetryableError(message);
                    const hasAttemptsLeft = attempt < maxAttempts;

                    console.warn(`[GeminiProvider] Failed with ${modelName} on attempt ${attempt}: ${message}`);

                    if (retryable && hasAttemptsLeft) {
                        const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                        await sleep(delayMs);
                        continue;
                    }
                } finally {
                    if (timeoutHandle) {
                        clearTimeout(timeoutHandle);
                    }
                }
            }

            errors.push(`${modelName}: ${modelError}`);
        }

        throw new Error(`All Gemini models failed: ${errors.join(", ")}`);
    }
}
