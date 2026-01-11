import { NextResponse } from 'next/server';
import { createRLSClient } from '@/lib/prisma-rls';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use RLS-enabled client
        const db = createRLSClient(session.user.id);

        // RLS will automatically filter to only this user's trades
        const trades = await db.trade.findMany({
            orderBy: {
                timestamp: 'desc'
            },
            include: {
                tags: true,
                account: {
                    select: { brokerName: true }
                }
            }
        });

        return NextResponse.json({ trades });
    } catch (error: unknown) {
        console.error('Get Trades error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}


export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const tradeId = searchParams.get('id');

        if (!tradeId) {
            return NextResponse.json({ error: 'Trade ID required' }, { status: 400 });
        }

        // Use RLS-enabled client
        const db = createRLSClient(session.user.id);

        // RLS ensures trade belongs to user's account
        const trade = await db.trade.findUnique({
            where: { id: tradeId },
        });

        if (!trade) {
            return NextResponse.json({ error: 'Trade not found or unauthorized' }, { status: 404 });
        }

        await db.trade.delete({
            where: { id: tradeId }
        });

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Delete trade error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
