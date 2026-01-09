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

// POST to create/tag trades manually if needed? 
// For now only fetching.
