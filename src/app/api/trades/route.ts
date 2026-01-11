import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const trades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: session.user.id
                }
            },
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

        // Verify trade belongs to user's account
        const trade = await prisma.trade.findUnique({
            where: { id: tradeId },
            include: { account: true }
        });

        if (!trade || trade.account.userId !== session.user.id) {
            return NextResponse.json({ error: 'Trade not found or unauthorized' }, { status: 404 });
        }

        await prisma.trade.delete({
            where: { id: tradeId }
        });

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Delete trade error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
