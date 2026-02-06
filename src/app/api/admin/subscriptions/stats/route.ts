import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || session.user.email !== adminEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 1. Subscription Status breakdown
        const statusCounts = await prisma.user.groupBy({
            by: ['subscriptionStatus'],
            _count: {
                id: true
            }
        });

        // 2. Plan breakdown
        const planCounts = await prisma.user.groupBy({
            by: ['subscriptionPlan'],
            _count: {
                id: true
            },
            where: {
                subscriptionPlan: { not: null }
            }
        });

        // 3. Detailed breakdown for MRR calculation
        const mrrBreakdown = await prisma.user.groupBy({
            by: ['subscriptionPlan', 'subscriptionTier'],
            _count: {
                id: true
            },
            where: {
                subscriptionStatus: 'ACTIVE',
                subscriptionPlan: { in: ['MONTHLY', 'ANNUAL'] }
            }
        });

        // Prices matching the actual Stripe pricing configuration
        const PRICES = {
            MONTHLY: { FOUNDER: 12, REGULAR: 20 },
            ANNUAL: { FOUNDER: 120, REGULAR: 200 }
        };

        let mrr = 0;
        mrrBreakdown.forEach(group => {
            const plan = group.subscriptionPlan as 'MONTHLY' | 'ANNUAL';
            const tier = group.subscriptionTier as 'FOUNDER' | 'REGULAR';
            const count = group._count.id;

            if (plan === 'MONTHLY') {
                mrr += count * PRICES.MONTHLY[tier];
            } else if (plan === 'ANNUAL') {
                mrr += (count * PRICES.ANNUAL[tier]) / 12;
            }
        });

        // 4. Founder status
        const founderCount = await prisma.user.count({
            where: {
                isFounder: true,
                subscriptionStatus: { in: ['ACTIVE', 'LIFETIME', 'TRIALING'] }
            }
        });

        // 5. Revenue metrics (Calculated from PaymentHistory)
        const revenueMetrics = await prisma.paymentHistory.aggregate({
            _sum: {
                amount: true
            },
            where: {
                status: 'SUCCEEDED'
            }
        });

        // 6. Recent payments
        const recentPayments = await prisma.paymentHistory.findMany({
            take: 10,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({
            statusCounts: statusCounts.reduce((acc: any, curr) => {
                acc[curr.subscriptionStatus] = curr._count.id;
                return acc;
            }, {}),
            planCounts: planCounts.reduce((acc: any, curr) => {
                if (curr.subscriptionPlan) acc[curr.subscriptionPlan] = curr._count.id;
                return acc;
            }, {}),
            founderCount,
            totalRevenue: revenueMetrics._sum.amount || 0,
            mrr: Math.round(mrr),
            recentPayments
        });
    } catch (error) {
        console.error('[Admin Subscription Stats Error]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
