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
            select: {
                stripeCustomerId: true,
            }
        });

        if (!user?.stripeCustomerId) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
        }

        const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://arthatrades.com';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${appUrl}/settings?billing_updated=true`,
        });

        return NextResponse.json({ url: portalSession.url });

    } catch (error: any) {
        console.error('[Stripe Portal Error]:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
