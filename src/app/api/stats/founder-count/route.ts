import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Count active founders (matches checkout logic)
        const founderCount = await prisma.user.count({
            where: {
                subscriptionTier: 'FOUNDER',
                subscriptionStatus: {
                    in: ['ACTIVE', 'LIFETIME', 'TRIALING']
                }
            }
        });

        // 2. Count grandfathered users (for the Clause card)
        const grandfatheredCount = await prisma.user.count({
            where: {
                isGrandfathered: true
            }
        });

        return NextResponse.json({
            // Sum both for specific "Social Proof" (shows 77 remaining instead of 100)
            count: founderCount + grandfatheredCount,
            grandfatheredCount
        });
    } catch (error) {
        console.error('[Stats API Error]:', error);
        return NextResponse.json({ count: 0, grandfatheredCount: 0 }, { status: 500 });
    }
}
