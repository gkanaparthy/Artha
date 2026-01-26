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
        const { tagOrders } = body; // Array of { id: string, sortOrder: number }

        if (!Array.isArray(tagOrders)) {
            return NextResponse.json({ error: 'tagOrders must be an array' }, { status: 400 });
        }

        // Update each tag's sort order
        // We'll use a transaction to ensure all updates succeed or fail together
        await prisma.$transaction(
            tagOrders.map((item) =>
                prisma.tagDefinition.update({
                    where: {
                        id: item.id,
                        userId: session.user!.id // Security: ensure user owns the tag
                    },
                    data: { sortOrder: item.sortOrder },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error reordering tags:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
