# Access Control Rules

## Time-Based Expiry Guards

The subscription system must never rely solely on webhook-driven status for access control. Webhooks can be delayed, missed, or arrive out of order. Always add time-based fallback checks.

### Rule: TRIALING users must have a valid trialEndsAt

**Location:** `src/lib/subscription.ts` - `getSubscriptionInfo()`

A user with `subscriptionStatus === 'TRIALING'` only has access if `trialEndsAt` exists AND is in the future.

```typescript
const isTrialingAndValid = user.subscriptionStatus === 'TRIALING'
    && !!user.trialEndsAt
    && user.trialEndsAt.getTime() > Date.now();
```

**Why:** If the `customer.subscription.deleted` webhook is missed after a trial expires, without this check the user retains access forever.

### Rule: CANCELLED users must have a valid currentPeriodEnd

A cancelled user keeps access until the end of their billing period, not indefinitely.

```typescript
const isCancelledButStillActive = user.subscriptionStatus === 'CANCELLED'
    && !!user.currentPeriodEnd
    && user.currentPeriodEnd.getTime() > Date.now();
```

### Rule: PAST_DUE users retain access

When a payment fails, Stripe enters a retry period (3 attempts over ~7 days). During this time the user should NOT lose access. Revoking access on first failure creates bad UX.

```typescript
const canAccessPro: boolean =
    ...
    || user.subscriptionStatus === 'PAST_DUE'
    ...
```

### Rule: ACTIVE, LIFETIME, GRANDFATHERED have unconditional access

These statuses always grant access with no time check needed:
- `ACTIVE` - Stripe is actively billing and managing the subscription
- `LIFETIME` - One-time payment, perpetual access
- `GRANDFATHERED` - Admin-granted, perpetual access

### Rule: NONE and EXPIRED have no access

Users who never subscribed or whose subscription fully ended have no Pro features.

## Feature Gating Pattern

All gated API routes must check `canAccessPro`:

```typescript
import { getSubscriptionInfo } from '@/lib/subscription';

const sub = await getSubscriptionInfo(session.user.id);
if (!sub.canAccessPro) {
    return NextResponse.json(
        { error: 'Pro access required. Your trial may have ended.' },
        { status: 402 }
    );
}
```

**Currently gated routes:**
- `POST /api/trades/sync` - Full trade sync
- `POST /api/trades/sync-recent` - Incremental sync
- `GET /api/insights` - AI coaching

## Checkout Blocking

Users with these statuses must NOT be allowed to create new checkout sessions:
- `ACTIVE` - Already subscribed
- `TRIALING` - Already in trial
- `LIFETIME` - Already lifetime
- `GRANDFATHERED` - Already has free access
- `PAST_DUE` - Has an existing subscription in Stripe retry queue (allowing checkout would create a SECOND subscription)

Only `NONE`, `EXPIRED`, and `CANCELLED` (after period end) users should be able to start checkout.
