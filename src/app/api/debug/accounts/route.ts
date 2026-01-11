import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createRLSClient } from "@/lib/prisma-rls";

// GET /api/debug/accounts - Debug endpoint to see all accounts and their trade counts
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Use RLS-enabled client
        const db = createRLSClient(session.user.id);

        // Get all broker accounts with trade counts (RLS enforced)
        const accounts = await db.brokerAccount.findMany({
            include: {
                _count: {
                    select: { trades: true }
                }
            }
        });

        // Get trade count by broker name (RLS enforced)
        const tradesByBroker = await db.trade.groupBy({
            by: ['accountId'],
            _count: { id: true }
        });

        // Map accountId to broker name
        const brokerTradeMap = await Promise.all(
            tradesByBroker.map(async (item) => {
                const account = await db.brokerAccount.findUnique({
                    where: { id: item.accountId },
                    select: { brokerName: true, snapTradeAccountId: true }
                });
                return {
                    accountId: item.accountId,
                    brokerName: account?.brokerName,
                    snapTradeAccountId: account?.snapTradeAccountId,
                    tradeCount: item._count.id
                };
            })
        );

        // Get unique brokers from trades (RLS enforced)
        const uniqueBrokersInTrades = await db.trade.findMany({
            select: {
                account: {
                    select: { brokerName: true }
                }
            },
            distinct: ['accountId']
        });

        return NextResponse.json({
            userId: session.user.id,
            totalAccounts: accounts.length,
            accounts: accounts.map(a => ({
                id: a.id,
                brokerName: a.brokerName,
                snapTradeAccountId: a.snapTradeAccountId,
                tradeCount: a._count.trades
            })),
            tradesByAccount: brokerTradeMap,
            uniqueBrokersInTrades: [...new Set(uniqueBrokersInTrades.map(t => t.account.brokerName))]
        });
    } catch (error) {
        console.error("[API] Debug accounts error:", error);
        return NextResponse.json(
            { error: "Failed to fetch debug data" },
            { status: 500 }
        );
    }
}
