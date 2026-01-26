import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { TagCategory } from '@prisma/client';
import { applyRateLimit } from '@/lib/ratelimit';

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(req, 'api');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { name, category, color, description, icon, isArchived, sortOrder } = body;

        // Verify ownership
        const tag = await prisma.tagDefinition.findUnique({
            where: { id },
        });

        if (!tag || tag.userId !== session.user.id) {
            return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
        }

        // Prepare update data
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (category !== undefined) {
            if (!Object.values(TagCategory).includes(category)) {
                return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
            }
            updateData.category = category as TagCategory;
        }
        if (color !== undefined) updateData.color = color;
        if (description !== undefined) updateData.description = description;
        if (icon !== undefined) updateData.icon = icon;
        if (isArchived !== undefined) updateData.isArchived = isArchived;
        if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

        // Check for name collision if name is changing
        if (name && name !== tag.name) {
            const existing = await prisma.tagDefinition.findUnique({
                where: {
                    userId_name: {
                        userId: session.user.id,
                        name: name,
                    },
                },
            });
            if (existing) {
                return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 });
            }
        }

        const updatedTag = await prisma.tagDefinition.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ tag: updatedTag });
    } catch (error) {
        console.error('Error updating tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const rateLimitResponse = await applyRateLimit(req, 'delete');
        if (rateLimitResponse) return rateLimitResponse;

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

        // Soft delete by default
        const updatedTag = await prisma.tagDefinition.update({
            where: { id },
            data: { isArchived: true },
        });

        return NextResponse.json({ success: true, tag: updatedTag });
    } catch (error) {
        console.error('Error deleting tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
