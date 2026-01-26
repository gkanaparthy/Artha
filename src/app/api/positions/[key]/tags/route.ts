import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decodePositionKey } from '@/lib/utils/position-key';
import { applyRateLimit } from '@/lib/ratelimit';

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
        const rateLimitResponse = await applyRateLimit(req, 'api');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { key } = await params;
        const positionKey = decodePositionKey(key);
        const body = await req.json();
        const { tagDefinitionIds } = body;

        if (!Array.isArray(tagDefinitionIds) || tagDefinitionIds.length === 0) {
            return NextResponse.json({ error: 'tagDefinitionIds array is required' }, { status: 400 });
        }

        // 1. Validate positionKey exists in trades table (Bug #5)
        const tradeExists = await prisma.trade.findFirst({
            where: {
                positionKey,
                account: { userId: session.user.id }
            }
        });

        if (!tradeExists) {
            return NextResponse.json({ error: 'Position not found or unauthorized' }, { status: 404 });
        }

        // 2. Enforce Max 10 tags per position (Bug #6)
        const currentTagCount = await prisma.positionTag.count({
            where: {
                positionKey,
                userId: session.user.id
            }
        });

        // Calculate how many new unique tags we are adding
        const existingTags = await prisma.positionTag.findMany({
            where: {
                positionKey,
                tagDefinitionId: { in: tagDefinitionIds },
                userId: session.user.id
            },
            select: { tagDefinitionId: true }
        });
        const existingIds = new Set(existingTags.map(t => t.tagDefinitionId));
        const newUniqueTagsCount = tagDefinitionIds.filter(id => !existingIds.has(id)).length;

        if (currentTagCount + newUniqueTagsCount > 10) {
            return NextResponse.json({
                error: `Cannot exceed 10 tags per position. Current: ${currentTagCount}, adding: ${newUniqueTagsCount}`
            }, { status: 400 });
        }

        // Create tags
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
                        update: {},
                        create: {
                            positionKey,
                            tagDefinitionId: id,
                            userId: session.user.id,
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
