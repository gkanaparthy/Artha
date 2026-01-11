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

        // RLS will automatically filter to only this user's accounts
        const accounts = await db.brokerAccount.findMany({
            select: {
                id: true,
                brokerName: true,
                snapTradeAccountId: true,
                accountNumber: true,
            }
        });

        return NextResponse.json({ accounts });

    } catch (error: unknown) {
        console.error('Accounts error:', error);
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
        const accountId = searchParams.get('id');

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Use RLS-enabled client
        const db = createRLSClient(session.user.id);

        // RLS will ensure the account belongs to the user
        // If no matching account, findUnique returns null
        const account = await db.brokerAccount.findUnique({
            where: { id: accountId },
        });

        if (!account) {
            return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
        }

        // Delete trades then account (RLS enforced on both)
        await db.trade.deleteMany({
            where: { accountId: accountId }
        });

        await db.brokerAccount.delete({
            where: { id: accountId }
        });

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Delete account error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
