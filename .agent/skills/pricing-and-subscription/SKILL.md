---
name: pricing-and-subscription-management
description: Comprehensive knowledge for managing Artha's pricing strategy, Stripe integration, subscription gating, and administrative billing actions.
---

# Pricing and Subscription Management Skill

This skill provides specialized knowledge for maintaining and expanding Artha's subscription ecosystem, including Stripe integration, "Pro" feature gating, and administrative management.

## Project Subscription Model

Artha uses a multi-tier subscription model designed to reward early adopters ("Founders") and legacy supporters ("Grandfathered").

### 1. Subscription Tiers
- **Artha Pro**: The standard monthly or annual subscription.
- **Artha Lifetime**: A one-time payment for perpetual access.
- **Founder Tier**: Limited to the first 100 users. Locked into lower monthly/annual pricing or lifetime deals forever.
- **Grandfathered**: Legacy users (23 users) who have full Pro access for free forever.
- **Free Trial**: 30-day full access to Pro features for all new users.

### 2. Pricing Tiers (Founders vs Regular)
Prices are defined in `src/config/pricing.ts` and used for MRR calculations in `/api/admin/subscriptions/stats`.

| Plan | Founder Price | Regular Price |
| :--- | :--- | :--- |
| **Monthly** | $12 | $20 |
| **Annual** | $120 ($10/mo) | $200 ($16.6/mo) |
| **Lifetime** | $99 (One-time) | $149 (One-time) |

## Core Integration Details

### 1. Stripe Integration
- **Checkout**: `/api/stripe/checkout` handles session creation.
- **Customer Portal**: `/api/stripe/portal` allows users to manage billing, cancel, or switch plans.
- **Webhooks**: `/api/stripe/webhook` processes events from Stripe (subscriptions, payments, cancellations).

### 2. "Pro" Gating Logic
Gating is centralized in `src/lib/subscription.ts`. Access is granted if:
- Status is `ACTIVE`, `LIFETIME`, `GRANDFATHERED`, or `PAST_DUE`.
- Status is `TRIALING` and `trialEndsAt` is in the future.
- Status is `CANCELLED` and `currentPeriodEnd` is in the future.

**Critical Note:** Always use the `canAccessPro` boolean from `getSubscriptionInfo()` to gate features.

### 3. API Protection
Sensitive features MUST be gated at the API level:
```typescript
const { getSubscriptionInfo } = await import('@/lib/subscription');
const sub = await getSubscriptionInfo(session.user.id);
if (!sub.canAccessPro) {
    return NextResponse.json({ error: "Artha Pro required" }, { status: 402 });
}
```

## Administrative Management

The Admin Dashboard (`/admin/subscriptions`) provides critical oversight and controls.

### 1. Key Metrics
- **MRR (Monthly Recurring Revenue)**: Calculated based on active Monthly and Annual subscriptions.
- **Founder Count**: Tracks the 100-spot limit.
- **Plan Distribution**: Visual breakdown of user tiers.

### 2. Admin Actions (`/api/admin/subscriptions/actions`)
- **Grandfather User**: Manually set `subscriptionStatus` to `GRANDFATHERED` and `isGrandfathered` to `true`.
- **Extend Trial**: Add a specific number of days (default 14) to a user's `trialEndsAt`.

## Email Automation (via Resend)

Transactional emails are branded and triggered by subscription events:
- **Trial Welcome**: Sent on initial checkout session for a subscription. Use `trialStartedAt` as a guard to prevent duplicates.
- **Grandfather Announcement**: Sent via `scripts/send-grandfather-emails.ts`.
- **Payment Failed**: Triggered by `invoice.payment_failed` webhook.

## Common Workflows

### 1. Testing Checkout Locally
1. Start the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
2. Trigger test events: `stripe trigger checkout.session.completed`
3. Use test cards like `4242 4242 4242 4242`.

### 2. Manual Access Grant
If a user needs manual access without going through Stripe:
1. Use Prisma Studio or the Admin Dashboard.
2. Set `subscriptionStatus` to `GRANDFATHERED` (permanent) or `TRIALING` + `trialEndsAt` (temporary).

## Best Practices & Gotchas

### 🚨 Environment Variable Fallbacks
Absolute URLs in emails and Stripe redirects MUST use a robust fallback chain to avoid breaking in different environments:
```typescript
const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://arthatrades.com';
```

### 🚨 Idempotency & Guards
- Use `trialStartedAt` to ensure a welcome email is only sent exactly once per user life-cycle.
- Check previous trial status before extending to avoid unintended overlaps.

### 🚨 MRR Precision
When calculating MRR, remember to divide Annual prices by 12 to normalize the monthly contribution.
