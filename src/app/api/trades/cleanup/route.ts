import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/ratelimit";

// DELETE /api/trades/cleanup - Deletes all trades for the current user
export async function DELETE(request: NextRequest) {
    try {
        // Rate limit: 5 requests per minute for destructive bulk operations
        const rateLimitResponse = await applyRateLimit(request, 'destructive');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Get all broker accounts for this user
        const accounts = await prisma.brokerAccount.findMany({
            where: { userId },
            select: { id: true },
        });

        const accountIds = accounts.map((a) => a.id);

        // Delete all trades for these accounts
        const result = await prisma.trade.deleteMany({
            where: {
                accountId: { in: accountIds },
            },
        });

        console.log(`[Cleanup] Deleted ${result.count} trades for user ${userId}`);

        return NextResponse.json({
            success: true,
            deleted: result.count,
            message: `Deleted ${result.count} trades. Re-sync to import fresh data.`
        });
    } catch (error) {
        console.error("[API] Delete trades error:", error);
        return NextResponse.json(
            { error: "Failed to delete trades" },
            { status: 500 }
        );
    }
}
