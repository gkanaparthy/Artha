import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { TagCategory } from '@prisma/client';
import { applyRateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tags = await prisma.tagDefinition.findMany({
            where: {
                userId: session.user.id,
                isArchived: false,
            },
            include: {
                _count: {
                    select: { usages: true }
                }
            },
            orderBy: [
                { category: 'asc' },
                { sortOrder: 'asc' },
                { name: 'asc' },
            ],
        });

        return NextResponse.json({ tags });
    } catch (error) {
        console.error('Error fetching tags:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const rateLimitResponse = await applyRateLimit(req, 'api');
        if (rateLimitResponse) return rateLimitResponse;

        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, category, color, description, icon } = body;

        if (!name || !category) {
            return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
        }

        // Bug #24: Validate icon is a single character (standard emoji) or empty
        if (icon && icon.length > 2) { // 2 for surrogate pairs/emojis
            // Use a regex to check for single emoji if possible, or just length
            // Most emojis are 1 or 2 characters in JS length
            return NextResponse.json({ error: 'Icon must be a single emoji/character' }, { status: 400 });
        }

        // Verify valid category
        if (!Object.values(TagCategory).includes(category)) {
            return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
        }

        if (name.length > 30) {
            return NextResponse.json({ error: 'Tag name must be 30 characters or less' }, { status: 400 });
        }

        // Check for max tags limit (50)
        const totalTags = await prisma.tagDefinition.count({
            where: { userId: session.user.id, isArchived: false }
        });

        if (totalTags >= 50) {
            return NextResponse.json({ error: 'You have reached the maximum limit of 50 active tags.' }, { status: 400 });
        }

        // Check for duplicate name for this user
        const existing = await prisma.tagDefinition.findUnique({
            where: {
                userId_name: {
                    userId: session.user.id,
                    name: name,
                },
            },
        });

        if (existing) {
            if (existing.isArchived) {
                // Auto-restore and update
                const restoredTag = await prisma.tagDefinition.update({
                    where: { id: existing.id },
                    data: {
                        isArchived: false,
                        category: category as TagCategory,
                        color: color || existing.color,
                        description: description || existing.description,
                        icon: icon || existing.icon,
                    }
                });
                return NextResponse.json({ tag: restoredTag, restored: true });
            }
            return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 });
        }

        // Get max sort order for this category to append
        const lastTag = await prisma.tagDefinition.findFirst({
            where: {
                userId: session.user.id,
                category: category as TagCategory,
            },
            orderBy: { sortOrder: 'desc' },
        });

        const newTag = await prisma.tagDefinition.create({
            data: {
                userId: session.user.id,
                name,
                category: category as TagCategory,
                color: color || '#6B7280',
                description,
                icon,
                sortOrder: (lastTag?.sortOrder || 0) + 1,
            },
        });

        return NextResponse.json({ tag: newTag });
    } catch (error) {
        console.error('Error creating tag:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
