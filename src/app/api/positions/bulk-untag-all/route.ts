import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { positionKeys } = body;

        if (!Array.isArray(positionKeys)) {
            return NextResponse.json({ error: 'positionKeys array is required' }, { status: 400 });
        }

        await prisma.positionTag.deleteMany({
            where: {
                userId: session.user.id,
                positionKey: { in: positionKeys },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error clearing position tags:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
