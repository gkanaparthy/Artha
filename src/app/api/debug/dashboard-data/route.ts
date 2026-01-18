import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Diagnostic endpoint to check why dashboards are empty
 * GET /api/debug/dashboard-data
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const userId = session.user.id;

        // Check broker accounts
        const brokerAccounts = await prisma.brokerAccount.findMany({
            where: { userId },
            select: {
                id: true,
                brokerName: true,
                snapTradeAccountId: true,
                _count: {
                    select: { trades: true }
                }
            }
        });

        // Check trades
        const totalTrades = await prisma.trade.count({
            where: { account: { userId } }
        });

        // Check if trades have required actions
        const tradeActions = await prisma.trade.groupBy({
            by: ['action'],
            where: { account: { userId } },
            _count: true
        });

        // Check most recent trade
        const recentTrade = await prisma.trade.findFirst({
            where: { account: { userId } },
            orderBy: { timestamp: 'desc' },
            select: {
                symbol: true,
                action: true,
                timestamp: true,
                quantity: true,
                price: true
            }
        });

        return NextResponse.json({
            userId,
            userName: session.user.name || session.user.email,
            brokerAccounts: brokerAccounts.length,
            brokerAccountDetails: brokerAccounts,
            totalTrades,
            tradeActions,
            recentTrade,
            timestamp: new Date().toISOString()
        });

    } catch (error: unknown) {
        console.error('[Dashboard Debug] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
    }
}
