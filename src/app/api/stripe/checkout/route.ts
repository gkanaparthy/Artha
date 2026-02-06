import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { getPriceId, PRICING_CONFIG } from '@/config/pricing';

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const body = await req.json();
        const { plan, successUrl, cancelUrl } = body;

        if (!plan || !['MONTHLY', 'ANNUAL', 'LIFETIME'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        // 1. Fetch user to check for existing customer ID
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                stripeCustomerId: true,
                subscriptionStatus: true,
                isGrandfathered: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 1b. Block already-subscribed users (including PAST_DUE to prevent double billing)
        if (['ACTIVE', 'TRIALING', 'LIFETIME', 'GRANDFATHERED', 'PAST_DUE'].includes(user.subscriptionStatus || '')) {
            return NextResponse.json({
                error: 'You already have an active subscription or Pro access.'
            }, { status: 400 });
        }

        // 2. Determine Tier (Founder vs Regular)
        const activeFoundersCount = await prisma.user.count({
            where: {
                subscriptionTier: 'FOUNDER',
                subscriptionStatus: { in: ['ACTIVE', 'LIFETIME', 'TRIALING'] }
            }
        });

        const isFounderPricingAvailable = activeFoundersCount < PRICING_CONFIG.FOUNDER_LIMIT;
        const tier = isFounderPricingAvailable ? 'FOUNDER' : 'REGULAR';
        const priceId = getPriceId(plan, tier);

        if (!priceId) {
            return NextResponse.json({ error: 'Pricing for this tier is not configured yet' }, { status: 500 });
        }

        // 3. Create or Use Customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email || undefined,
                metadata: {
                    userId: userId
                }
            });
            customerId = customer.id;

            await prisma.user.update({
                where: { id: userId },
                data: { stripeCustomerId: customerId }
            });
        }

        // 4. Create Checkout Session
        const isLifetime = plan === 'LIFETIME';

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: customerId,
            customer_update: {
                address: 'auto',
            },
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: isLifetime ? 'payment' : 'subscription',
            success_url: successUrl || `${process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://arthatrades.com'}/dashboard?subscription=success`,
            cancel_url: cancelUrl || `${process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://arthatrades.com'}/settings?subscription=cancelled`,

            // Trial settings (only for recurring subscriptions)
            ...(isLifetime ? {} : {
                subscription_data: {
                    trial_period_days: PRICING_CONFIG.TRIAL_DAYS,
                    metadata: {
                        userId: userId,
                        plan: plan,
                        tier: tier
                    }
                }
            }),

            metadata: {
                userId: userId,
                plan: plan,
                tier: tier
            },

            // Allow promotion codes
            allow_promotion_codes: true,
        });

        return NextResponse.json({ url: checkoutSession.url });

    } catch (error: any) {
        console.error('[Stripe Checkout Error]:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session. Please try again.' },
            { status: 500 }
        );
    }
}
