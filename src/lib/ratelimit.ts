/**
 * Rate Limiting Utility
 * 
 * Uses Upstash Redis for serverless-compatible rate limiting.
 * Protects API endpoints from abuse and DoS attacks.
 * 
 * SETUP REQUIRED:
 * Add these environment variables to Vercel:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * 
 * Get them from: https://console.upstash.com/
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Check if Upstash is configured
const isUpstashConfigured = () => {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
};

// Create Redis client (lazy initialization)
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

// Different rate limit configurations for different use cases
export type RateLimitType = 'api' | 'auth' | 'sync' | 'delete' | 'destructive' | 'admin' | 'insights';

const rateLimitConfigs: Record<RateLimitType, { requests: number; window: string }> = {
    // General API calls: 100 requests per minute
    api: { requests: 100, window: '1 m' },

    // Auth endpoints (login, register): 10 requests per minute
    auth: { requests: 10, window: '1 m' },

    // Sync endpoints: 10 requests per minute (expensive but user might retry)
    sync: { requests: 10, window: '1 m' },

    // Single-item delete: 30 requests per minute (user cleaning up journal)
    delete: { requests: 30, window: '1 m' },

    // Destructive bulk operations: 5 requests per minute (rare operations)
    destructive: { requests: 5, window: '1 m' },

    // Admin endpoints: 20 requests per minute
    admin: { requests: 20, window: '1 m' },

    // AI Insights: 10 requests per hour (expensive)
    insights: { requests: 10, window: '1 h' },
};

// Create rate limiters (lazy initialization)
const rateLimiters: Map<RateLimitType, Ratelimit> = new Map();

const getRateLimiter = (type: RateLimitType): Ratelimit | null => {
    const redisClient = getRedis();
    if (!redisClient) return null;

    if (!rateLimiters.has(type)) {
        const config = rateLimitConfigs[type];
        rateLimiters.set(type, new Ratelimit({
            redis: redisClient,
            limiter: Ratelimit.slidingWindow(config.requests, config.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
            analytics: true,
            prefix: `artha:ratelimit:${type}`,
        }));
    }

    return rateLimiters.get(type)!;
};

/**
 * Check rate limit for an identifier (usually IP or user ID)
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param type - Type of rate limit to apply
 * @returns Object with success status and optional response
 */
export async function checkRateLimit(
    identifier: string,
    type: RateLimitType = 'api'
): Promise<{
    success: boolean;
    limit?: number;
    remaining?: number;
    reset?: number;
    response?: NextResponse;
}> {
    const limiter = getRateLimiter(type);

    // If Upstash is not configured, allow all requests (graceful degradation)
    if (!limiter) {
        console.warn('[RateLimit] Upstash not configured, skipping rate limit check');
        return { success: true };
    }

    try {
        const result = await limiter.limit(identifier);

        if (!result.success) {
            console.warn(`[RateLimit] Rate limit exceeded for ${identifier} (${type})`);

            return {
                success: false,
                limit: result.limit,
                remaining: result.remaining,
                reset: result.reset,
                response: NextResponse.json(
                    {
                        error: 'Too many requests. Please try again later.',
                        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
                    },
                    {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': result.limit.toString(),
                            'X-RateLimit-Remaining': result.remaining.toString(),
                            'X-RateLimit-Reset': result.reset.toString(),
                            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
                        }
                    }
                ),
            };
        }

        return {
            success: true,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
        };
    } catch (error) {
        // If there's an error with rate limiting, log it but allow the request
        console.error('[RateLimit] Error checking rate limit:', error);
        return { success: true };
    }
}

/**
 * Get client IP from request headers
 * Works with Vercel's edge network
 */
export function getClientIP(request: Request): string {
    // Vercel provides the client IP in x-forwarded-for
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }

    // Fallback headers
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP;

    // Final fallback
    return 'unknown';
}

/**
 * Helper function to apply rate limiting to an API route
 * Call this at the start of your API handler
 * 
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *     const rateLimitResult = await applyRateLimit(request, 'auth');
 *     if (rateLimitResult) return rateLimitResult;
 *     
 *     // ... rest of your handler
 * }
 * ```
 */
export async function applyRateLimit(
    request: Request,
    type: RateLimitType = 'api'
): Promise<NextResponse | null> {
    const ip = getClientIP(request);
    const result = await checkRateLimit(ip, type);

    if (!result.success && result.response) {
        return result.response;
    }

    return null;
}
