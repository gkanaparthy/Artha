# Artha Reverse Trial Pricing Plan

**Version:** 2.0
**Date:** February 7, 2026
**Status:** Planning
**Replaces:** PRICING_IMPLEMENTATION_PLAN.md (CC-upfront model)

---

## Table of Contents

1. [What Changed and Why](#1-what-changed-and-why)
2. [How the Reverse Trial Works](#2-how-the-reverse-trial-works)
3. [Free Tier Definition](#3-free-tier-definition)
4. [Pricing Tiers (Unchanged)](#4-pricing-tiers-unchanged)
5. [State Machine](#5-state-machine)
6. [Complete User Flows](#6-complete-user-flows)
7. [Database Schema Changes](#7-database-schema-changes)
8. [API Route Changes](#8-api-route-changes)
9. [Webhook Handler Changes](#9-webhook-handler-changes)
10. [UI & UX — What the User Sees](#10-ui--ux--what-the-user-sees)
11. [Email Sequence](#11-email-sequence)
12. [Cron Jobs](#12-cron-jobs)
13. [Access Control Matrix](#13-access-control-matrix)
14. [Edge Cases & Gotchas](#14-edge-cases--gotchas)
15. [Migration from Current System](#15-migration-from-current-system)
16. [Implementation Phases](#16-implementation-phases)
17. [Testing Checklist](#17-testing-checklist)

---

## 1. What Changed and Why

### Old Model (CC-Upfront)

```
Signup → Onboarding → Dashboard (no access) → Pricing page → Credit card → Trial starts
```

**Problem:** Two trust barriers before any value is delivered:
1. "Should I give this app my brokerage credentials?"
2. "Should I give this app my credit card?"

Users who are curious enough to sign up bounce at the credit card step. They never experience auto-sync, never see their P&L calculated, never get AI coaching. They leave before the product can prove itself.

### New Model (Reverse Trial)

```
Signup → Onboarding → Full Pro access for 30 days (no credit card) → Trial ends → Free tier → Upgrade when ready
```

**Why this wins for Artha specifically:**

1. **Trust compounds, not stacks.** Users first trust the app with their email (low friction). Then they connect their broker and see it actually works (trust earned). THEN they're asked to pay — after the product has proven its value with their own data.

2. **Sunk cost drives conversion.** After 30 days, a user has connected brokers, synced hundreds of trades, tagged positions, reviewed AI coaching. Abandoning all of that for a spreadsheet feels worse than $12/month.

3. **Stale data is the best salesperson.** When a free user opens their dashboard and sees "Last synced: 5 days ago" while the market moved 3%, they feel the gap. No marketing copy is more persuasive than watching your own data rot.

4. **More total users = more signal.** Even free users provide product feedback, word-of-mouth referrals, and usage data. A larger user base makes the product better for everyone.

---

## 2. How the Reverse Trial Works

### The 30-Second Version

1. User signs up (Google, Apple, or email magic link). **No credit card.**
2. Trial starts automatically. Full Pro access for 30 days.
3. User goes through onboarding, connects broker, syncs trades.
4. During trial, user can optionally upgrade (CC collected, not charged until trial ends).
5. Trial expires → user downgrades to Free tier (can still view all data, just can't sync or use Pro features).
6. User can upgrade anytime from the Free tier (CC collected, charged immediately).

### Key Principle: Data Is Never Deleted

A user's trades, broker connections, tags, and history are preserved indefinitely, regardless of subscription status. Downgrading to Free means losing the ability to **add new data** and **use Pro features**, but existing data remains fully accessible and viewable.

---

## 3. Free Tier Definition

The Free tier must be useful enough to keep users coming back, but limited enough that they feel the friction of not having Pro.

### Feature Matrix

| Feature | Free | Pro (Trial / Active / Lifetime / Grandfathered) |
|---------|------|--------------------------------------------------|
| View all existing trades & history | Yes | Yes |
| Dashboard with metrics & charts | Yes (stale data) | Yes (live data) |
| Calendar view | Yes | Yes |
| Tags & filtering | Yes | Yes |
| Auto-sync from brokers | **No** | Yes |
| Connect new broker accounts | **No** | Yes |
| AI coaching insights | **No** | Yes |
| Export to CSV/Excel | **No** | Yes |
| Performance reports | Basic (open P&L, summary) | Full (all charts, analytics) |

### What "Basic Reports" Means on Free

Free users can see:
- Overall P&L summary (total realized, total unrealized)
- Trade list (all their historical trades)
- Basic win rate and trade count

Free users cannot access:
- Detailed analytics charts (daily P&L curve, drawdown, etc.)
- AI-generated insights and coaching
- Export functionality

### Why These Specific Limits?

| Feature Removed | Why It Drives Upgrades |
|----------------|----------------------|
| Auto-sync | Journal goes stale daily. User sees "Last synced: X days ago" every time they open the app. This is the #1 conversion driver. |
| AI insights | User got used to personalized coaching during trial. Losing it feels like losing a mentor. |
| Export | Less urgent day-to-day, but painful at tax time or when sharing with a mentor. |
| New broker connections | Can't add new accounts. Existing ones stay but don't sync. |
| Full reports | They can see they HAVE data but can't analyze it deeply. |

### What About Existing Broker Connections?

When a user downgrades to Free:
- Broker connections remain in the database (NOT deleted)
- SnapTrade authorization remains valid
- Sync is simply skipped (Pro-gated at the API level)
- If the user upgrades later, sync resumes immediately — no re-connection needed

This is critical for reducing upgrade friction. Reconnecting brokers is a multi-step OAuth flow — if we forced that on re-upgrade, we'd lose conversions.

---

## 4. Pricing Tiers (Unchanged)

The pricing structure stays the same. Only the *when* changes (pay after trial, not before).

### Founder's Pricing (First 100 Paying Users)

| Plan | Price | Billing |
|------|-------|---------|
| Monthly | $12/month | Recurring |
| Annual | $120/year (save $24) | Recurring |
| Lifetime | $99 one-time | One-time |

### Regular Pricing (After 100 Paying Users)

| Plan | Price | Billing |
|------|-------|---------|
| Monthly | $20/month | Recurring |
| Annual | $200/year (save $40) | Recurring |
| Lifetime | $149+ one-time (price ladder) | One-time |

### Lifetime Deal Price Ladder

| Paying Users | Lifetime Price |
|--------------|----------------|
| 1-100 | $99 (founder) |
| 101-300 | $149 |
| 301-500 | $199 |
| 501-750 | $249 |
| 751+ | $299 or remove |

### Founder Count Logic

"Founder" = first 100 users who **start paying** (not first 100 signups).

Count query:
```sql
SELECT COUNT(*) FROM "User"
WHERE "isFounder" = true
AND "subscriptionStatus" IN ('ACTIVE', 'LIFETIME', 'TRIALING')
AND "stripeSubscriptionId" IS NOT NULL;
```

The `stripeSubscriptionId IS NOT NULL` clause ensures we only count users who have committed to pay (not app-only trialing users).

---

## 5. State Machine

### New Status: FREE

Add `FREE` to the `SubscriptionStatus` enum. This represents users who:
- Had a trial that expired without upgrading, OR
- Had a paid subscription that ended (cancelled + period over, or all payment retries failed)

`FREE` is NOT "locked out." It's a real tier with limited features.

### Complete State Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          STATE MACHINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SIGNUP ──→ TRIALING (auto, 30 days, no CC)                            │
│                │                                                        │
│                ├── [upgrades during trial] ──→ TRIALING                 │
│                │    (now has Stripe sub,        │  (CC on file,         │
│                │     trial_end = trialEndsAt)   │   charged at          │
│                │                                │   trial end)          │
│                │                                │                       │
│                │                                ├── [trial ends,        │
│                │                                │    charge succeeds]   │
│                │                                │    ──→ ACTIVE         │
│                │                                │                       │
│                │                                └── [trial ends,        │
│                │                                     charge fails]      │
│                │                                     ──→ PAST_DUE       │
│                │                                                        │
│                └── [trial expires, no Stripe sub] ──→ FREE              │
│                     (cron job transitions + sends email)                │
│                                                                         │
│  FREE ──→ [upgrades] ──→ ACTIVE (charged immediately, no trial)        │
│                                                                         │
│  ACTIVE ──→ CANCELLED (cancel at period end)                           │
│         │    └── [period ends] ──→ FREE                                │
│         │                                                               │
│         ├── PAST_DUE (payment fails, Stripe retrying)                  │
│         │    ├── [retry succeeds] ──→ ACTIVE                           │
│         │    └── [all retries fail, sub deleted] ──→ FREE              │
│         │                                                               │
│         └── ACTIVE (successful renewal)                                │
│                                                                         │
│  LIFETIME ──→ (permanent, no state changes)                            │
│  GRANDFATHERED ──→ (permanent, no state changes)                       │
│                                                                         │
│  NONE ──→ (legacy only, existing users pre-trial-system)               │
│  EXPIRED ──→ (legacy only, treated same as FREE)                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Status Meaning Quick Reference

| Status | Has CC on File? | Pro Access? | How They Got Here |
|--------|----------------|-------------|-------------------|
| NONE | No | No | Legacy user (pre-reverse-trial) |
| TRIALING | Maybe | Yes (if trialEndsAt > now) | Auto on signup |
| ACTIVE | Yes | Yes | Paying subscriber |
| PAST_DUE | Yes | Yes (grace period) | Payment failed, Stripe retrying |
| CANCELLED | Yes | Yes (until currentPeriodEnd) | User cancelled, access until period end |
| FREE | Maybe | No | Trial expired or subscription ended |
| EXPIRED | Maybe | No | Legacy equivalent of FREE |
| LIFETIME | Yes | Yes | One-time payment |
| GRANDFATHERED | No | Yes | Admin/script grant |

### Two Flavors of TRIALING

This is a subtle but important distinction:

| | App-Only Trial | Committed Trial |
|---|---|---|
| **Trigger** | Auto on signup | User goes through checkout during trial |
| **stripeSubscriptionId** | NULL | Set |
| **CC on file** | No | Yes |
| **What happens at trial end** | Cron sets FREE + sends email | Stripe charges card → ACTIVE or PAST_DUE |
| **UI messaging** | "X days left — Upgrade to keep access" | "Your Pro plan starts on {date}" |
| **Risk** | User churns silently | User converts (unless payment fails) |

This distinction is checked via `stripeSubscriptionId IS NOT NULL`, never by adding a separate status.

---

## 6. Complete User Flows

### Flow 1: New User → Trial → Doesn't Upgrade → Free

```
Step 1: User visits arthatrades.com, clicks "Start Free — No Credit Card"
Step 2: Redirected to /login → Google/Apple OAuth or email magic link
Step 3: NextAuth creates User record
Step 4: auth.ts events.createUser callback:
        - Sets subscriptionStatus = TRIALING
        - Sets trialStartedAt = now
        - Sets trialEndsAt = now + 30 days
Step 5: Middleware redirects to /onboarding
Step 6: User completes onboarding (connects broker, selects trading style)
Step 7: Redirected to /dashboard — full Pro access
Step 8: User syncs trades, views analytics, gets AI coaching for 30 days
Step 9: Email sequence runs (Day 7, 14, 23, 27 reminders)
Step 10: Day 30 — Cron job fires:
         - Sets subscriptionStatus = FREE
         - Sends "trial ended" email
Step 11: User opens dashboard — sees stale data, Pro features show upgrade prompts
Step 12: User can continue using Free tier indefinitely
```

### Flow 2: New User → Trial → Upgrades During Trial

```
Step 1-8: Same as Flow 1 (user is in trial, using Pro features)
Step 9: Day 10 — User clicks "Upgrade to Pro" on trial banner or /pricing
Step 10: Redirect to /pricing — sees plans with messaging:
         "Lock in your plan now. You won't be charged until your trial ends."
Step 11: User selects plan (e.g., Monthly $12/mo) → Stripe Checkout
Step 12: Checkout route creates Stripe Checkout Session:
         - mode: 'subscription'
         - subscription_data.trial_end = user's trialEndsAt (20 days remaining)
         - No charge yet
Step 13: User enters CC → Checkout completes
Step 14: Webhook: checkout.session.completed
         - Sets stripeSubscriptionId, stripeCustomerId
         - Keeps status as TRIALING (trial continues)
         - Sets isFounder if within first 100
Step 15: User continues using Pro normally for remaining 20 days
Step 16: Day 30 — Stripe trial_end fires → Stripe charges card
Step 17: Webhook: invoice.paid → status = ACTIVE
Step 18: User continues as paying subscriber
```

### Flow 3: Free User → Upgrades After Trial

```
Step 1: User is on FREE tier (trial expired weeks ago)
Step 2: User opens dashboard, sees "Last synced: 12 days ago"
Step 3: Clicks "Upgrade to Pro" → /pricing page
Step 4: Selects plan → Stripe Checkout
Step 5: Checkout route creates session:
         - mode: 'subscription' (or 'payment' for lifetime)
         - NO trial_end — charged immediately
Step 6: Checkout completes → Webhook fires
Step 7: Status: ACTIVE (charged immediately, full access restored)
Step 8: Broker connections resume syncing (no re-OAuth needed)
```

### Flow 4: Active User → Cancels → Free Tier

```
Step 1: User is ACTIVE (paying)
Step 2: Clicks "Cancel" in settings or Stripe Portal
Step 3: Stripe sets cancel_at_period_end = true
Step 4: Webhook: subscription.updated → status = CANCELLED
Step 5: User retains Pro access until currentPeriodEnd
Step 6: Period ends → Webhook: subscription.deleted → status = FREE
Step 7: User is on Free tier (can still view all data)
Step 8: Can re-upgrade anytime → ACTIVE (charged immediately)
```

### Flow 5: Lifetime Purchase (During or After Trial)

```
Step 1: User clicks "Buy Lifetime" on /pricing
Step 2: Checkout route creates session:
         - mode: 'payment' (one-time, NOT subscription)
         - Charged immediately regardless of trial status
Step 3: Webhook: checkout.session.completed
         - Sets status = LIFETIME
         - Sets lifetimePurchasedAt, lifetimeAmount
         - Sets isFounder if within first 100
         - If user had a Stripe subscription (committed trial), cancel it
Step 4: User has permanent Pro access
```

### Flow 6: Payment Failure

```
Step 1: User is ACTIVE, card on file expires or has insufficient funds
Step 2: Stripe attempts charge → fails
Step 3: Webhook: invoice.payment_failed → log payment failure, send email
Step 4: Webhook: subscription.updated (status: past_due) → status = PAST_DUE
Step 5: User retains Pro access during grace period (Stripe retries)
Step 6a: Retry succeeds → invoice.paid → status = ACTIVE
Step 6b: All retries fail → subscription.deleted → status = FREE
```

### Flow 7: Upgraded During Trial → Payment Fails at Trial End

```
Step 1: User upgraded during trial (day 10), CC on file
Step 2: Day 30 — Stripe trial_end fires, tries to charge
Step 3: Charge fails (expired card, insufficient funds)
Step 4: Webhook: invoice.payment_failed → send "update your card" email
Step 5: Webhook: subscription.updated (status: past_due) → PAST_DUE
Step 6: User still has Pro access during Stripe retry period
Step 7a: User updates card → retry succeeds → ACTIVE
Step 7b: All retries fail → subscription.deleted → FREE
```

---

## 7. Database Schema Changes

### Add FREE to SubscriptionStatus Enum

```prisma
enum SubscriptionStatus {
  NONE           // Legacy: pre-reverse-trial users
  TRIALING       // In free trial (auto on signup)
  ACTIVE         // Paying subscriber
  PAST_DUE       // Payment failed, grace period
  CANCELLED      // Cancelled, access until period end
  FREE           // NEW: Trial expired or subscription ended
  EXPIRED        // Legacy: treated same as FREE
  LIFETIME       // Lifetime deal purchased
  GRANDFATHERED  // Free forever (early supporters)
}
```

### No Other Schema Changes

The existing User model already has all needed fields:
- `trialStartedAt`, `trialEndsAt` — already exist
- `stripeSubscriptionId` — used to distinguish app-trial vs committed-trial
- `subscriptionStatus` — just needs the new FREE value
- `isFounder`, `founderNumber` — unchanged

**Migration:** Single ALTER TYPE to add `FREE` to the enum. Non-destructive.

---

## 8. API Route Changes

### POST `/api/stripe/checkout` — Modified

**Changes:**
1. Allow TRIALING users (currently blocked)
2. If user is TRIALING, set `subscription_data.trial_end` to their `trialEndsAt`
3. If user is FREE, no trial on the subscription (charge immediately)
4. Still block: ACTIVE, LIFETIME, GRANDFATHERED, PAST_DUE

```
Checkout Access Rules:
  NONE           → Allowed (legacy, treat like FREE)
  TRIALING       → Allowed (NEW — was blocked before)
  FREE           → Allowed
  EXPIRED        → Allowed (legacy, treat like FREE)
  ACTIVE         → Blocked (already paying)
  PAST_DUE       → Blocked (prevent double billing)
  CANCELLED      → Allowed (can re-subscribe)
  LIFETIME       → Blocked (already lifetime)
  GRANDFATHERED  → Blocked (already free forever)
```

**Trial end logic:**
```
if (user.subscriptionStatus === 'TRIALING' && user.trialEndsAt > now) {
  // Remaining trial days: subscription trial_end = user's trialEndsAt
  subscription_data.trial_end = Math.floor(user.trialEndsAt.getTime() / 1000)
  // User is NOT charged until their existing trial ends
} else {
  // FREE, EXPIRED, NONE, CANCELLED — no trial, charge immediately
  // Do NOT set trial_period_days or trial_end
}
```

### GET `/api/subscription` — Modified

**Changes:**
Add fields for the UI to distinguish trial flavors:

```typescript
return {
  // ... existing fields ...
  hasCommitted: !!user.stripeSubscriptionId,  // NEW: has CC on file
  isFreeUser: ['FREE', 'EXPIRED', 'NONE'].includes(status) && !canAccessPro,  // NEW
};
```

### No Changes Needed

These routes remain unchanged — they already use `canAccessPro`:
- `/api/trades/sync` — already Pro-gated
- `/api/trades/sync-recent` — already Pro-gated
- `/api/insights` — already Pro-gated
- `/api/stripe/portal` — unchanged
- `/api/subscription/cancel` — unchanged
- `/api/subscription/resume` — unchanged

---

## 9. Webhook Handler Changes

### `checkout.session.completed` — Modified

**Current behavior:** Sets TRIALING + trialStartedAt + trialEndsAt.

**New behavior for subscription mode:**
- Do NOT change subscriptionStatus (user is already TRIALING)
- DO set stripeSubscriptionId, stripeCustomerId
- DO set isFounder, subscriptionPlan, subscriptionTier
- DO NOT override trialStartedAt or trialEndsAt (already set on signup)

**New behavior for payment mode (lifetime):**
- Same as current: set LIFETIME immediately

**Why the change:** Trial is already running (started on signup). Checkout just adds the Stripe subscription on top. We don't want to reset trial dates.

### `customer.subscription.deleted` — Modified

**Current behavior:** Sets status to EXPIRED.

**New behavior:** Sets status to FREE (instead of EXPIRED).

This is the only change. When a subscription ends (cancellation period over, all retries failed, etc.), the user goes to FREE — not EXPIRED. They keep their free tier access.

### `customer.subscription.created/updated` — Minor Change

**Change:** When mapping Stripe status to app status, handle the new state:
- If Stripe status is `canceled` (final deletion), this is handled by `subscription.deleted`
- If Stripe status is `active` → ACTIVE
- If Stripe status is `past_due` → PAST_DUE
- If Stripe status is `trialing` → TRIALING (keep existing)
- If Stripe cancel_at_period_end is true → CANCELLED

No changes needed here — existing logic handles it.

---

## 10. UI & UX — What the User Sees

### 10.1 Landing Page / Homepage

**For anonymous visitors:**

Primary CTA changes from "Start Free Trial" to:

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│              Start Free — No Credit Card Required              │
│                                                                │
│     Get 30 days of full Pro access. Downgrade anytime.         │
│                                                                │
│                    [ Get Started Free ]                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

The CTA links to `/login`. After signup → onboarding → dashboard with trial active.

**Pricing section on homepage:**
- Show pricing tiers as reference ("After your free trial, plans start at $12/mo")
- Founder spots counter: "Only {X} founder spots remaining"
- No checkout on homepage — checkout is on `/pricing` for authenticated users

### 10.2 Dashboard — Trial User (Days 1-30)

**Trial Banner (top of dashboard):**

```
┌────────────────────────────────────────────────────────────────┐
│  Pro Trial: 23 days remaining                                  │
│  Lock in founder pricing — you won't be charged until          │
│  your trial ends.                          [ Upgrade to Pro ]  │
└────────────────────────────────────────────────────────────────┘
```

- Shows remaining days
- Upgrade CTA links to /pricing
- Color: Subtle (not alarming). Blue/green info style.
- Becomes more urgent in final 7 days (amber/orange).
- Final 3 days: red/urgent styling.

**Trial Banner for Committed Users (upgraded but not yet charged):**

```
┌────────────────────────────────────────────────────────────────┐
│  ✓ Pro plan locked in — Monthly $12/mo starts Feb 28           │
│  You're all set! Enjoy full Pro access.                        │
└────────────────────────────────────────────────────────────────┘
```

- Green/success styling
- No upgrade CTA (already committed)
- Shows when billing starts

### 10.3 Dashboard — Free User (After Trial)

**Downgrade Banner (persistent, top of dashboard):**

```
┌────────────────────────────────────────────────────────────────┐
│  Your Pro trial has ended                                      │
│  Your trades haven't synced since Feb 1.                       │
│  Upgrade to keep your journal current.     [ Upgrade to Pro ]  │
└────────────────────────────────────────────────────────────────┘
```

- Shows how many days since last sync
- Amber/warning styling
- Cannot be permanently dismissed (can minimize for session)

**Pro Feature Indicators:**

Where Pro features used to be, show gentle upgrade nudges:

```
┌──── AI Insights Card ────────────────────────────────────────┐
│                                                               │
│  🔒 AI Coaching requires Pro                                 │
│                                                               │
│  Get personalized insights on your trading patterns,          │
│  emotional triggers, and areas for improvement.               │
│                                                               │
│                    [ Upgrade to Pro ]                         │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Sync Button:**
- Disabled, shows lock icon
- Tooltip: "Auto-sync requires Pro"
- Clicking opens PaywallDialog

**Export Button:**
- Disabled, shows lock icon
- Tooltip: "Export requires Pro"
- Clicking opens PaywallDialog

**"Last Synced" Indicator:**
- Shows prominently: "Last synced: 12 days ago"
- Color shifts from yellow → orange → red as days increase
- This is the strongest conversion driver — make it visible

### 10.4 Pricing Page (`/pricing`)

The pricing page needs to be context-aware based on auth state.

**Anonymous visitor:**
```
Header: "Start with 30 days free. No credit card required."

[ Monthly $12/mo ]  [ Annual $120/yr - Save $24 ]  [ Lifetime $99 ]

CTA: "Get Started Free" → /login
```

**TRIALING user (no Stripe sub):**
```
Header: "Lock in your plan. You won't be charged until your trial ends on {date}."

[ Monthly $12/mo ]  [ Annual $120/yr - Save $24 ]  [ Lifetime $99 ]

CTA: "Upgrade to Pro" → Stripe Checkout
Note: "Only {X} founder spots remaining at this price"
```

**TRIALING user (has Stripe sub — already committed):**
```
Header: "You're all set! Your {plan} plan starts on {trialEndsAt}."

Current plan details shown.
"Manage billing" → Stripe Portal
```

**FREE user:**
```
Header: "Welcome back. Pick up where you left off."

[ Monthly $12/mo ]  [ Annual $120/yr - Save $24 ]  [ Lifetime $99 ]

CTA: "Upgrade to Pro" → Stripe Checkout (charged immediately)
Note: "Your existing data and broker connections are waiting"
```

**ACTIVE user:**
```
Header: "You're on Artha Pro — {plan} plan."

Current plan details, next billing date.
"Manage Billing" → Stripe Portal
"Cancel Subscription" option
```

**LIFETIME / GRANDFATHERED:**
```
Header: "You have lifetime Pro access. Thank you for your support!"
```

### 10.5 Sidebar Subscription Badge

Small badge below user avatar in the sidebar:

| Status | Badge |
|--------|-------|
| TRIALING (no Stripe) | `Trial · 23d left` (blue) |
| TRIALING (committed) | `Pro · Starts Feb 28` (green) |
| ACTIVE | `Pro` (green) |
| ACTIVE + Founder | `Pro · Founder` (green + gold) |
| FREE | `Free` (gray) |
| CANCELLED | `Pro · Ends Feb 28` (amber) |
| LIFETIME | `Pro · Lifetime` (green + gold) |
| GRANDFATHERED | `Pro · Early Adopter` (green + gold) |

### 10.6 Settings → Billing Card

**TRIALING (no Stripe):**
```
Plan: Pro Trial
Status: 23 days remaining
Card: No card on file

[ Upgrade to Pro ]
```

**TRIALING (committed):**
```
Plan: Pro Monthly (Founder)
Status: Trial ends Feb 28
Card: Visa •••• 4242

[ Manage Billing ]
```

**FREE:**
```
Plan: Free
Status: Trial ended Jan 28

[ Upgrade to Pro ]
```

**ACTIVE:**
```
Plan: Pro Monthly (Founder)
Status: Active — next billing Feb 28
Card: Visa •••• 4242

[ Manage Billing ]  [ Cancel Plan ]
```

### 10.7 Paywall Dialog — Updated Messaging

The PaywallDialog triggers on 402 responses (when free users try Pro features).

**For FREE users (trial expired):**
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│        This feature requires Artha Pro                   │
│                                                          │
│  Your trial has ended, but your data is still here.      │
│  Upgrade to keep your trading journal synced and get     │
│  AI-powered coaching on your performance.                │
│                                                          │
│  ✓ Auto-sync from 15+ brokerages                        │
│  ✓ AI coaching & pattern recognition                     │
│  ✓ Full performance analytics                            │
│  ✓ Export to CSV/Excel                                   │
│                                                          │
│  Starting at $12/month (Founder pricing)                 │
│                                                          │
│         [ Upgrade to Pro ]    [ Maybe Later ]            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Key difference from current:** No "Start Free Trial" language. They already had their trial. This is "Upgrade to Pro."

### 10.8 Onboarding — No Changes Needed

The onboarding wizard works unchanged because:
1. User is TRIALING with Pro access at this point (set on signup)
2. Broker connection works (TRIALING = canAccessPro)
3. No paywall triggers during onboarding
4. All 5 steps proceed as normal

---

## 11. Email Sequence

### Overview

The email sequence shifts from "urgency to enter your credit card" to "here's the value you're getting, don't lose it."

All emails use the existing branded template (see `createBrandedEmail()` in PRICING_IMPLEMENTATION_PLAN.md Section 10).

### Day 0 — Welcome

**Subject:** "Welcome to Artha — Your trading journal is ready"

**Trigger:** User completes signup (events.createUser)

**Content:**
- Warm welcome, no mention of trial or payment
- Quick start guide: "Connect your broker in 2 minutes"
- Link to dashboard

**Guard:** `trialStartedAt` set once. Check before sending to prevent duplicate.

### Day 1 — Getting Started (Conditional)

**Subject:** "Connect your first broker — takes 2 minutes"

**Trigger:** Cron job checks: user is TRIALING AND has 0 broker connections AND trialStartedAt was yesterday

**Content:**
- Remind to connect broker
- Show supported brokerages (with logos)
- Trust badges: "Bank-level encryption, read-only access"

**Skip if:** User already has at least 1 broker connection

### Day 7 — Week 1 Recap

**Subject:** "Your first week with Artha"

**Trigger:** Cron job, 7 days after trialStartedAt

**Content:**
- Personalized stats if available: "You've synced {X} trades this week"
- Feature spotlight: AI coaching
- Subtle reminder: "23 days of Pro remaining"

### Day 14 — Mid-Trial Value Check

**Subject:** "Your trading month so far"

**Trigger:** Cron job, 14 days after trialStartedAt

**Content:**
- Personalized stats: trade count, P&L summary
- Feature spotlight: Performance reports
- "Pro tip: Tag your trades with setups and mistakes for better insights"

### Day 23 — 7 Days Left

**Subject:** "Your Pro trial ends in 7 days"

**Trigger:** Cron job, 23 days after trialStartedAt

**Content:**
- What they'll lose: sync, AI insights, export
- What stays: all their data, viewable forever
- Founder pricing urgency: "Lock in $12/mo — only {X} spots left"
- CTA: "Upgrade to Pro" → /pricing

**Skip if:** User already has stripeSubscriptionId (already committed)

### Day 27 — 3 Days Left

**Subject:** "3 days left — don't lose your trading edge"

**Trigger:** Cron job, 27 days after trialStartedAt

**Content:**
- Urgency + loss aversion
- Personalized: "You've synced {X} trades. Without Pro, your journal stops updating."
- Founder pricing scarcity
- CTA: "Keep Pro Access" → /pricing

**Skip if:** User already has stripeSubscriptionId

### Day 30 — Trial Ended

**Subject:** "Your Pro trial has ended"

**Trigger:** Cron job that transitions TRIALING → FREE

**Content:**
- What changed: sync, AI, and export are now disabled
- What's preserved: all their data is safe and viewable
- "Your broker connections are saved — upgrade anytime to resume syncing"
- CTA: "Upgrade to Pro" → /pricing

### Day 37 — Win-Back (7 Days Post-Expiry)

**Subject:** "Your trading data is waiting"

**Trigger:** Cron job, 7 days after trial ended, only if user is still FREE

**Content:**
- "Your last sync was 7 days ago. The market has moved — is your journal keeping up?"
- Feature reminder
- CTA: "Upgrade to Pro" → /pricing

**Skip if:** User upgraded (not FREE anymore)

### Upgrade Confirmation Emails

**When user upgrades (commits during trial):**
- Subject: "You're locked in — Pro starts {date}"
- Content: Plan details, when first charge happens, manage billing link

**When first charge succeeds:**
- Subject: "Welcome to Artha Pro!"
- Content: Thank you, plan details, manage billing link

**Lifetime purchase:**
- Subject: "Lifetime Pro access unlocked!"
- Content: Thank you, founder recognition if applicable

### Email Sending Guards

To prevent duplicate or stale emails:
1. **trialStartedAt** — set once on signup, never changed. Use as anchor for all trial emails.
2. **Check current status** before sending — if user upgraded, skip reminder emails.
3. **stripeSubscriptionId** — if set, skip "upgrade" reminders (they already committed).
4. **Log sent emails** — either in a separate table or check subscription events.

---

## 12. Cron Jobs

### New: Trial Expiration Cron

**Schedule:** Every 6 hours (or daily)

**Query:**
```sql
SELECT id, email, name, "trialEndsAt"
FROM "User"
WHERE "subscriptionStatus" = 'TRIALING'
  AND "trialEndsAt" < NOW()
  AND "stripeSubscriptionId" IS NULL;
```

**Why `stripeSubscriptionId IS NULL`:**
Users who upgraded during trial have a Stripe subscription. Stripe handles their transition via webhooks (trial_end → charge → ACTIVE or PAST_DUE). We only need to handle users who didn't upgrade.

**Actions for each user:**
1. Set `subscriptionStatus = FREE`
2. Send "trial ended" email
3. Log SubscriptionEvent: `{ eventType: 'trial_expired' }`

**Safety:** Even if this cron fails to run, the time-based check in `getSubscriptionInfo()` prevents Pro access:
```typescript
(status === 'TRIALING' && trialEndsAt > now)
```
So a TRIALING user with expired trial is already denied Pro access. The cron just cleans up the status field and sends the email.

### New: Trial Reminder Emails Cron

**Schedule:** Daily

**Logic:**
```
For each TRIALING user (without stripeSubscriptionId):
  - Calculate days_since_trial_start
  - If day 1 AND no broker connections → send "Getting Started" email
  - If day 7 → send "Week 1 Recap" email
  - If day 23 → send "7 Days Left" email
  - If day 27 → send "3 Days Left" email
```

**Deduplication:** Track sent emails via a simple approach:
- Add a `lastTrialEmailSent` field to User (stores which email was last sent, e.g., "day_7")
- Or create a `TrialEmail` table with `userId`, `emailType`, `sentAt`
- Simpler option: compute from `trialStartedAt` — if today = trialStartedAt + 7 days, send day 7 email. Since cron runs daily, each email fires exactly once.

### Existing: Daily Sync Cron — Modified

The daily sync cron (`/api/cron/sync-all`) should skip FREE users:

```
For each user with broker connections:
  - Check canAccessPro
  - If NO → skip (free user, no sync)
  - If YES → sync trades as normal
```

This saves SnapTrade API calls and prevents free users from getting fresh data.

### New: Win-Back Email Cron

**Schedule:** Daily

**Query:**
```sql
SELECT id, email, name
FROM "User"
WHERE "subscriptionStatus" = 'FREE'
  AND "trialEndsAt" IS NOT NULL
  AND "trialEndsAt" + INTERVAL '7 days' < NOW()
  AND "trialEndsAt" + INTERVAL '8 days' > NOW();
```

This finds users exactly 7 days after trial expiry (1-day window to handle cron timing).

**Action:** Send win-back email.

---

## 13. Access Control Matrix

### `canAccessPro` Logic — Updated

```typescript
function canAccessPro(user): boolean {
  switch (user.subscriptionStatus) {
    case 'ACTIVE':
    case 'LIFETIME':
    case 'GRANDFATHERED':
      return true;

    case 'PAST_DUE':
      return true;  // Grace period during Stripe retry

    case 'TRIALING':
      return user.trialEndsAt != null && user.trialEndsAt > new Date();

    case 'CANCELLED':
      return user.currentPeriodEnd != null && user.currentPeriodEnd > new Date();

    case 'FREE':
    case 'EXPIRED':
    case 'NONE':
      return false;

    default:
      return false;
  }
}
```

**No changes from current logic** — the existing function already handles this correctly. FREE/EXPIRED/NONE all return false. The only code change is adding `FREE` as an explicit case (currently falls to default).

### Feature Gating by Route

| Route | Free Access | Pro Access | Notes |
|-------|-------------|------------|-------|
| `/api/trades` (GET) | Yes | Yes | View existing trades |
| `/api/trades/sync` | **No (402)** | Yes | Auto-sync requires Pro |
| `/api/trades/sync-recent` | **No (402)** | Yes | Auto-sync requires Pro |
| `/api/insights` | **No (402)** | Yes | AI coaching requires Pro |
| `/api/metrics` | Partial | Yes | Basic metrics for free, full for Pro |
| `/api/auth/snaptrade/*` | **No (402)** | Yes | Broker connection requires Pro |
| `/api/stripe/checkout` | Yes | N/A | This IS the upgrade path |
| `/api/subscription` | Yes | Yes | Status check always allowed |

### Client-Side Feature Gating

Components should check subscription status and render accordingly:

```typescript
// Pattern for Pro-gated UI elements
const { canAccessPro, isFreeUser } = useSubscription();

if (canAccessPro) {
  return <SyncButton />;  // Functional button
} else {
  return <SyncButton disabled locked />;  // Disabled with lock icon
}
```

---

## 14. Edge Cases & Gotchas

### Edge Case 1: User signs up but never completes onboarding

**Scenario:** User creates account, lands on onboarding, closes browser.

**What happens:**
- User is TRIALING (set on creation)
- Trial timer is running
- Middleware redirects to /onboarding on next visit
- Trial may expire before they even use the product

**Decision:** This is acceptable. 30 days is generous. If they don't come back in 30 days, they weren't going to convert anyway. The Day 1 "Getting Started" email should pull them back.

### Edge Case 2: User upgrades to lifetime during trial

**Scenario:** User is TRIALING (day 5), clicks "Buy Lifetime $99."

**What happens:**
- Checkout creates a one-time payment session (mode: 'payment')
- Webhook sets status to LIFETIME immediately
- No Stripe subscription created
- User has permanent Pro access
- If user somehow also had a Stripe subscription (edge case of edge case), cancel it

**Key:** Lifetime purchases are always charged immediately, even during trial. The user chose to pay now — honor that.

### Edge Case 3: User is TRIALING, upgrades, then cancels before trial ends

**Scenario:** User upgrades on day 10 (Stripe sub with trial_end day 30), then cancels on day 15.

**What happens:**
- Stripe sets cancel_at_period_end on the subscription
- But the subscription is still in its trial period
- Webhook: subscription.updated → status = CANCELLED
- User retains access until trial ends (trialEndsAt)
- Day 30: subscription.deleted → status = FREE
- User was never charged (cancelled during Stripe trial)

**Important:** Stripe subscription trial_end and app trialEndsAt are the same date, so this is consistent.

### Edge Case 4: Two browser tabs, one upgrades

**Scenario:** User has /dashboard and /pricing open. Upgrades in /pricing tab.

**What happens:**
- Dashboard tab still shows old status (TRIALING without committed badge)
- Next API call from dashboard tab will see updated status
- No data corruption risk — just stale UI until next fetch

**Mitigation:** After successful checkout redirect, dashboard should refetch subscription status. The `?subscription=success` query param (from Stripe redirect) can trigger this.

### Edge Case 5: Webhook races — checkout.session.completed vs subscription.created

**Same as current system.** Both events may set subscription fields. The handlers are idempotent:
- checkout.session.completed: sets stripeSubscriptionId, stripeCustomerId, keeps TRIALING
- subscription.created: also sets similar fields

Both are safe to process in either order because:
- stripeSubscriptionId is set by both (same value)
- Status stays TRIALING regardless of which fires first
- trialStartedAt is NOT reset (already set on signup, guarded by `if (!user.trialStartedAt)`)

### Edge Case 6: User signs up, trial expires, signs in with different provider

**Scenario:** User signed up with Google, trial expired. Later signs in with Apple (same email).

**What happens:**
- NextAuth links the new provider to the existing account (via email matching)
- User record is the same — status is still FREE
- All data preserved

**No special handling needed.**

### Edge Case 7: Founder spot race condition

**Scenario:** Two users try to claim the 100th founder spot simultaneously.

**Same as current system.** The founder count is checked at checkout creation time. If both pass the check, both get founder pricing. Worst case: 101 founders instead of 100. This is acceptable — better than a user getting an error.

### Edge Case 8: Admin extends trial for a FREE user

**Scenario:** User's trial expired, support extends it.

**Current admin action:** "Extend Trial" sets trialEndsAt and status to TRIALING.

**Works unchanged.** Admin extends trial → user is TRIALING again → 402s stop → Pro features resume.

### Edge Case 9: User with NONE status (legacy)

**Scenario:** Existing user who was created before the reverse trial system.

**Handling:** Treat NONE the same as FREE in all access control checks. These users can upgrade via /pricing. Alternatively, a one-time migration can set NONE users (who aren't GRANDFATHERED) to FREE.

### Edge Case 10: PAST_DUE user tries to buy a second subscription

**Same as current.** Checkout route blocks PAST_DUE users. They must resolve their existing payment issue first (via Stripe Customer Portal or by updating their card).

---

## 15. Migration from Current System

### What Needs to Change

The migration is minimal because we're adding a new status, not restructuring.

**Step 1: Database migration**
- Add `FREE` to SubscriptionStatus enum
- Non-destructive: `ALTER TYPE "SubscriptionStatus" ADD VALUE 'FREE';`

**Step 2: Migrate EXPIRED → FREE**
- All users with `subscriptionStatus = 'EXPIRED'` → set to `FREE`
- One-time script, can be done at deploy

**Step 3: Auth callback update**
- `events.createUser` now sets TRIALING + trial dates
- All NEW users get auto-trial

**Step 4: Code changes** (see Implementation Phases)

### Backward Compatibility

- Existing TRIALING users (CC-upfront model): still TRIALING, still have stripeSubscriptionId. No change needed — they're in the "committed trial" state by definition.
- Existing ACTIVE, LIFETIME, GRANDFATHERED users: No change.
- Existing CANCELLED users: No change (access until period end, then FREE).
- Existing NONE users: Treated as FREE. Can upgrade anytime.
- Existing EXPIRED users: Migrated to FREE.

---

## 16. Implementation Phases

### Phase 1: Database & Core Logic (Day 1-2)

- [ ] Add `FREE` to SubscriptionStatus enum (Prisma schema + migration)
- [ ] Update `events.createUser` in auth.ts to auto-set TRIALING
- [ ] Update `getSubscriptionInfo()` to handle FREE status
- [ ] Update `canAccessPro` to explicitly include FREE → false
- [ ] Add `hasCommitted` and `isFreeUser` fields to subscription response
- [ ] Migrate existing EXPIRED users to FREE (one-time script)

### Phase 2: Checkout & Webhook Updates (Day 3-4)

- [ ] Modify checkout route: allow TRIALING, set trial_end for remaining days
- [ ] Modify checkout route: no trial for FREE/NONE users (immediate charge)
- [ ] Update webhook checkout.session.completed: don't reset trial dates for subscriptions
- [ ] Update webhook subscription.deleted: set FREE instead of EXPIRED
- [ ] Test checkout flow for TRIALING users (trial_end correctly set)
- [ ] Test checkout flow for FREE users (immediate charge)
- [ ] Test lifetime purchase during trial

### Phase 3: Trial Expiration & Cron (Day 5)

- [ ] Create trial expiration cron job (TRIALING without Stripe → FREE)
- [ ] Create trial email reminder cron job (Day 1, 7, 23, 27 emails)
- [ ] Modify daily sync cron to skip FREE users
- [ ] Test cron job: trial expiration transitions and emails

### Phase 4: UI — Trial Experience (Day 6-7)

- [ ] Add trial banner to dashboard layout (with days remaining)
- [ ] Add "committed" banner variant (shows plan start date)
- [ ] Add sidebar subscription badge (Trial/Pro/Free variants)
- [ ] Update billing card in settings page (Free and trial states)
- [ ] Update PaywallDialog messaging (no "Start Trial" language)
- [ ] Add "last synced X days ago" indicator for FREE users

### Phase 5: UI — Pricing Page (Day 8)

- [ ] Make pricing page context-aware (anonymous/trial/free/active/lifetime states)
- [ ] Update CTAs based on subscription state
- [ ] "Lock in pricing" messaging for trial users
- [ ] "Charged immediately" messaging for free users
- [ ] Test all pricing page states

### Phase 6: UI — Free Tier Experience (Day 9)

- [ ] Disable sync button for FREE users (with lock icon and tooltip)
- [ ] Disable export button for FREE users
- [ ] Show upgrade prompts where AI insights were
- [ ] Show upgrade prompts on connect broker button
- [ ] Add "last synced" staleness indicator (color shifts over time)
- [ ] Test full free tier experience end-to-end

### Phase 7: Landing Page & Emails (Day 10)

- [ ] Update homepage CTA: "Start Free — No Credit Card Required"
- [ ] Update homepage pricing section (reference pricing, not checkout)
- [ ] Create welcome email template
- [ ] Create getting started email template
- [ ] Create week 1 recap email template
- [ ] Create 7-day warning email template
- [ ] Create 3-day warning email template
- [ ] Create trial ended email template
- [ ] Create win-back email template
- [ ] Create upgrade confirmation email template
- [ ] All emails use branded template (see PRICING_IMPLEMENTATION_PLAN.md §10)

### Phase 8: Testing & Polish (Day 11-12)

- [ ] Full end-to-end test: signup → trial → expire → free → upgrade
- [ ] Full end-to-end test: signup → trial → upgrade during trial → charged at trial end
- [ ] Full end-to-end test: signup → trial → lifetime purchase
- [ ] Test payment failure flows
- [ ] Test cancellation → free tier
- [ ] Test all email triggers
- [ ] Test pricing page in all states
- [ ] Test paywall dialog in all states
- [ ] Test admin trial extension on FREE user
- [ ] Run `pnpm build` + `pnpm lint`
- [ ] Security review: no Pro features accessible without canAccessPro

---

## 17. Testing Checklist

### Stripe Test Cards
- `4242424242424242` — Success
- `4000000000000341` — Card declined
- `4000002500003155` — Requires authentication

### Test Scenarios

**Trial Flows:**
- [ ] New signup → auto-TRIALING with correct dates
- [ ] Trial user sees trial banner with correct days remaining
- [ ] Trial user can sync trades, use AI insights, export
- [ ] Trial expires → status becomes FREE (verify cron or manual)
- [ ] FREE user cannot sync, use AI, or export (402 returned)
- [ ] FREE user can still view all existing trades and dashboard

**Upgrade Flows:**
- [ ] TRIALING user upgrades (monthly) → Stripe sub with trial_end = remaining days
- [ ] TRIALING user upgrades (annual) → Same behavior
- [ ] TRIALING user upgrades (lifetime) → Charged immediately → LIFETIME
- [ ] FREE user upgrades (monthly) → Charged immediately → ACTIVE
- [ ] FREE user upgrades (annual) → Charged immediately → ACTIVE
- [ ] Committed trial user → trial ends → charged → ACTIVE
- [ ] Committed trial user → trial ends → charge fails → PAST_DUE

**Cancellation Flows:**
- [ ] ACTIVE user cancels → CANCELLED → access until period end → FREE
- [ ] Committed TRIALING user cancels before trial ends → never charged → FREE
- [ ] CANCELLED user re-upgrades → ACTIVE (charged immediately)
- [ ] FREE user re-upgrades → ACTIVE (charged immediately)

**Payment Failure:**
- [ ] ACTIVE → payment fails → PAST_DUE → retry succeeds → ACTIVE
- [ ] ACTIVE → payment fails → all retries fail → FREE
- [ ] Committed TRIALING → trial end charge fails → PAST_DUE → retry → ACTIVE or FREE

**Edge Cases:**
- [ ] Lifetime purchase during trial (cancels any Stripe sub)
- [ ] Admin extends trial on FREE user → back to TRIALING
- [ ] PAST_DUE user cannot create new checkout session
- [ ] Founder count is correct (only counts users with stripeSubscriptionId)
- [ ] Two users upgrading simultaneously for last founder spot → both succeed

**Emails:**
- [ ] Welcome email on signup
- [ ] Getting started email (day 1, only if no broker)
- [ ] Day 7 recap email
- [ ] Day 23 warning email (skipped if committed)
- [ ] Day 27 warning email (skipped if committed)
- [ ] Trial ended email
- [ ] Win-back email (day 37)
- [ ] Upgrade confirmation email
- [ ] All emails use correct branding

**Webhook Testing:**
```bash
# Local testing
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
```

**UI States:**
- [ ] Dashboard: trial banner (TRIALING, no Stripe)
- [ ] Dashboard: committed banner (TRIALING, with Stripe)
- [ ] Dashboard: downgrade banner (FREE)
- [ ] Dashboard: no banner (ACTIVE, LIFETIME, GRANDFATHERED)
- [ ] Sidebar badge: all 6+ variants
- [ ] Pricing page: anonymous state
- [ ] Pricing page: trial state
- [ ] Pricing page: committed state
- [ ] Pricing page: free state
- [ ] Pricing page: active state
- [ ] Pricing page: lifetime/grandfathered state
- [ ] Paywall dialog: free user messaging (no "trial" language)
- [ ] Settings billing card: all states

---

## Summary of Changes from Original Plan

| Aspect | Old (CC-Upfront) | New (Reverse Trial) |
|--------|-------------------|---------------------|
| Trial trigger | Stripe Checkout (CC required) | Auto on signup (no CC) |
| After trial expires | Locked out (EXPIRED) | Free tier (FREE) — can still view data |
| Data after trial | Inaccessible without paying | Fully viewable, just can't add new data |
| Broker connections | Deleted/inaccessible | Preserved, resume on upgrade |
| Checkout timing | Before trial (signup) | During trial or after (upgrade) |
| Primary conversion driver | "Card on file" inertia | "My data is getting stale" motivation |
| Signup friction | High (CC form) | Low (OAuth only) |
| New DB status | None | FREE added to enum |
| Webhook changes | N/A | subscription.deleted → FREE |
| Cron additions | None | Trial expiration + email reminders |
| Email strategy | Urgency to keep card-on-file active | Value demonstration → loss aversion |

---

*Document created: February 7, 2026*
*Author: Claude (AI Assistant)*
*For: Gautham Kanaparthy / Artha*
