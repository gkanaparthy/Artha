import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { safeDecrypt } from '@/lib/encryption';
import { applyRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

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
                accountNumber: true,
            }
        });

        // Decrypt account numbers before sending to frontend
        const decryptedAccounts = accounts.map(account => ({
            ...account,
            accountNumber: account.accountNumber ? safeDecrypt(account.accountNumber) : null,
        }));

        return NextResponse.json({ accounts: decryptedAccounts });

    } catch (error: unknown) {
        console.error('Accounts error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        // Rate limit: 5 requests per minute for destructive bulk operations
        const rateLimitResponse = await applyRateLimit(req, 'destructive');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('id');
        const hardDelete = searchParams.get('hard') === 'true'; // Optional hard delete flag

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        // Verify account belongs to user
        const account = await prisma.brokerAccount.findUnique({
            where: { id: accountId },
        });

        if (!account || account.userId !== session.user.id) {
            return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
        }

        if (hardDelete) {
            // Hard delete: Remove account and all trades (original behavior)
            await prisma.$transaction([
                prisma.trade.deleteMany({
                    where: { accountId: accountId }
                }),
                prisma.brokerAccount.delete({
                    where: { id: accountId }
                })
            ]);
        } else {
            // Soft delete: Mark as disabled with user-initiated reason
            // This preserves trade history and prevents future syncs
            await prisma.brokerAccount.update({
                where: { id: accountId },
                data: {
                    disabled: true,
                    disabledAt: new Date(),
                    disabledReason: 'User disconnected - will not sync',
                }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Delete account error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
