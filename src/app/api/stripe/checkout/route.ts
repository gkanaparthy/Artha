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
                isGrandfathered: true,
                trialEndsAt: true,
                stripeSubscriptionId: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 1b. Block users who already have active paid access or pending payment issues
        // TRIALING is now ALLOWED (reverse trial — user is locking in their plan)
        // But block TRIALING users who already committed (have a Stripe subscription)
        if (['ACTIVE', 'LIFETIME', 'GRANDFATHERED', 'PAST_DUE'].includes(user.subscriptionStatus || '')) {
            return NextResponse.json({
                error: 'You already have an active subscription or Pro access.'
            }, { status: 400 });
        }

        if (user.subscriptionStatus === 'TRIALING' && user.stripeSubscriptionId) {
            return NextResponse.json({
                error: 'You have already locked in your plan. It will start when your trial ends.'
            }, { status: 400 });
        }

        // Block CANCELLED users who still have an active subscription (should resume instead)
        if (user.subscriptionStatus === 'CANCELLED' && user.stripeSubscriptionId) {
            return NextResponse.json({
                error: 'Your subscription is scheduled to cancel. Please resume it from Settings instead of creating a new one.'
            }, { status: 400 });
        }

        // 2. Determine Tier (Founder vs Regular)
        // Only count users who have committed to pay (not app-only trialing users)
        const activeFoundersCount = await prisma.user.count({
            where: {
                subscriptionTier: 'FOUNDER',
                OR: [
                    { subscriptionStatus: { in: ['ACTIVE', 'LIFETIME'] } },
                    { subscriptionStatus: 'TRIALING', stripeSubscriptionId: { not: null } },
                ]
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

            // Subscription settings (only for recurring subscriptions)
            ...(isLifetime ? {} : {
                subscription_data: {
                    // Reverse trial: if user is TRIALING, carry over remaining trial days
                    // If user is FREE/NONE/EXPIRED/CANCELLED, charge immediately (no trial)
                    ...(user.subscriptionStatus === 'TRIALING' && user.trialEndsAt && user.trialEndsAt.getTime() > Date.now()
                        ? { trial_end: Math.floor(user.trialEndsAt.getTime() / 1000) }
                        : {}
                    ),
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
