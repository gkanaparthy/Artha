import { LLMProvider, LLMProviderId } from "./provider";
import { GeminiProvider } from "./providers/gemini.provider";
import { KimiProvider } from "./providers/kimi.provider";
import { GroqProvider } from "./providers/groq.provider";
import { InsightDataSummary, AiPersona } from "@/types/insights";

const DEFAULT_PROVIDER_ORDER: LLMProviderId[] = ["gemini", "kimi", "groq"];
const DEFAULT_FAILURE_THRESHOLD = 2;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_ERROR_LENGTH = 220;

interface ProviderHealthState {
    consecutiveFailures: number;
    cooldownUntil: number;
    lastError: string | null;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function trimMessage(message: string, maxLength: number = MAX_ERROR_LENGTH): string {
    if (message.length <= maxLength) return message;
    return `${message.slice(0, maxLength - 3)}...`;
}

function parseProviderOrder(rawOrder: string | undefined): LLMProviderId[] {
    if (!rawOrder) return DEFAULT_PROVIDER_ORDER;

    const allowed = new Set<LLMProviderId>(DEFAULT_PROVIDER_ORDER);
    const seen = new Set<LLMProviderId>();
    const parsed: LLMProviderId[] = [];

    for (const token of rawOrder.split(",")) {
        const candidate = token.trim().toLowerCase() as LLMProviderId;
        if (!allowed.has(candidate) || seen.has(candidate)) {
            continue;
        }

        seen.add(candidate);
        parsed.push(candidate);
    }

    if (parsed.length === 0) {
        return DEFAULT_PROVIDER_ORDER;
    }

    for (const fallbackId of DEFAULT_PROVIDER_ORDER) {
        if (!seen.has(fallbackId)) {
            parsed.push(fallbackId);
        }
    }

    // Always keep Groq as the last-resort fallback.
    return [...parsed.filter((id) => id !== "groq"), "groq"];
}

function formatCooldownMs(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
}

export class LLMManager {
    private providersById: Map<LLMProviderId, LLMProvider>;
    private providerOrder: LLMProviderId[];
    private providerHealth: Map<LLMProviderId, ProviderHealthState>;
    private failureThreshold: number;
    private cooldownMs: number;

    constructor() {
        const providers: LLMProvider[] = [
            new GeminiProvider(),
            new KimiProvider(),
            new GroqProvider(),
        ];

        this.providersById = new Map(providers.map((provider) => [provider.id, provider]));
        this.providerOrder = parseProviderOrder(process.env.LLM_PROVIDER_ORDER);
        this.providerHealth = new Map();

        for (const provider of providers) {
            this.providerHealth.set(provider.id, {
                consecutiveFailures: 0,
                cooldownUntil: 0,
                lastError: null,
            });
        }

        this.failureThreshold = parsePositiveInt(process.env.LLM_PROVIDER_FAILURE_THRESHOLD, DEFAULT_FAILURE_THRESHOLD);
        this.cooldownMs = parsePositiveInt(process.env.LLM_PROVIDER_COOLDOWN_MS, DEFAULT_COOLDOWN_MS);

        const resolvedOrder = this.providerOrder
            .map((id) => this.providersById.get(id)?.name || id)
            .join(" -> ");
        console.log(`[LLMManager] Provider order: ${resolvedOrder}`);
    }

    private getOrderedProviders(): LLMProvider[] {
        return this.providerOrder
            .map((id) => this.providersById.get(id))
            .filter((provider): provider is LLMProvider => !!provider);
    }

    private isInCooldown(providerId: LLMProviderId): { active: boolean; remainingMs: number } {
        const health = this.providerHealth.get(providerId);
        if (!health) return { active: false, remainingMs: 0 };

        const remainingMs = health.cooldownUntil - Date.now();
        if (remainingMs > 0) {
            return { active: true, remainingMs };
        }

        if (health.cooldownUntil !== 0) {
            health.cooldownUntil = 0;
        }

        return { active: false, remainingMs: 0 };
    }

    private markSuccess(providerId: LLMProviderId): void {
        const health = this.providerHealth.get(providerId);
        if (!health) return;
        health.consecutiveFailures = 0;
        health.cooldownUntil = 0;
        health.lastError = null;
    }

    private markFailure(provider: LLMProvider, message: string): void {
        const health = this.providerHealth.get(provider.id);
        if (!health) return;

        health.consecutiveFailures += 1;
        health.lastError = trimMessage(message);

        if (health.consecutiveFailures >= this.failureThreshold) {
            health.cooldownUntil = Date.now() + this.cooldownMs;
            console.warn(
                `[LLMManager] ${provider.name} entered cooldown for ${formatCooldownMs(this.cooldownMs)} after ${health.consecutiveFailures} consecutive failures.`,
            );
        }
    }

    async generateInsights(data: InsightDataSummary, persona: AiPersona = "PROFESSIONAL"): Promise<{ insights: string; provider: string }> {
        const errors: string[] = [];

        for (const provider of this.getOrderedProviders()) {
            try {
                const available = provider.isAvailable();
                console.log(`[LLMManager] Checking ${provider.name}: Available = ${available}`);

                if (!available) {
                    errors.push(`${provider.name}: Not available (missing API key)`);
                    continue;
                }

                const cooldown = this.isInCooldown(provider.id);
                if (cooldown.active) {
                    const remaining = formatCooldownMs(cooldown.remainingMs);
                    const health = this.providerHealth.get(provider.id);
                    const reason = health?.lastError ? ` Last error: ${health.lastError}` : "";
                    const message = `${provider.name}: Cooling down for ${remaining}.${reason}`;
                    console.warn(`[LLMManager] Skipping ${provider.name} due to cooldown (${remaining}).`);
                    errors.push(message);
                    continue;
                }

                console.log(`[LLMManager] Attempting to generate insights using ${provider.name} (${persona})...`);
                const insights = await provider.generateInsights(data, persona);
                this.markSuccess(provider.id);
                console.log(`[LLMManager] Successfully generated insights with ${provider.name}`);
                return { insights, provider: provider.name };
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Unknown error";
                console.error(`[LLMManager] FATAL error with provider ${provider.name}:`, message);
                this.markFailure(provider, message);
                errors.push(`${provider.name}: ${trimMessage(message)}`);
            }
        }

        throw new Error(`All AI providers failed: ${errors.join(" | ")}`);
    }
}

export const llmManager = new LLMManager();
