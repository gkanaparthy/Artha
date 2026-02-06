# Pricing Tiers & Configuration Rules

## Tier Structure

### Founder Pricing (First 100 users)
| Plan | Price | Stripe Env Var |
|------|-------|----------------|
| Monthly | $12/mo | `STRIPE_PRICE_FOUNDER_MONTHLY` |
| Annual | $120/yr | `STRIPE_PRICE_FOUNDER_ANNUAL` |
| Lifetime | $99 | `STRIPE_PRICE_FOUNDER_LIFETIME` |

### Regular Pricing (After 100 users)
| Plan | Price | Stripe Env Var |
|------|-------|----------------|
| Monthly | $20/mo | `STRIPE_PRICE_REGULAR_MONTHLY` |
| Annual | $200/yr | `STRIPE_PRICE_REGULAR_ANNUAL` |
| Lifetime | $149+ | `STRIPE_PRICE_REGULAR_LIFETIME_149` |

### Savings Calculations
- Founder: Monthly $12 x 12 = $144/yr. Annual = $120/yr. **Savings: 17%**
- Regular: Monthly $20 x 12 = $240/yr. Annual = $200/yr. **Savings: 17%**

**Do NOT claim "Save 40%" or any other inflated number in the UI.**

## Founder Count Logic

Founder pricing is available while `activeFoundersCount < 100`.

Founders are counted by querying users with:
- `subscriptionTier: 'FOUNDER'`
- `subscriptionStatus` in `['ACTIVE', 'LIFETIME', 'TRIALING']`

This is checked at checkout time and displayed on the pricing page via `/api/stats/founder-count`.

## Price ID Resolution

Price IDs are resolved via `src/config/pricing.ts`:

```typescript
function getPriceId(plan: string, tier: 'FOUNDER' | 'REGULAR'): string
function getPlanFromPriceId(priceId: string): SubscriptionPlan | null
```

Price IDs come from environment variables. If a price ID is missing (empty string), the checkout route returns a 500 error. Always verify all price env vars are set before deploying.

## Grandfathered Users

- Status: `GRANDFATHERED`
- Plan: `LIFETIME` (for display purposes)
- Tier: `REGULAR` (not counted toward the 100 founder limit)
- `isGrandfathered: true`, `isFounder: false`
- Granted via admin action or the `scripts/grandfather-early-adopters.ts` script

**Grandfather script safety:** Must skip users with `ACTIVE`, `LIFETIME`, `TRIALING`, or `GRANDFATHERED` status to avoid overwriting paid subscriptions.

## MRR Calculation

Located in `src/app/api/admin/subscriptions/stats/route.ts`.

**Formula:**
- Monthly subscribers: `count * monthlyPrice`
- Annual subscribers: `(count * annualPrice) / 12`

**Prices must match actual Stripe configuration:**
```typescript
const PRICES = {
    MONTHLY: { FOUNDER: 12, REGULAR: 20 },
    ANNUAL: { FOUNDER: 120, REGULAR: 200 }
};
```

Lifetime and Grandfathered users do NOT contribute to MRR.

## Public Routes for Pricing

The pricing page and founder count API must be accessible without authentication:
- `/pricing` - Must be in middleware's public page list
- `/api/stats/founder-count` - Must be in middleware's public API list

Without these, the landing page pricing section silently fails to show dynamic founder count.
