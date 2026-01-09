import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accounts = await prisma.brokerAccount.findMany({
            where: {
                userId: session.user.id
            },
            select: {
                id: true,
                brokerName: true,
                snapTradeAccountId: true,
            }
        });

        return NextResponse.json({ accounts });

    } catch (error: unknown) {
        console.error('Accounts error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
