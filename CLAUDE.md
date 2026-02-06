# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Artha is a trading journal that automatically syncs trades from connected brokerage accounts via SnapTrade API, calculates P&L using FIFO lot matching, and provides AI-powered performance coaching. Built with Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, and Prisma with PostgreSQL (Supabase). Stripe handles subscription billing.

## Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build (also checks TypeScript)
pnpm lint                   # Run ESLint

# Database
pnpm prisma generate        # Regenerate Prisma client after schema changes
pnpm prisma db push         # Push schema changes to database (dev)
pnpm prisma studio          # Open visual database editor

# Scripts
pnpm tsx scripts/grandfather-early-adopters.ts  # Grant early adopters free Pro

# Stripe local testing
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## DANGEROUS COMMANDS - NEVER RUN

**These commands will DESTROY ALL DATA in the database. NEVER run them:**

```bash
npx prisma migrate reset          # Drops all tables and data
npx prisma db push --force-reset  # Drops all tables and data
```

**If schema changes require destructive actions, STOP and ask the user first.**

## Pre-Task Checklist

Before completing any task, run these mandatory checks:

1. **Security** — Check for SQL injection, shell injection, path traversal. Verify all user inputs are validated.
2. **Code Quality** — Run `pnpm build` (type errors) and `pnpm lint` (lint errors).

## Architecture

### Route Structure

**Public routes (no auth):**
- `/` — Landing page
- `/login` — OAuth sign-in (Google/Apple) + Email Magic Links
- `/pricing` — Subscription pricing page
- `/demo/*` — Demo mode (static dummy data)
- `/privacy`, `/terms`, `/contact` — Legal pages

**Protected routes (auth required):**
- `/(dashboard)/dashboard` — Main dashboard
- `/(dashboard)/journal` — Trade journal
- `/(dashboard)/reports` — Analytics & reports
- `/(dashboard)/settings` — User settings + billing
- `/(dashboard)/admin/subscriptions` — Admin subscription management (ADMIN_EMAIL only)

**API routes:**
- `/api/auth/*` — NextAuth callbacks
- `/api/trades/*` — Trade CRUD & sync
- `/api/metrics` — FIFO P&L calculation engine
- `/api/insights` — AI coaching (Pro-gated)
- `/api/stripe/checkout` — Create Stripe Checkout session
- `/api/stripe/webhook` — Stripe webhook handler (public, signature-verified)
- `/api/stripe/portal` — Stripe Customer Portal redirect
- `/api/subscription/*` — GET status, POST cancel, POST resume
- `/api/admin/subscriptions/*` — Stats, users, actions (admin-only)
- `/api/stats/founder-count` — Public founder count for pricing display
- `/api/cron/*` — Cron jobs (protected by CRON_SECRET)

### Middleware (`src/middleware.ts`)

Protects all routes except these public bypasses:
- `/`, `/login`, `/privacy`, `/terms`, `/contact`, `/pricing`, `/demo/*`
- `/api/auth/*`, `/api/health`, `/api/cron/*`, `/api/debug/*`
- `/api/stats/*` — Public stats (founder count)
- `/api/stripe/webhook` — Stripe cannot follow 302 redirects
- Static assets: `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.txt`, `.xml`, `.ico`

**CRITICAL**: SEO files (`robots.txt`, `sitemap.xml`) must be excluded in the matcher regex to prevent redirecting Googlebot to `/login`

### Key Services

**SnapTrade Service** (`src/lib/services/snaptrade.service.ts`)
- Broker connection, trade sync from 15+ brokerages
- **CRITICAL**: SDK returns snake_case fields (`trade.option_symbol`, NOT `trade.optionSymbol`)

**FIFO P&L Engine** (`src/app/api/metrics/route.ts`)
- Groups trades by `{accountId}:{universalSymbolId or symbol}`
- FIFO matching within each account, supports long/short, options (standard 100x + mini 10x)
- Date filters applied AFTER FIFO matching for accurate cross-period P&L
- Tag filtering applied to closed positions before calculating metrics

**AI Coaching** (`src/lib/services/ai-coaching.service.ts`)
- Google Gemini 2.0 Flash (primary) → Groq Llama 3.3 (fallback)
- Redis caching (1hr TTL), rate limited 10 req/hour/user

**Subscription Billing** (`src/lib/stripe.ts`, `src/lib/subscription.ts`, `src/config/pricing.ts`)
- Stripe Checkout + Billing with webhook-driven state machine
- Access control via `getSubscriptionInfo()` → `canAccessPro`
- Pricing tiers: Founder (first 100 users) and Regular

### Data Flow

1. User authenticates via NextAuth (Google/Apple OAuth or Email Magic Link)
2. User connects broker via SnapTrade OAuth
3. `/api/trades/sync` pulls trades, stores in PostgreSQL (25s Vercel timeout)
4. User tags trades with setups/mistakes
5. `/api/metrics` calculates P&L (respects tag filters)
6. `/api/insights` generates AI coaching (Pro-gated, Redis-cached)
7. Cron jobs sync all users daily and check for broken connections

### Subscription State Machine

```
NONE → TRIALING → ACTIVE → CANCELLED → EXPIRED
                 ↗          ↘
         PAST_DUE            (can resume before period end)

NONE → LIFETIME (one-time payment, no trial)
NONE → GRANDFATHERED (admin/script, free forever)
```

**Access control** (`src/lib/subscription.ts`):
- `ACTIVE`, `LIFETIME`, `GRANDFATHERED` — unconditional access
- `PAST_DUE` — access retained during Stripe retry period
- `TRIALING` — access only if `trialEndsAt` is in the future
- `CANCELLED` — access only if `currentPeriodEnd` is in the future
- `NONE`, `EXPIRED` — no access

**Pro-gated routes** check `canAccessPro` and return 402:
- `/api/trades/sync`, `/api/trades/sync-recent`, `/api/insights`

**Paywall UI patterns**:
- Broker connection button checks subscription before allowing SnapTrade OAuth flow
- 402 responses trigger `PaywallDialog` component (professional modal with trial CTA)
- Never use generic browser `alert()` for payment prompts

## SnapTrade API Integration

**CRITICAL: The SnapTrade SDK returns snake_case fields, not camelCase.**

```typescript
trade.option_symbol                    // NOT trade.optionSymbol
trade.option_symbol.option_type        // CALL or PUT
trade.option_symbol.strike_price
trade.option_symbol.is_mini_option
trade.option_symbol.ticker             // OCC symbol for options

// Option vs Stock detection:
const isOption = !!trade.option_symbol;
const symbol = isOption ? trade.option_symbol.ticker : trade.symbol?.symbol;
const multiplier = isOption ? (trade.option_symbol.is_mini_option ? 10 : 100) : 1;
```

## Database Schema

Key models in `prisma/schema.prisma`:

- **User** — NextAuth user with SnapTrade credentials (encrypted), Stripe subscription fields
  - Subscription state: `subscriptionStatus`, `subscriptionPlan`, `subscriptionTier`
  - Stripe IDs: `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`
  - Time guards: `trialEndsAt`, `currentPeriodEnd`, `trialStartedAt`
  - Flags: `isFounder`, `isGrandfathered`
- **BrokerAccount** — Connected brokerage accounts (accountNumber encrypted)
- **Trade** — Transactions with `type`, `optionType`, `strikePrice`, `contractMultiplier`, `positionKey`
- **Tag** / **TradeTag** — Position-level tagging (tags apply via `positionKey`, not individual trades)
- **PaymentHistory** — Stripe payment audit trail (`stripePaymentId` unique)
- **SubscriptionEvent** — Webhook event log (`stripeEventId` unique for idempotency)

## Environment Variables

See `.env.example` for the full list. Key groups:

- **Database**: `DATABASE_URL` (pooler), `DIRECT_URL` (migrations)
- **Auth**: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`
- **Email**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **SnapTrade**: `SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CONSUMER_KEY`
- **Encryption**: `DATA_ENCRYPTION_KEY` (64 hex chars / 32 bytes)
- **Redis**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **AI**: `GOOGLE_GENERATIVE_AI_API_KEY`, `GROQ_API_KEY`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_FOUNDER_*`, `STRIPE_PRICE_REGULAR_*`
- **Admin**: `ADMIN_EMAIL`, `CRON_SECRET`

Notes:
- `DATA_ENCRYPTION_KEY` must be 64 hex characters (generate: `openssl rand -hex 32`)
- Rate limiting degrades gracefully without Redis
- AI requires at least one LLM key (Gemini or Groq)
- All 6 Stripe price IDs must be set or checkout will 500

## Code Patterns

- **Path alias**: `@/*` maps to `./src/*`
- **UI components**: shadcn/ui primitives in `src/components/ui/`
- **Brand colors**: `#2E4A3B` (dark green), `#FAFBF6` (cream), `#E59889` (coral)
- **Global state**: Filter Context (`src/contexts/filter-context.tsx`) with localStorage persistence
- **Encryption**: AES-256-GCM for sensitive fields (SnapTrade secrets, account numbers)
- **Error handling**: Generic errors in production, detailed in development
- **Rate limiting**: Redis-based (Upstash) with graceful degradation
- **Demo mode**: Static dummy data, bypasses auth and LLM calls

## Security & RLS

**Strict "Deny-All" RLS + Backend Proxy Pattern:**

- RLS enabled on all tables with no permissive public policies
- All database access goes through Next.js API routes (Prisma with service_role)
- Every API route verifies session JWT via `auth()`
- Every Prisma query includes explicit `{ where: { userId: session.user.id } }`
- Never trust a `userId` from request body/params — always extract from session
- Return 404 or generic 403 on unauthorized access (prevent enumeration)

## Common Pitfalls

### SnapTrade
- Always use snake_case for SDK fields — `trade.option_symbol`, NOT `trade.optionSymbol`
- Check `!!trade.option_symbol` to detect options; mini options use 10x multiplier

### Stripe & Subscriptions
- Webhook endpoint must read `req.text()` (raw body), NOT `req.json()` — Stripe signature verification requires exact bytes
- `checkout.session.completed` and `customer.subscription.created` can arrive in any order — handle both setting TRIALING
- Use `trialStartedAt` (set once) as email guard, NOT `trialEndsAt` which changes between events
- `customer` field on Stripe objects can be string ID or expanded object — handle both
- Dates from API JSON responses need `new Date()` wrapping before `date-fns` `format()`
- PAST_DUE users must NOT be allowed to create new checkout sessions (prevents double billing)
- Grandfather script must skip ACTIVE/LIFETIME/TRIALING users to avoid desyncing from Stripe
- MRR prices must match Stripe: Founder monthly=$12, annual=$120; Regular monthly=$20, annual=$200

### NextAuth & Magic Links
- Magic link tokens are single-use — reusing causes silent redirect to login
- Session cookies: `__Secure-authjs.session-token` (production), `authjs.session-token` (localhost)
- `?reason=middleware` in URL indicates middleware redirected due to missing/invalid session
- Environment variables must be synced between `.env` and `.env.local` for local testing
- Production requires: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` all properly set

### Database & Prisma
- NEVER run `prisma migrate reset` or `db push --force-reset` without explicit user approval
- Always `pnpm prisma generate` after schema changes
- Use `DIRECT_URL` for migrations, `DATABASE_URL` for connection pooling

### Performance
- Trade sync has 25s Vercel timeout — avoid blocking operations
- AI insights cached 1hr in Redis — clear cache when testing new prompts
- Use client-side filtering (FilterContext) for instant UI updates

### SEO & Metadata
- Middleware must NOT intercept SEO files — ensure `.txt`, `.xml`, `.ico` are in matcher exclusions
- Page-specific metadata requires `layout.tsx` files (metadata exports only work in server components)
- `src/app/robots.ts` and `src/app/sitemap.ts` generate `/robots.txt` and `/sitemap.xml` as Next.js route files
- JSON-LD structured data in `src/components/seo/json-ld.tsx` (Organization, SoftwareApplication, FAQPage schemas)
- All logo `<Image>` tags must have descriptive alt text, never empty strings

### UI & Styling
- Dark mode uses Tailwind `dark:` prefix variants
- When fixing dark mode visibility, test both light/dark themes with contrasting colors
- Common dark mode pattern: `bg-white dark:bg-[#2E4A3B]/20`, `text-[#2E4A3B] dark:text-[#E8EFE0]`
- Status badges need separate dark mode color schemes (e.g., `bg-green-100 dark:bg-green-900/30`)
- Use `sr-only` class for SEO-critical H1s that shouldn't be visually rendered
