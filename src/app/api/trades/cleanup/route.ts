import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRLSClient } from "@/lib/prisma-rls";

// DELETE /api/trades/cleanup - Deletes all trades for the current user
export async function DELETE() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use RLS-enabled client
        const db = createRLSClient(session.user.id);

        // RLS automatically filters to user's accounts
        const accounts = await db.brokerAccount.findMany({
            select: { id: true },
        });

        const accountIds = accounts.map((a) => a.id);

        // Delete all trades for these accounts (RLS ensures only user's trades)
        const result = await db.trade.deleteMany({
            where: {
                accountId: { in: accountIds },
            },
        });

        console.log(`[Cleanup] Deleted ${result.count} trades for user ${session.user.id}`);

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
