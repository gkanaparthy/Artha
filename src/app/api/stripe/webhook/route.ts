import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { SubscriptionStatus, SubscriptionPlan, SubscriptionTier, PaymentStatus } from '@prisma/client';
import { PRICING_CONFIG, getPlanFromPriceId } from '@/config/pricing';
import {
    sendSubscriptionActivatedEmail,
    sendLifetimeWelcomeEmail,
    sendPaymentFailedEmail
} from '@/lib/email';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not set');
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Check for idempotency
    try {
        const existingEvent = await prisma.subscriptionEvent.findUnique({
            where: { stripeEventId: event.id }
        });
        if (existingEvent) {
            console.log(`[Webhook] Event ${event.id} already processed. Skipping.`);
            return NextResponse.json({ received: true });
        }
    } catch (dbError) {
        console.warn('[Webhook] Failed to check for existing event:', dbError);
    }

    const session = event.data.object as any;

    // Capture userId and customerId for logging later
    const userId = session.metadata?.userId || session.subscription_data?.metadata?.userId || 'unknown';
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(session);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(session as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(session as Stripe.Subscription);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(session as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(session as Stripe.Invoice);
                break;
        }
    } catch (handlerError) {
        console.error(`Error handling event ${event.type}:`, handlerError);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    // Log the event for audit trail only AFTER successful processing (idempotency commit)
    try {
        await prisma.subscriptionEvent.create({
            data: {
                userId: userId !== 'unknown' ? userId : (await findUserIdByStripeCustomer(customerId)),
                eventType: event.type,
                eventData: session as any,
                stripeEventId: event.id
            }
        });
    } catch (logError) {
        // If logging fails but handler succeeded, we still return 200 to prevent infinite Stripe retries
        // since the actual business logic finished.
        console.error('Failed to log subscription event completion:', logError);
    }

    return NextResponse.json({ received: true });
}

async function findUserIdByStripeCustomer(customerId: string): Promise<string> {
    if (!customerId) return 'unknown';
    const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
        select: { id: true }
    });
    return user?.id || 'unknown';
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const isLifetime = session.mode === 'payment';
    const plan = session.metadata?.plan as SubscriptionPlan;
    const tier = session.metadata?.tier as SubscriptionTier;

    if (isLifetime) {
        // Only send and update if not already lifetime (prevent duplicates)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { subscriptionStatus: true, email: true, name: true }
        });

        if (user && user.subscriptionStatus !== 'LIFETIME') {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    subscriptionStatus: 'LIFETIME',
                    subscriptionPlan: 'LIFETIME',
                    subscriptionTier: tier,
                    isFounder: tier === 'FOUNDER',
                    lifetimePurchasedAt: new Date(),
                    lifetimeAmount: session.amount_total ? session.amount_total / 100 : null,
                }
            });

            // Log the payment
            if (session.payment_intent) {
                await prisma.paymentHistory.create({
                    data: {
                        userId,
                        stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id,
                        amount: session.amount_total ? session.amount_total / 100 : 0,
                        status: 'SUCCEEDED',
                        description: `Lifetime Membership (${tier})`
                    }
                });
            }

            // Send Lifetime Welcome Email
            if (user.email) {
                await sendLifetimeWelcomeEmail(user.email, user.name?.split(' ')[0]);
            }
        }
    } else {
        // Reverse trial: user is upgrading during trial or from free tier
        // Do NOT reset trialStartedAt or trialEndsAt — these were set on signup
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { trialStartedAt: true, email: true, name: true, subscriptionStatus: true }
        });

        await prisma.user.update({
            where: { id: userId },
            data: {
                stripeSubscriptionId: session.subscription as string,
                // Keep TRIALING if user is in trial, otherwise the subscription.updated webhook will set ACTIVE
                subscriptionStatus: user?.subscriptionStatus === 'TRIALING' ? 'TRIALING' : 'ACTIVE',
                subscriptionPlan: plan,
                subscriptionTier: tier,
                isFounder: tier === 'FOUNDER',
                // Never reset trial dates — they were set on signup
            }
        });

        // Send appropriate welcome email
        if (user && user.email) {
            const isUpgradeFromFree = ['FREE', 'EXPIRED', 'NONE'].includes(user.subscriptionStatus);
            if (isUpgradeFromFree) {
                await sendSubscriptionActivatedEmail(user.email, user.name?.split(' ')[0]);
            }
            // TRIALING users already got trial welcome on signup — no email needed
        }
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    if (!customerId) return;

    const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId }
    });

    if (!user) return;

    // Never overwrite LIFETIME or GRANDFATHERED status from subscription webhooks
    if (['LIFETIME', 'GRANDFATHERED'].includes(user.subscriptionStatus)) return;

    let status: SubscriptionStatus = 'ACTIVE';
    if (subscription.status === 'trialing') status = 'TRIALING';
    if (subscription.status === 'past_due') status = 'PAST_DUE';
    if (subscription.status === 'canceled') status = 'CANCELLED';
    if (subscription.status === 'unpaid') status = 'FREE';

    // If cancel_at_period_end is true, mark as CANCELLED even if still active or trialing
    if (subscription.cancel_at_period_end && (status === 'ACTIVE' || status === 'TRIALING')) {
        status = 'CANCELLED';
    }

    // Cast to access period fields (exist at runtime but may not be in older type definitions)
    const sub = subscription as Stripe.Subscription & {
        current_period_end: number;
        current_period_start: number;
    };

    // Guard against empty subscription items
    if (!subscription.items.data[0]) return;

    const priceId = subscription.items.data[0].price.id;
    const plan = getPlanFromPriceId(priceId);

    // Determine tier from price ID by checking if it contains 'FOUNDER' in our config
    let tier: SubscriptionTier | undefined;
    if (plan) {
        const planConfig = (PRICING_CONFIG.PLANS as any)[plan];
        if (planConfig.priceIds.FOUNDER === priceId) tier = 'FOUNDER';
        if (planConfig.priceIds.REGULAR === priceId) tier = 'REGULAR';
    }

    // Only overwrite trialEndsAt if Stripe has a value; preserve app-set trial dates
    const trialEndsAt = subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : user.trialEndsAt;

    await prisma.user.update({
        where: { id: user.id },
        data: {
            subscriptionStatus: status,
            subscriptionPlan: plan || user.subscriptionPlan,
            subscriptionTier: tier || user.subscriptionTier,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            trialEndsAt,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        }
    });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;
    if (!customerId) return;

    const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId }
    });

    if (!user) return;

    // Never downgrade LIFETIME or GRANDFATHERED users
    if (['LIFETIME', 'GRANDFATHERED'].includes(user.subscriptionStatus)) return;

    // Reverse trial: downgrade to FREE tier (not EXPIRED)
    // User keeps free tier access — can view data, just can't use Pro features
    await prisma.user.update({
        where: { id: user.id },
        data: {
            subscriptionStatus: 'FREE',
            stripeSubscriptionId: null,
            currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : new Date(),
        }
    });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    if (!invoice.customer) return;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId }
    });

    if (!user) return;

    // Cast to access fields that exist at runtime but may not be in older type definitions
    const inv = invoice as Stripe.Invoice & {
        payment_intent?: string | { id: string } | null;
        amount_paid: number;
        billing_reason?: string | null;
    };

    // Log payment history
    await prisma.paymentHistory.create({
        data: {
            userId: user.id,
            stripePaymentId: (typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id) || `inv_${invoice.id}`,
            stripeInvoiceId: invoice.id,
            amount: inv.amount_paid / 100,
            currency: invoice.currency,
            status: 'SUCCEEDED',
            description: inv.billing_reason || 'Monthly Subscription'
        }
    });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.customer) return;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId }
    });

    if (!user) return;

    // Cast to access fields that exist at runtime but may not be in older type definitions
    const inv = invoice as Stripe.Invoice & {
        payment_intent?: string | { id: string } | null;
        amount_due: number;
        billing_reason?: string | null;
    };

    await prisma.paymentHistory.create({
        data: {
            userId: user.id,
            stripePaymentId: (typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent?.id) || `inv_${invoice.id}`,
            stripeInvoiceId: invoice.id,
            amount: inv.amount_due / 100,
            currency: invoice.currency,
            status: 'FAILED',
            description: `Payment failed for ${inv.billing_reason}`
        }
    });

    // The subscription update (PAST_DUE) will be handled by customer.subscription.updated

    // Send Payment Failed Email
    if (user.email) {
        await sendPaymentFailedEmail(user.email, inv.amount_due / 100);
    }
}
