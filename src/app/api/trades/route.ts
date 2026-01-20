import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { applyRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const symbolFilter = searchParams.get('symbol');

        const whereClause: any = {
            account: {
                userId: session.user.id
            }
        };

        if (symbolFilter) {
            const symbols = symbolFilter.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
            if (symbols.length > 0) {
                whereClause.OR = symbols.map(s => ({
                    symbol: {
                        contains: s,
                        mode: 'insensitive'
                    }
                }));
            }
        }

        const trades = await prisma.trade.findMany({
            where: whereClause,
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


export async function DELETE(req: NextRequest) {
    try {
        // Rate limit: 5 requests per minute for delete operations
        const rateLimitResponse = await applyRateLimit(req, 'sync');
        if (rateLimitResponse) return rateLimitResponse;

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
