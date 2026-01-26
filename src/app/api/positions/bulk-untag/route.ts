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
        const { positionKeys, tagDefinitionIds } = body;

        if (!Array.isArray(positionKeys) || !Array.isArray(tagDefinitionIds)) {
            return NextResponse.json({ error: 'positionKeys and tagDefinitionIds arrays are required' }, { status: 400 });
        }

        await prisma.positionTag.deleteMany({
            where: {
                userId: session.user.id,
                positionKey: { in: positionKeys },
                tagDefinitionId: { in: tagDefinitionIds },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error bulk untagging positions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
