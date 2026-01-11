import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/prisma-rls";
import { SnapTradeService } from "@/lib/services/snaptrade.service";

/**
 * GET /api/cron/sync-all
 * 
 * Cron job endpoint that syncs trades for ALL users with connected SnapTrade accounts.
 * Runs automatically based on Vercel Cron configuration.
 * 
 * Security: Protected by CRON_SECRET to prevent unauthorized access.
 * 
 * NOTE: This endpoint uses createServiceClient() which bypasses RLS.
 * This is intentional - cron jobs need to access all users' data.
 */
export async function GET(request: Request) {
    try {
        // Verify cron secret to prevent unauthorized access
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error("[Cron Sync] CRON_SECRET not configured");
            return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error("[Cron Sync] Unauthorized cron request");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        console.log("[Cron Sync] Starting scheduled sync for all users...");

        // Use service client (bypasses RLS) for admin operations
        const prisma = createServiceClient();

        // Find all users with SnapTrade credentials
        const usersWithSnapTrade = await prisma.user.findMany({
            where: {
                AND: [
                    { snapTradeUserId: { not: null } },
                    { snapTradeUserSecret: { not: null } }
                ]
            },
            select: {
                id: true,
                email: true,
                snapTradeUserId: true,
            }
        });

        console.log(`[Cron Sync] Found ${usersWithSnapTrade.length} users with SnapTrade accounts`);

        const snapTradeService = new SnapTradeService();
        const results: { userId: string; email: string | null; success: boolean; trades?: number; error?: string }[] = [];

        for (const user of usersWithSnapTrade) {
            try {
                console.log(`[Cron Sync] Syncing user ${user.id} (${user.email})...`);

                // syncTrades uses RLS internally with the user's ID
                const syncResult = await snapTradeService.syncTrades(user.id);

                results.push({
                    userId: user.id,
                    email: user.email,
                    success: true,
                    trades: syncResult.synced,
                });

                console.log(`[Cron Sync] User ${user.id}: Synced ${syncResult.synced} trades`);

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error";
                console.error(`[Cron Sync] User ${user.id} failed:`, errorMessage);

                results.push({
                    userId: user.id,
                    email: user.email,
                    success: false,
                    error: errorMessage,
                });
            }

            // Small delay between users to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalTrades = results.reduce((sum, r) => sum + (r.trades || 0), 0);

        console.log(`[Cron Sync] Complete! Success: ${successful}, Failed: ${failed}, Total trades: ${totalTrades}`);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            summary: {
                totalUsers: usersWithSnapTrade.length,
                successful,
                failed,
                totalTrades,
            },
            results,
        });

    } catch (error) {
        console.error("[Cron Sync] Fatal error:", error);
        return NextResponse.json(
            { error: "Cron sync failed", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}

// Vercel Cron requires explicit runtime configuration
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for Pro plan
