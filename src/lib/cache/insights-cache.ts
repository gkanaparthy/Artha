import { Redis } from "@upstash/redis";

const isUpstashConfigured = () => {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

let redis: Redis | null = null;
const getRedis = () => {
    if (!redis && isUpstashConfigured()) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });
    }
    return redis;
};

export async function getCachedInsight(userId: string, filterHash: string): Promise<string | null> {
    const client = getRedis();
    if (!client) return null;

    try {
        const key = `artha:insights:${userId}:${filterHash}`;
        return await client.get<string>(key);
    } catch (error) {
        console.error("[InsightsCache] Error getting from cache:", error);
        return null;
    }
}

export async function setCachedInsight(userId: string, filterHash: string, insights: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
        const key = `artha:insights:${userId}:${filterHash}`;
        // Cache for 1 hour
        await client.set(key, insights, { ex: 3600 });
    } catch (error) {
        console.error("[InsightsCache] Error setting cache:", error);
    }
}

export function generateFilterHash(filters: any): string {
    // Simple stable stringify for hashing
    const str = JSON.stringify(filters, Object.keys(filters).sort());

    // Use SHA-256 for a robust, collision-resistant hash
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(str).digest("hex");
}
