import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decodePositionKey } from '@/lib/utils/position-key';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ key: string, tagId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key, tagId } = await params;
        const positionKey = decodePositionKey(key);

        // Use deleteMany to ensure we only delete tags belonging to the current user
        await prisma.positionTag.deleteMany({
            where: {
                positionKey,
                tagDefinitionId: tagId,
                userId: session.user.id
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing position tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
