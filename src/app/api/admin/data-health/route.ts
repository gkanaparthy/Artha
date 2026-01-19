import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Admin Data Health Check API
 * GET /api/admin/data-health
 * 
 * Returns a report of suspicious trades that may need manual review.
 */
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only endpoint
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || session.user.email !== adminEmail) {
        return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const userId = session.user.id;
    const now = new Date();
    const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find suspicious trades
    const [futureTrades, oldTrades, zeroPrice, zeroQuantity] = await Promise.all([
        // Trades in the future
        prisma.trade.findMany({
            where: {
                account: { userId },
                timestamp: { gt: oneDayFromNow }
            },
            select: { id: true, symbol: true, timestamp: true, action: true, quantity: true, price: true },
            take: 10
        }),

        // Trades older than 10 years
        prisma.trade.findMany({
            where: {
                account: { userId },
                timestamp: { lt: tenYearsAgo }
            },
            select: { id: true, symbol: true, timestamp: true, action: true, quantity: true, price: true },
            take: 10
        }),

        // Trades with zero/negative price
        prisma.trade.findMany({
            where: {
                account: { userId },
                price: { lte: 0 },
                action: { notIn: ['OPTIONEXPIRATION'] }
            },
            select: { id: true, symbol: true, timestamp: true, action: true, quantity: true, price: true },
            take: 10
        }),

        // Trades with zero quantity
        prisma.trade.findMany({
            where: {
                account: { userId },
                quantity: 0,
                action: { notIn: ['SPLIT', 'DIVIDEND'] }
            },
            select: { id: true, symbol: true, timestamp: true, action: true, quantity: true, price: true },
            take: 10
        })
    ]);

    return NextResponse.json({
        summary: {
            futureTrades: futureTrades.length,
            oldTrades: oldTrades.length,
            zeroPriceTrades: zeroPrice.length,
            zeroQuantityTrades: zeroQuantity.length,
            totalIssues: futureTrades.length + oldTrades.length + zeroPrice.length + zeroQuantity.length
        },
        issues: {
            futureTrades,
            oldTrades,
            zeroPriceTrades: zeroPrice,
            zeroQuantityTrades: zeroQuantity
        },
        recommendation: futureTrades.length + oldTrades.length > 0
            ? 'Review and delete suspicious trades'
            : 'No major data issues detected'
    });
}
