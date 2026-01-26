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

        const data = [];
        for (const positionKey of positionKeys) {
            for (const tagDefinitionId of tagDefinitionIds) {
                data.push({
                    positionKey,
                    tagDefinitionId,
                    userId: session.user!.id,
                });
            }
        }

        const BATCH_SIZE = 1000;
        let count = 0;

        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const result = await prisma.positionTag.createMany({
                data: batch,
                skipDuplicates: true,
            });
            count += result.count;
        }

        return NextResponse.json({ success: true, count });
    } catch (error) {
        console.error('Error bulk tagging positions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
