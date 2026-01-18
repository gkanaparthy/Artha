import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { safeDecrypt } from '@/lib/encryption';

export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                brokerAccounts: {
                    include: {
                        _count: {
                            select: { trades: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Decrypt account numbers before sending to frontend
        const decryptedAccounts = user.brokerAccounts.map(account => ({
            ...account,
            accountNumber: account.accountNumber ? safeDecrypt(account.accountNumber) : null,
        }));

        return NextResponse.json({
            ...user,
            accounts: decryptedAccounts
        });

    } catch (error: unknown) {
        console.error('User fetch error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
