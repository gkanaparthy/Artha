import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verify ownership
        const tag = await prisma.tagDefinition.findUnique({
            where: { id },
        });

        if (!tag || tag.userId !== session.user.id) {
            return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
        }

        const updatedTag = await prisma.tagDefinition.update({
            where: { id },
            data: { isArchived: false },
        });

        return NextResponse.json({ success: true, tag: updatedTag });
    } catch (error) {
        console.error('Error restoring tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
