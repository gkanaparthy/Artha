import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { insightsDataService } from "@/lib/services/insights-data.service";
import { llmManager } from "@/lib/llm/manager";
import { applyRateLimit } from "@/lib/ratelimit";
import { FilterOptions } from "@/types/trading";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Rate Limit Check (10 requests per hour for insights)
        const rateLimitResponse = await applyRateLimit(req, "insights");
        if (rateLimitResponse) return rateLimitResponse;

        // 2. Extract filters
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const accountId = searchParams.get("accountId");

        const filters: FilterOptions = {};
        if (startDate) {
            const d = new Date(startDate);
            if (isNaN(d.getTime())) {
                return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
            }
            filters.startDate = d;
        }
        if (endDate) {
            const d = new Date(endDate);
            if (isNaN(d.getTime())) {
                return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
            }
            filters.endDate = d;
        }
        if (accountId && accountId !== "all") filters.accountId = accountId;

        // 3. Aggregate Data
        console.log(`[InsightsAPI] Aggregating data for customer: ${session.user.id}`);
        const dataSummary = await insightsDataService.getInsightDataSummary(session.user.id, filters);

        if (dataSummary.performance.totalTrades === 0) {
            return NextResponse.json({
                insights: "No trades found for this period. Please sync your broker or adjust your filters to generate insights.",
                cached: false,
                timestamp: new Date().toISOString(),
                provider: "None"
            });
        }

        // 4. Check Cache
        const { getCachedInsight, setCachedInsight, generateFilterHash } = await import("@/lib/cache/insights-cache");

        // Fetch last sync time to include in hash for auto-invalidation
        const lastSync = await prisma.brokerAccount.findFirst({
            where: { userId: session.user.id },
            orderBy: { lastSyncedAt: 'desc' },
            select: { lastSyncedAt: true }
        });

        const filterHash = generateFilterHash({ ...filters, lastSync: lastSync?.lastSyncedAt?.getTime() });
        const cached = await getCachedInsight(session.user.id, filterHash);

        if (cached) {
            console.log(`[InsightsAPI] Returning cached insights for ${session.user.id}`);
            return NextResponse.json({
                insights: cached,
                cached: true,
                timestamp: new Date().toISOString(),
                provider: "Cache"
            });
        }

        // 5. Generate Insights
        console.log(`[InsightsAPI] Sending request to LLM Manager...`);
        const { insights, provider } = await llmManager.generateInsights(dataSummary);

        // 6. Set Cache
        await setCachedInsight(session.user.id, filterHash, insights);

        return NextResponse.json({
            insights,
            cached: false,
            timestamp: new Date().toISOString(),
            provider
        });

    } catch (error: unknown) {
        console.error("[InsightsAPI] Fatal Error:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
