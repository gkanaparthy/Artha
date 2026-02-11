import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sync-status
 *
 * Lightweight status endpoint for dashboard polling.
 * Returns sync status for all broker accounts + total trade count.
 * No SnapTrade API calls — reads from DB only.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.brokerAccount.findMany({
        where: { userId: session.user.id },
        select: {
            id: true,
            brokerName: true,
            syncStatus: true,
            syncStartedAt: true,
            syncCompletedAt: true,
            syncTradeCount: true,
            syncError: true,
            syncRetryCount: true,
            disabled: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    // Only count active (non-disabled) accounts for status
    const activeAccounts = accounts.filter(a => !a.disabled);

    // Compute overall status
    let overall: 'syncing' | 'completed' | 'failed' | 'idle';
    if (activeAccounts.length === 0) {
        overall = 'idle';
    } else if (activeAccounts.some(a => a.syncStatus === 'PENDING' || a.syncStatus === 'IN_PROGRESS')) {
        overall = 'syncing';
    } else if (activeAccounts.some(a => a.syncStatus === 'FAILED') && !activeAccounts.some(a => a.syncStatus === 'PENDING' || a.syncStatus === 'IN_PROGRESS')) {
        overall = 'failed';
    } else {
        overall = 'completed';
    }

    // Quick trade count
    const totalTradeCount = await prisma.trade.count({
        where: { account: { userId: session.user.id } },
    });

    return NextResponse.json({
        overall,
        accounts: activeAccounts.map(a => ({
            id: a.id,
            brokerName: a.brokerName,
            syncStatus: a.syncStatus,
            syncStartedAt: a.syncStartedAt,
            syncCompletedAt: a.syncCompletedAt,
            syncTradeCount: a.syncTradeCount,
            syncError: a.syncError,
            syncRetryCount: a.syncRetryCount,
        })),
        totalTradeCount,
    });
}
