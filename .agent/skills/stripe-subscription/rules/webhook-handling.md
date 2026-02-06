# Webhook Handling Rules

## Event Processing

### Rule: Always verify webhook signatures with raw body

```typescript
const body = await req.text(); // NOT req.json()
const signature = (await headers()).get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
```

Stripe requires the exact raw body bytes for HMAC verification. Parsing to JSON and re-stringifying will change the byte sequence and fail verification.

### Rule: Always check idempotency before processing

Stripe may send the same event multiple times (retries, network issues). Use `stripeEventId` (unique index on `SubscriptionEvent` model) as a deduplication key:

```typescript
const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: event.id }
});
if (existingEvent) {
    return NextResponse.json({ received: true }); // Skip silently
}
```

### Rule: Always return 200 on successful receipt

Even if the handler encounters a non-critical error, return 200 to prevent Stripe from retrying indefinitely. Only return 400/500 for signature verification failures or truly unrecoverable errors.

## Event-Specific Handling

### checkout.session.completed

This event fires when the user completes Stripe Checkout. It arrives independently from (and potentially before or after) `customer.subscription.created`.

**For subscriptions (mode === 'subscription'):**
- Set `subscriptionStatus: 'TRIALING'` immediately (don't wait for subscription.created)
- Set `trialStartedAt` and `trialEndsAt`
- Store `stripeSubscriptionId`
- Set `subscriptionPlan`, `subscriptionTier`, `isFounder`
- Send welcome email (guarded by `!user.trialStartedAt`)

**For lifetime (mode === 'payment'):**
- Set `subscriptionStatus: 'LIFETIME'`
- Store `lifetimePurchasedAt` and `lifetimeAmount`
- Log to `PaymentHistory`
- Send lifetime welcome email (guarded by `status !== 'LIFETIME'`)

### customer.subscription.created / updated

This is the definitive source for subscription period dates. May arrive before or after `checkout.session.completed`.

**Updates:**
- `subscriptionStatus` mapped from Stripe status (`trialing`, `active`, `past_due`, `canceled`, `unpaid`)
- `trialEndsAt` from `subscription.trial_end`
- `currentPeriodEnd` / `currentPeriodStart` from period fields
- `cancelledAt` from `subscription.canceled_at`
- `stripePriceId` from first line item

**Special case:** If `cancel_at_period_end === true` and status is `active`, override to `CANCELLED`.

### customer.subscription.deleted

Fired when a subscription is fully terminated (after all retry attempts fail, or at period end for cancelled subscriptions).

- Set `subscriptionStatus: 'EXPIRED'`
- Null out `stripeSubscriptionId`
- Set `currentPeriodEnd` to `subscription.ended_at`

### invoice.paid

Log payment to `PaymentHistory`. The `payment_intent` field can be a string ID or an expanded object:

```typescript
const paymentId = typeof inv.payment_intent === 'string'
    ? inv.payment_intent
    : inv.payment_intent?.id;
```

### invoice.payment_failed

- Log failed payment to `PaymentHistory` with status `FAILED`
- Send payment failed notification email
- The `PAST_DUE` status update comes via `customer.subscription.updated`, not here

## Customer ID Handling

The `customer` field on Stripe objects can be either a string ID or an expanded Customer object, depending on Stripe's expand settings:

```typescript
const customerId = typeof obj.customer === 'string'
    ? obj.customer
    : obj.customer?.id;
```

Always handle both cases when looking up users by `stripeCustomerId`.

## User ID Resolution

For events like `invoice.paid` that don't have `metadata.userId`, resolve via the customer:

```typescript
async function findUserIdByStripeCustomer(customerId: string): Promise<string> {
    if (!customerId) return 'unknown';
    const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
        select: { id: true }
    });
    return user?.id || 'unknown';
}
```

## Email Race Condition Prevention

Use `trialStartedAt` (set once and never reset) as the guard for welcome emails, NOT `subscriptionStatus` or `trialEndsAt` which can change between webhook events:

```typescript
const isFirstSubscription = user && !user.trialStartedAt
    && (user.subscriptionStatus === 'NONE' || user.subscriptionStatus === 'EXPIRED');

// Only send email for first-time subscriptions
if (isFirstSubscription && user.email) {
    await sendTrialWelcomeEmail(user.email, user.name?.split(' ')[0]);
}
```
