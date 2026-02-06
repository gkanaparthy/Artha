import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { stripeSubscriptionId: true }
        });

        if (!user?.stripeSubscriptionId) {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
        }

        // Set to cancel at end of period
        const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        return NextResponse.json({ success: true, subscription });
    } catch (error: any) {
        console.error('[Subscription Cancel Error]:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
