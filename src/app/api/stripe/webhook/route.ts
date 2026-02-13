import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { SubscriptionStatus, SubscriptionPlan, SubscriptionTier } from '@prisma/client';
import { PRICING_CONFIG, getPlanFromPriceId } from '@/config/pricing';
import {
    sendSubscriptionActivatedEmail,
    sendLifetimeWelcomeEmail,
    sendPaymentFailedEmail
} from '@/lib/email';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const PROCESSING_STALE_MS = 10 * 60 * 1000;

type ClaimResult = 'claimed' | 'processed' | 'in_progress';
type WebhookEventObject = {
    metadata?: Record<string, string>;
    subscription_data?: { metadata?: Record<string, string> };
    customer?: string | { id?: string };
};

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not set');
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Webhook signature verification failed: ${message}`);
        return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
    }

    const eventObject = event.data.object as unknown as WebhookEventObject;

    // Resolve user for lock ownership and audit
    const metadataUserId = eventObject.metadata?.userId || eventObject.subscription_data?.metadata?.userId;
    const customerId = typeof eventObject.customer === 'string' ? eventObject.customer : eventObject.customer?.id;
    const userId = metadataUserId || (customerId ? await findUserIdByStripeCustomer(customerId) : 'unknown');

    // Acquire processing lock when user is known
    if (userId !== 'unknown') {
        try {
            const claim = await claimWebhookEvent(
                event.id,
                userId,
                event.type,
                event.data.object as unknown as Record<string, unknown>
            );
            if (claim === 'processed') {
                console.log(`[Webhook] Event ${event.id} already processed. Skipping.`);
                return NextResponse.json({ received: true });
            }
            if (claim === 'in_progress') {
                console.log(`[Webhook] Event ${event.id} already in progress. Skipping duplicate delivery.`);
                return NextResponse.json({ received: true });
            }
        } catch (claimError) {
            console.error(`[Webhook] Failed to claim event ${event.id}:`, claimError);
            return NextResponse.json({ error: 'Webhook lock failed' }, { status: 500 });
        }
    } else {
        console.warn(`[Webhook] Could not resolve user for event ${event.id}; proceeding without lock.`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data.object as Stripe.Invoice);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
                break;
        }
    } catch (handlerError) {
        console.error(`Error handling event ${event.type}:`, handlerError);
        if (userId !== 'unknown') {
            await markWebhookEventFailed(event.id, handlerError);
        }
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    if (userId !== 'unknown') {
        try {
            await markWebhookEventProcessed(
                event.id,
                userId,
                event.type,
                event.data.object as unknown as Record<string, unknown>
            );
        } catch (finalizeError) {
            console.error(`[Webhook] Failed to finalize event ${event.id}:`, finalizeError);
            // Return 500 so Stripe retries. Duplicate deliveries are guarded by the processing lock window.
            return NextResponse.json({ error: 'Webhook finalize failed' }, { status: 500 });
        }
    }

    return NextResponse.json({ received: true });
}

async function claimWebhookEvent(
    stripeEventId: string,
    userId: string,
    eventType: string,
    eventData: Record<string, unknown>
): Promise<ClaimResult> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - PROCESSING_STALE_MS);
    const existing = await prisma.subscriptionEvent.findUnique({ where: { stripeEventId } });

    if (existing?.processedAt) return 'processed';
    if (existing?.processingStartedAt && existing.processingStartedAt > staleBefore) return 'in_progress';

    if (existing) {
        await prisma.subscriptionEvent.update({
            where: { id: existing.id },
            data: {
                userId,
                eventType,
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                eventData: eventData as any,
                processingStartedAt: now,
                processedAt: null,
                processingError: null,
                processingAttempts: { increment: 1 }
            }
        });
        return 'claimed';
    }

    try {
        await prisma.subscriptionEvent.create({
            data: {
                userId,
                eventType,
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                eventData: eventData as any,
                stripeEventId,
                processingStartedAt: now,
                processingAttempts: 1
            }
        });
        return 'claimed';
    } catch (createError: unknown) {
        const code = typeof createError === 'object' && createError !== null && 'code' in createError
            ? String((createError as { code: unknown }).code)
            : '';
        if (code !== 'P2002') throw createError;

        const raced = await prisma.subscriptionEvent.findUnique({ where: { stripeEventId } });
        if (!raced) throw createError;
        if (raced.processedAt) return 'processed';
        if (raced.processingStartedAt && raced.processingStartedAt > staleBefore) return 'in_progress';

        await prisma.subscriptionEvent.update({
            where: { id: raced.id },
            data: {
                userId,
                eventType,
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                eventData: eventData as any,
                processingStartedAt: now,
                processedAt: null,
                processingError: null,
                processingAttempts: { increment: 1 }
            }
        });
        return 'claimed';
    }
}

async function markWebhookEventProcessed(
    stripeEventId: string,
    userId: string,
    eventType: string,
    eventData: Record<string, unknown>
) {
    await prisma.subscriptionEvent.update({
        where: { stripeEventId },
        data: {
            userId,
            eventType,
            eventData: eventData as any,
            processedAt: new Date(),
            processingStartedAt: null,
            processingError: null
        }
    });
}

async function markWebhookEventFailed(stripeEventId: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.subscriptionEvent.updateMany({
        where: { stripeEventId },
        data: {
            processingStartedAt: null,
            processingError: message,
        }
    });
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

    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
    if (subscription.status === 'trialing') status = SubscriptionStatus.TRIALING;
    if (subscription.status === 'past_due') status = SubscriptionStatus.PAST_DUE;
    if (subscription.status === 'canceled') status = SubscriptionStatus.CANCELLED;
    if (subscription.status === 'unpaid') status = SubscriptionStatus.FREE;

    // If cancel_at_period_end is true, mark as CANCELLED even if still active or trialing
    if (subscription.cancel_at_period_end && (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING)) {
        status = SubscriptionStatus.CANCELLED;
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
        const planConfig = PRICING_CONFIG.PLANS[plan as keyof typeof PRICING_CONFIG.PLANS];
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
            subscriptionStatus: SubscriptionStatus.FREE,
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
