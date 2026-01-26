import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decodePositionKey } from '@/lib/utils/position-key';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key } = await params;
        const positionKey = decodePositionKey(key);

        const tags = await prisma.positionTag.findMany({
            where: {
                positionKey,
                userId: session.user.id,
            },
            include: {
                tagDefinition: true,
            },
        });

        return NextResponse.json({ tags });
    } catch (error) {
        console.error('Error fetching position tags:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key } = await params;
        const positionKey = decodePositionKey(key);
        const body = await req.json();
        const { tagDefinitionIds, notes } = body;

        if (!Array.isArray(tagDefinitionIds) || tagDefinitionIds.length === 0) {
            return NextResponse.json({ error: 'tagDefinitionIds array is required' }, { status: 400 });
        }

        // Create tags
        // We use upsert or just create and ignore duplicates
        const results = await Promise.all(
            tagDefinitionIds.map(async (id) => {
                try {
                    return await prisma.positionTag.upsert({
                        where: {
                            positionKey_tagDefinitionId: {
                                positionKey,
                                tagDefinitionId: id,
                            },
                        },
                        update: {
                            notes: notes !== undefined ? notes : undefined,
                        },
                        create: {
                            positionKey,
                            tagDefinitionId: id,
                            userId: session.user!.id,
                            notes,
                        },
                    });
                } catch (e) {
                    console.error(`Error tagging position ${positionKey} with tag ${id}:`, e);
                    return null;
                }
            })
        );

        return NextResponse.json({ success: true, tags: results.filter(r => r !== null) });
    } catch (error) {
        console.error('Error tagging position:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
