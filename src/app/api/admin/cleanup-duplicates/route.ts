import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/cleanup-duplicates
 * Removes duplicate trades from the database.
 * Duplicates are identified by same: symbol, action, quantity, price, timestamp
 * Only keeps the first occurrence (oldest createdAt).
 */
export async function POST() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin access for this destructive operation
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || session.user.email !== adminEmail) {
            return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        }

        // Get all trades for this user
        const trades = await prisma.trade.findMany({
            where: {
                account: { userId: session.user.id }
            },
            orderBy: [
                { timestamp: 'asc' },
                { createdAt: 'asc' }
            ]
        });

        // Find duplicates based on content
        const seen = new Map<string, string>(); // key -> first trade ID to keep
        const duplicateIds: string[] = [];

        for (const trade of trades) {
            const key = `${trade.symbol}|${trade.action}|${trade.quantity}|${trade.price}|${trade.timestamp.toISOString()}`;

            if (seen.has(key)) {
                // This is a duplicate, mark for deletion
                duplicateIds.push(trade.id);
            } else {
                // First occurrence, keep it
                seen.set(key, trade.id);
            }
        }

        if (duplicateIds.length === 0) {
            return NextResponse.json({
                message: 'No duplicates found',
                totalTrades: trades.length,
                deletedCount: 0
            });
        }

        // Delete duplicates
        const deleteResult = await prisma.trade.deleteMany({
            where: {
                id: { in: duplicateIds }
            }
        });

        return NextResponse.json({
            message: `Successfully removed ${deleteResult.count} duplicate trades`,
            totalTrades: trades.length,
            deletedCount: deleteResult.count,
            remainingTrades: trades.length - deleteResult.count
        });

    } catch (error) {
        console.error('Cleanup duplicates error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
