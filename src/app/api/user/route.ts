import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { safeDecrypt } from '@/lib/encryption';

export async function GET() {
    try {
        const session = await auth();

        // Debug logging for connection issues
        console.log('[API /user] Session check:', {
            hasSession: !!session,
            hasUser: !!session?.user,
            userId: session?.user?.id || 'MISSING',
            email: session?.user?.email || 'MISSING'
        });

        if (!session?.user?.id) {
            console.error('[API /user] Unauthorized - session.user.id is missing');
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

export async function PATCH(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { aiPersona } = body;

        if (!aiPersona || !['PROFESSIONAL', 'CANDOR'].includes(aiPersona)) {
            return NextResponse.json({ error: 'Invalid persona' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: { aiPersona },
        });

        return NextResponse.json(user);

    } catch (error: unknown) {
        console.error('User update error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
