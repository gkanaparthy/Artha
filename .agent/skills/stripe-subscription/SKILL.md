---
name: stripe-subscription
description: Stripe subscription billing system for Artha. Covers webhook handling, access control, checkout flows, pricing tiers, and common pitfalls with payment state management.
---

# Stripe Subscription Billing Skill

This skill provides authoritative guidance for working with Artha's Stripe-based subscription system, including webhook handling, access control, pricing tiers, and admin tooling.

## Architecture Overview

Artha uses Stripe Checkout + Stripe Billing with a webhook-driven state machine stored in the `User` model. All subscription state lives in PostgreSQL, updated by Stripe webhooks.

**Key Components:**
- `src/lib/stripe.ts` - Lazy-initialized Stripe client (proxy pattern)
- `src/lib/subscription.ts` - Access control logic (`getSubscriptionInfo`, `checkFeatureAccess`)
- `src/config/pricing.ts` - Price ID mapping and tier resolution
- `src/app/api/stripe/webhook/route.ts` - Webhook handler (source of truth for state transitions)
- `src/app/api/stripe/checkout/route.ts` - Checkout session creation
- `src/app/api/stripe/portal/route.ts` - Stripe Customer Portal redirect
- `src/app/api/subscription/` - REST endpoints (GET status, POST cancel, POST resume)

**State Machine (SubscriptionStatus enum):**
```
NONE → TRIALING → ACTIVE → CANCELLED → EXPIRED
                 ↗          ↘
         PAST_DUE            (can resume before period end)

NONE → LIFETIME (one-time payment, no trial)
NONE → GRANDFATHERED (admin/script, free forever)
```

## Core Principles

1. **Never trust webhooks alone for access control** - Always add time-based fallback checks
2. **Stripe is the source of truth** - Local DB is a cache of Stripe state
3. **Webhooks arrive out of order** - `checkout.session.completed` and `customer.subscription.created` can race
4. **Idempotency is mandatory** - Check `stripeEventId` before processing any webhook
5. **Generic errors in production** - Never leak Stripe error details to the client

## Rule Categories

### P0: Access Control (CRITICAL)

Time-based expiry guards prevent indefinite access when webhooks are delayed or missed.

**TRIALING access must check `trialEndsAt`:**
```typescript
const isTrialingAndValid = user.subscriptionStatus === 'TRIALING'
    && !!user.trialEndsAt
    && user.trialEndsAt.getTime() > Date.now();
```

**CANCELLED access must check `currentPeriodEnd`:**
```typescript
const isCancelledButStillActive = user.subscriptionStatus === 'CANCELLED'
    && !!user.currentPeriodEnd
    && user.currentPeriodEnd.getTime() > Date.now();
```

**PAST_DUE users retain access** during Stripe's automatic retry period (typically 3 attempts over 7 days). Do NOT immediately revoke access on first payment failure.

**Full `canAccessPro` logic:**
```typescript
const canAccessPro: boolean =
    user.subscriptionStatus === 'ACTIVE'
    || user.subscriptionStatus === 'LIFETIME'
    || user.subscriptionStatus === 'GRANDFATHERED'
    || user.subscriptionStatus === 'PAST_DUE'
    || isTrialingAndValid
    || isCancelledButStillActive;
```

### P0: Webhook Handling (CRITICAL)

**Event processing order matters:**
- `checkout.session.completed` - Set status to TRIALING, store stripeSubscriptionId, send welcome email
- `customer.subscription.created` / `updated` - Update period dates, trial end, price ID, cancel status
- `customer.subscription.deleted` - Mark EXPIRED, null out subscription ID
- `invoice.paid` - Log payment history
- `invoice.payment_failed` - Log failed payment, send notification email

**Idempotency check:**
```typescript
const existingEvent = await prisma.subscriptionEvent.findUnique({
    where: { stripeEventId: event.id }
});
if (existingEvent) return NextResponse.json({ received: true });
```

**Customer ID handling** - Stripe's `customer` field can be a string ID or an expanded Customer object:
```typescript
const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;
```

**Race condition between checkout and subscription events:**
Both `checkout.session.completed` and `customer.subscription.created` can set TRIALING status. Use `trialStartedAt` (not `trialEndsAt`) as the email guard to prevent duplicate welcome emails:
```typescript
const isFirstSubscription = user && !user.trialStartedAt
    && (user.subscriptionStatus === 'NONE' || user.subscriptionStatus === 'EXPIRED');
```

### P0: Middleware & Public Routes (CRITICAL)

These routes MUST be publicly accessible (no auth redirect):
- `/pricing` - Pricing page (accessible from landing page, emails, unauthenticated users)
- `/api/stats/*` - Public stats (founder count for pricing display)
- `/api/stripe/webhook` - Stripe webhook endpoint (Stripe cannot follow 302 redirects)

**Current middleware bypass list:**
```typescript
isAuthCallback || isPublicApi || isCronApi || isPublicPage || isDemoPage
|| isDebugApi || isPublicStatsApi || isStripeWebhook
```

### P1: Checkout Flow (HIGH)

**Block already-subscribed users from creating new subscriptions:**
```typescript
if (['ACTIVE', 'TRIALING', 'LIFETIME', 'GRANDFATHERED', 'PAST_DUE'].includes(status)) {
    return error('You already have an active subscription');
}
```
Including `PAST_DUE` prevents double billing - the user's existing subscription is still in Stripe's retry queue.

**Tier determination (Founder vs Regular):**
```typescript
const activeFoundersCount = await prisma.user.count({
    where: {
        subscriptionTier: 'FOUNDER',
        subscriptionStatus: { in: ['ACTIVE', 'LIFETIME', 'TRIALING'] }
    }
});
const isFounderPricingAvailable = activeFoundersCount < PRICING_CONFIG.FOUNDER_LIMIT;
```

**Checkout modes:**
- Subscriptions (MONTHLY/ANNUAL): `mode: 'subscription'` with `trial_period_days: 30`
- Lifetime: `mode: 'payment'` (one-time charge, no trial)

### P1: Pricing Configuration (HIGH)

**Price IDs are stored in environment variables:**
```
STRIPE_PRICE_FOUNDER_MONTHLY, STRIPE_PRICE_FOUNDER_ANNUAL, STRIPE_PRICE_FOUNDER_LIFETIME
STRIPE_PRICE_REGULAR_MONTHLY, STRIPE_PRICE_REGULAR_ANNUAL, STRIPE_PRICE_REGULAR_LIFETIME_149
```

**Actual prices (must match Stripe dashboard):**
| Plan | Founder | Regular |
|------|---------|---------|
| Monthly | $12/mo | $20/mo |
| Annual | $120/yr | $200/yr |
| Lifetime | $99 | $149+ |

**Annual savings is 17%, not 40%.** The UI must accurately represent savings.

### P2: Admin Actions (MEDIUM)

**Grandfathering a user:**
- Sets `subscriptionStatus: GRANDFATHERED`, `subscriptionPlan: LIFETIME`, `isGrandfathered: true`
- Resets trial fields to null
- Optionally sends announcement email

**Extending a trial:**
- Must `select` both `trialEndsAt` and `subscriptionTier` from the user record
- Extends from the EXISTING `trialEndsAt` (not from `new Date()`)
- Preserves existing `subscriptionTier` to avoid overwriting FOUNDER with REGULAR

**Grandfather script safety:**
- Must skip users with `GRANDFATHERED`, `ACTIVE`, `LIFETIME`, or `TRIALING` status
- Running the script on a user with an active Stripe subscription would desync local state from Stripe

### P2: Email Notifications (MEDIUM)

**All subscription emails use `createBrandedEmail()` from `src/lib/email.ts`.**

Brand elements:
- Background: `#FAFBF6` (cream)
- Header: `#2E4A3B` (dark green) with Artha logo
- Button: `#2E4A3B` with `border-radius: 12px`
- Footer: `#F5F7F2` with copyright

**Email triggers:**
| Event | Function | Guard |
|-------|----------|-------|
| Trial started | `sendTrialWelcomeEmail` | `!user.trialStartedAt` |
| Lifetime purchased | `sendLifetimeWelcomeEmail` | `user.subscriptionStatus !== 'LIFETIME'` |
| Payment failed | `sendPaymentFailedEmail` | Always (on `invoice.payment_failed`) |
| Grandfathered | `sendGrandfatherAnnouncementEmail` | Admin opt-in (`data.sendEmail`) |

**Rate limiting:** In-memory, 3 emails/hour/address (for magic link emails).

## Database Schema

Key subscription fields on the `User` model:
```prisma
subscriptionStatus    SubscriptionStatus @default(NONE)
subscriptionPlan      SubscriptionPlan?
subscriptionTier      SubscriptionTier   @default(REGULAR)
stripeCustomerId      String?            @unique
stripeSubscriptionId  String?            @unique
stripePriceId         String?
trialStartedAt        DateTime?
trialEndsAt           DateTime?
currentPeriodStart    DateTime?
currentPeriodEnd      DateTime?
cancelledAt           DateTime?
lifetimePurchasedAt   DateTime?
lifetimeAmount        Float?
isFounder             Boolean            @default(false)
founderNumber         Int?
isGrandfathered       Boolean            @default(false)
grandfatheredAt       DateTime?
grandfatheredReason   String?
```

Supporting models:
- `PaymentHistory` - Audit trail of all payments (`stripePaymentId` unique)
- `SubscriptionEvent` - Webhook event log (`stripeEventId` unique for idempotency)

## UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PricingSection` | `src/components/subscription/pricing-section.tsx` | Landing page + `/pricing` page pricing cards |
| `PricingCard` | `src/components/subscription/pricing-card.tsx` | Individual plan card |
| `TrialBanner` | `src/components/subscription/trial-banner.tsx` | Dashboard banner showing trial days remaining |
| `SubscriptionStatus` | `src/components/subscription/subscription-status.tsx` | Sidebar plan badge with upgrade/manage prompts |
| `BillingCard` | `src/components/subscription/billing-card.tsx` | Settings page billing management |

**SubscriptionStatus handles these states:**
- `GRANDFATHERED` → "Early Adopter - PRO FOREVER"
- `LIFETIME` → "Lifetime Pro - LIFETIME"
- `TRIALING` → "Free Trial - X days remaining" + Upgrade button
- `ACTIVE` → "Artha Pro" + Manage Billing
- `PAST_DUE` → "Payment Failed" + Update Payment button
- `CANCELLED` → "Cancelling" + Resume Subscription button
- `NONE` / `EXPIRED` → "Artha Pro" + View Pricing button

## Feature Gating

Pro features are gated in API routes using `getSubscriptionInfo`:
```typescript
const sub = await getSubscriptionInfo(session.user.id);
if (!sub.canAccessPro) {
    return NextResponse.json({ error: 'Pro access required' }, { status: 402 });
}
```

Currently gated routes:
- `/api/trades/sync` - Trade syncing
- `/api/trades/sync-recent` - Recent trade sync
- `/api/insights` - AI behavioral coaching

## Common Pitfalls

### 1. Webhook signature verification
The webhook endpoint MUST read `req.text()` (raw body), NOT `req.json()`. Stripe signature verification requires the exact raw body string.

### 2. Dates from JSON responses
`currentPeriodEnd` arrives as an ISO string from API responses. Always wrap in `new Date()` before passing to `date-fns` `format()`:
```typescript
// Wrong: format(currentPeriodEnd, 'PPP')
// Right: format(new Date(currentPeriodEnd), 'PPP')
```

### 3. Stripe type definitions
Stripe SDK types may not include all runtime fields. Use type casting for fields like `current_period_end`, `current_period_start`:
```typescript
const sub = subscription as Stripe.Subscription & {
    current_period_end: number;
    current_period_start: number;
};
```

### 4. Lifetime vs Subscription detection
In `checkout.session.completed`, use `session.mode` to distinguish:
- `session.mode === 'payment'` → Lifetime (one-time)
- `session.mode === 'subscription'` → Monthly/Annual (recurring)

### 5. Error messages
Never expose raw Stripe error messages to clients. Use generic messages:
```typescript
// Wrong: { error: error.message }
// Right: { error: 'Failed to create checkout session. Please try again.' }
```

### 6. `isLifetime` vs `isGrandfathered`
These are distinct states. `isLifetime` should only be `true` for actual lifetime purchases, not grandfathered users. The `SubscriptionStatus` component checks `isGrandfathered` first, so incorrect `isLifetime` values can still display correctly in some places but break in others.

## Testing

### Stripe Test Cards
- `4242424242424242` - Success
- `4000000000000341` - Card declined
- `4000002500003155` - Requires authentication

### Local Webhook Testing
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Key Test Scenarios
1. New user → Checkout → Trial starts → Trial banner appears
2. Trial user → 30 days → Auto-charge → Status becomes ACTIVE
3. Trial user → Cancel → Access until trial end → EXPIRED
4. User → Buy lifetime → Instant LIFETIME status
5. Active user → Payment fails → PAST_DUE (retains access)
6. Grandfathered user → Always has access, never sees billing prompts
7. Founder #100 → Subsequent users get regular pricing
8. CANCELLED user → Resume → ACTIVE again
9. Webhook arrives twice → Second is skipped (idempotency)

## Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_...        # Stripe API key
STRIPE_PUBLISHABLE_KEY=pk_live_...   # Client-side key (not currently used server-side)
STRIPE_WEBHOOK_SECRET=whsec_...      # Webhook signature verification

# Price IDs from Stripe Dashboard
STRIPE_PRICE_FOUNDER_MONTHLY=price_...
STRIPE_PRICE_FOUNDER_ANNUAL=price_...
STRIPE_PRICE_FOUNDER_LIFETIME=price_...
STRIPE_PRICE_REGULAR_MONTHLY=price_...
STRIPE_PRICE_REGULAR_ANNUAL=price_...
STRIPE_PRICE_REGULAR_LIFETIME_149=price_...
```

## Admin Dashboard

**Location:** `/admin/subscriptions` (protected by `ADMIN_EMAIL` env var)

**Features:**
- Total revenue, MRR, founder count, trial/active user counts
- User management table with search, filter by status
- Actions: Grandfather user, Extend trial
- Recent payments list
- Plan distribution breakdown

**API Routes:**
- `GET /api/admin/subscriptions/stats` - Aggregate metrics
- `GET /api/admin/subscriptions/users` - Paginated user list
- `POST /api/admin/subscriptions/actions` - Admin actions (grandfather, extend-trial)
