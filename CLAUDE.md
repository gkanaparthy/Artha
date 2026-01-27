# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Artha is a trading journal that automatically syncs trades from connected brokerage accounts via SnapTrade API, calculates P&L using FIFO lot matching, and provides AI-powered performance coaching. Built with Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, and Prisma with PostgreSQL (Supabase).

**Key Features:**
- Automatic trade sync from 15+ brokerages (via SnapTrade)
- FIFO P&L calculation with options support (standard + mini)
- Trade tagging system (Setups, Mistakes, Emotions, Custom)
- AI Performance Coaching (Gemini 2.0 Flash / Groq Llama 3.3)
- Proactive email alerts for broken broker connections
- Dark/Light theme with responsive design
- Demo mode for exploring features without live data

## Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm lint                   # Run ESLint
pnpm test                   # Run test suite (when available)

# Database
pnpm prisma generate        # Regenerate Prisma client after schema changes
pnpm prisma db push         # Push schema changes to database (dev)
pnpm prisma studio          # Open visual database editor
```

## DANGEROUS COMMANDS - NEVER RUN

**These commands will DESTROY ALL DATA in the database. NEVER run them:**

```bash
# NEVER run these - they wipe the entire database:
npx prisma migrate reset          # Drops all tables and data
npx prisma db push --force-reset  # Drops all tables and data
prisma migrate reset              # Drops all tables and data
prisma db push --force-reset      # Drops all tables and data

# NEVER run these SQL commands:
DROP TABLE ...                    # Deletes table and all data
TRUNCATE TABLE ...                # Deletes all data from table
DELETE FROM ... (without WHERE)   # Deletes all rows
```

**If schema changes require destructive actions, STOP and ask the user first.**

## Pre-Task Checklist

**Before completing any task, run these mandatory checks:**

1. **Security Audit**
   - Check for SQL injection vulnerabilities
   - Check for shell injection vulnerabilities
   - Check for path traversal vulnerabilities
   - Verify all user inputs are validated and sanitized

2. **Code Quality**
   - Run the test suite
   - Check for TypeScript type errors
   - Run ESLint and fix any linting errors

3. **Commands**
   ```bash
   pnpm test        # Run test suite
   pnpm build       # Check for type errors
   pnpm lint        # Check for lint errors
   ```

## Architecture

### Route Structure
- `/` - Public landing page
- `/login` - OAuth sign-in (Google/Apple) + Email Magic Links
- `/demo/*` - Public demo mode (no auth required, static dummy data)
- `/privacy`, `/terms`, `/contact` - Public legal pages
- `/(dashboard)/*` - Protected routes (dashboard, journal, reports, settings, insights)
- `/api/*` - REST API endpoints
- `/api/cron/*` - Cron job endpoints (protected by CRON_SECRET)
- `/api/admin/*` - Admin endpoints (protected by ADMIN_EMAIL)

### Middleware (`src/middleware.ts`)
Protects all routes except:
- `/`, `/login`, `/privacy`, `/terms`, `/contact`, `/demo/*` (public pages)
- `/api/auth/*` (auth callbacks)
- `/api/cron/*` (cron jobs - protected by Bearer token via CRON_SECRET)
- `/api/health` (health check)
- `/_next/*`, `/favicon.ico` (static assets)

### Key Services

**SnapTrade Service** (`src/lib/services/snaptrade.service.ts`)
- `registerUser()` - Register user with SnapTrade
- `generateConnectionLink()` - Get OAuth URL for broker connection
- `syncTrades()` - Pull trades from all connected accounts

**FIFO P&L Engine** (`src/app/api/metrics/route.ts`)
- Groups trades by canonical key: `{accountId}:{universalSymbolId or symbol}`
- Matches BUY with SELL orders using FIFO within each account
- Supports long/short positions, options (standard + mini), fee tracking
- Uses `contractMultiplier` for options (100 for standard, 10 for mini)
- Date filters applied AFTER FIFO matching (not on raw trades) for accurate cross-period P&L
- Handles tag filtering - filters closed positions by tags before calculating metrics

**AI Coaching Service** (`src/lib/services/ai-coaching.service.ts`)
- Multi-LLM strategy: **Google Gemini 2.0 Flash** (primary) → **Groq Llama 3.3** (fallback)
- Coaching personas: Supportive Coach (default), Radical Candor (direct feedback)
- Redis caching (Upstash) - caches insights for 1 hour to reduce LLM costs
- Analyzes metrics, trade patterns, tags (setups/mistakes) for personalized recommendations
- Rate limited: 10 requests/hour per user to protect LLM quotas

**Email Alert Service** (`src/lib/services/email-alert.service.ts`)
- Sends proactive alerts when broker connections break (via Resend)
- Includes actionable links to reconnect accounts
- HTML email templates with branded styling

### Data Flow
1. User authenticates via NextAuth (Google/Apple OAuth or Email Magic Link)
2. User connects broker via SnapTrade (`connect-broker-button.tsx`)
3. `/api/trades/sync` pulls trades, stores in PostgreSQL (25s timeout for Vercel)
4. User tags trades with setups/mistakes (`TradeDetailSheet` component)
5. `/api/metrics` calculates P&L and returns analytics (respects tag filters)
6. `/api/insights` generates AI coaching using Gemini/Groq (with Redis caching)
7. Cron job (`/api/cron/sync-all`) syncs all users on schedule (daily at 6 PM EST)
8. If broker connection breaks, `/api/cron/check-connections` sends email alerts

## SnapTrade API Integration

**CRITICAL: The SnapTrade SDK returns snake_case fields, not camelCase.**

```typescript
// Correct field access:
trade.option_symbol      // NOT trade.optionSymbol
trade.option_symbol.option_type   // CALL or PUT
trade.option_symbol.strike_price
trade.option_symbol.expiration_date
trade.option_symbol.is_mini_option
trade.option_symbol.ticker   // OCC symbol for options
trade.trade_date         // NOT trade.tradeDate
trade.settlement_date
trade.option_type        // BUY_TO_OPEN, SELL_TO_CLOSE, etc.
```

**Option vs Stock Detection:**
```typescript
const isOption = !!trade.option_symbol;
const symbol = isOption ? trade.option_symbol.ticker : trade.symbol?.symbol;
const multiplier = isOption ? (trade.option_symbol.is_mini_option ? 10 : 100) : 1;
```

## Database Schema

Key models in `prisma/schema.prisma`:
- **User** - NextAuth user with SnapTrade credentials (snapTradeUserId, snapTradeUserSecret encrypted)
- **BrokerAccount** - Connected brokerage accounts (accountNumber encrypted)
- **Trade** - Transactions with option fields:
  - `type`: "STOCK" or "OPTION"
  - `optionType`: "CALL" or "PUT"
  - `strikePrice`, `expiryDate`
  - `optionAction`: BUY_TO_OPEN, SELL_TO_CLOSE, etc.
  - `contractMultiplier`: 100 for standard options, 10 for mini options, 1 for stocks
  - `positionKey`: Groups executions into positions (e.g., "acc123:AAPL:long")
- **Tag** - User-defined labels for categorizing trades
  - `name`: Tag display name (e.g., "Breakout", "FOMO")
  - `category`: "SETUP", "MISTAKE", "EMOTION", "CUSTOM"
  - `userId`: Belongs to specific user
- **TradeTag** - Join table linking trades to tags via `positionKey`

## Environment Variables

Required in `.env`:
```bash
# Database (Supabase)
DATABASE_URL              # PostgreSQL connection pooler
DIRECT_URL                # PostgreSQL direct connection (for migrations)

# NextAuth
AUTH_SECRET               # Generate: openssl rand -base64 32
AUTH_URL                  # App URL (e.g., http://localhost:3000)
NEXTAUTH_URL              # Same as AUTH_URL (legacy support)
NEXTAUTH_SECRET           # Same as AUTH_SECRET (legacy support)

# OAuth Providers
GOOGLE_CLIENT_ID          # Google OAuth client ID
GOOGLE_CLIENT_SECRET      # Google OAuth secret
APPLE_CLIENT_ID           # Apple OAuth client ID (optional)
APPLE_CLIENT_SECRET       # Apple OAuth secret (optional)

# Email (Resend - for magic links and alerts)
RESEND_API_KEY            # Resend API key
RESEND_FROM_EMAIL         # Sender email (e.g., login@yourdomain.com)

# SnapTrade (Brokerage Integration)
SNAPTRADE_CLIENT_ID       # SnapTrade client ID
SNAPTRADE_CONSUMER_KEY    # SnapTrade consumer key

# Encryption
DATA_ENCRYPTION_KEY       # AES-256-GCM key (generate: openssl rand -hex 32)

# Rate Limiting & Caching (Upstash Redis)
UPSTASH_REDIS_REST_URL    # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN  # Upstash Redis REST token

# AI Coaching (Multi-LLM)
GOOGLE_GENERATIVE_AI_API_KEY  # Google Gemini 2.0 Flash API key
GROQ_API_KEY                  # Groq (Llama 3.3) API key (fallback)

# Admin
ADMIN_EMAIL               # Admin email for protected routes
CRON_SECRET               # Secret for cron job authentication

# Public
NEXT_PUBLIC_APP_URL       # Public app URL (for client-side)
```

**Important Notes:**
- `DATA_ENCRYPTION_KEY` must be 64 hex characters (32 bytes)
- `AUTH_SECRET` should be generated with `openssl rand -base64 32`
- Rate limiting is optional but recommended (app degrades gracefully without Redis)
- AI Coaching requires at least one LLM API key (Gemini or Groq)

## Code Patterns

- **Path alias**: `@/*` maps to `./src/*`
- **UI components**: shadcn/ui primitives in `src/components/ui/`
- **Animations**: Framer Motion (`src/components/motion.tsx`)
- **Global state**: Filter Context (`src/contexts/filter-context.tsx`) with localStorage persistence
- **Brand colors**: `#2E4A3B` (dark green), `#FAFBF6` (cream), `#E59889` (coral)
- **Rate limiting**: Redis-based (Upstash) with graceful degradation if disabled
  - Auth endpoints: 10 req/min
  - Trade sync: 10 req/min
  - Single deletions: 30 req/min
  - Bulk operations: 5 req/min
  - AI Insights: 10 req/hour
- **Error handling**: Generic errors in production, detailed errors in development
- **Encryption**: AES-256-GCM for sensitive fields (SnapTrade secrets, account numbers)
- **Demo mode**: Static dummy data for exploring features without authentication

## P&L Calculation Details

The FIFO engine handles several edge cases:
- **Account isolation**: Trades are matched only within the same brokerage account
- **Option expiration**: `OPTIONEXPIRATION` action - negative quantity = closing long, positive = closing short
- **OCC symbol fallback**: Raw symbols like `SPXW  260105C06920000` auto-detected as options with 100x multiplier
- **Trade deduplication**: Prevents duplicate syncs by matching on snapTradeTradeId and content hash
- **Tag-based filtering**: Filters closed positions by tags BEFORE calculating metrics (P&L, win rate, etc.)
- **Position grouping**: Uses `positionKey` to group executions (e.g., "acc123:AAPL:long")

## Trade Tagging System

**Architecture** (`src/lib/services/tag.service.ts`):
- Tags apply to entire positions (all executions for a symbol/side), not individual trades
- `positionKey` format: `{accountId}:{symbol}:{side}` (e.g., "acc123:AAPL:long")
- Tags stored in join table `TradeTag` linking `tagId` + `positionKey`
- Categories: SETUP, MISTAKE, EMOTION, CUSTOM

**Key Operations**:
- `tagPosition()` - Tag all trades in a position via positionKey
- `untagPosition()` - Remove tag from all trades in a position
- `getPositionTags()` - Get tags for a specific position
- `getTradesByTag()` - Get all trades with a specific tag

**Analytics Integration**:
- Tag filters applied in `/api/metrics` route
- Only closed positions with matching tags included in calculations
- P&L, win rate, profit factor recalculated based on filtered trades

## AI Performance Coaching

**Architecture** (`src/lib/services/ai-coaching.service.ts`):
- **Multi-LLM Strategy**: Google Gemini 2.0 Flash (primary) → Groq Llama 3.3 (fallback)
- **Personas**:
  - Supportive Coach (default) - Encouraging, constructive feedback
  - Radical Candor (optional) - Direct, brutally honest feedback
- **Caching**: Redis-based (Upstash) - 1 hour TTL per user/persona
- **Rate Limiting**: 10 requests/hour per user to protect LLM quotas
- **Input Data**: Metrics, trade patterns, tag analytics (setups/mistakes), closed positions
- **Output**: 2-3 specific behavioral recommendations with rationale

**Demo Mode**:
- Static dummy insights for exploring feature without live data
- Bypasses LLM calls and rate limiting
- Located in `src/lib/services/ai-coaching.service.ts` (getDummyInsights function)
## Important Files & Components

### Core Services
- `src/lib/services/snaptrade.service.ts` - SnapTrade API integration
- `src/lib/services/tag.service.ts` - Trade tagging system
- `src/lib/services/ai-coaching.service.ts` - AI coaching with multi-LLM
- `src/lib/services/email-alert.service.ts` - Proactive email alerts
- `src/lib/encryption.ts` - AES-256-GCM encryption utilities
- `src/lib/ratelimit.ts` - Upstash Redis rate limiting
- `src/lib/auth.ts` - NextAuth configuration

### Key API Routes
- `/api/metrics/route.ts` - FIFO P&L calculation engine
- `/api/trades/sync/route.ts` - Pull trades from SnapTrade
- `/api/insights/route.ts` - AI coaching endpoint
- `/api/cron/sync-all/route.ts` - Cron job for syncing all users
- `/api/cron/check-connections/route.ts` - Broken connection alerts
- `/api/admin/data-quality/route.ts` - Admin data monitoring

### UI Components
- `src/components/views/connect-broker-button.tsx` - SnapTrade OAuth flow
- `src/components/views/trade-detail-sheet.tsx` - Trade tagging UI
- `src/components/views/ai-coaching-card.tsx` - AI insights display
- `src/components/views/metrics-grid.tsx` - Dashboard metrics
- `src/components/layout/app-sidebar.tsx` - Main navigation

### Context Providers
- `src/contexts/filter-context.tsx` - Global filter state (date, broker, account, symbol, tags)

## Security & RLS

**Strict "Deny-All" RLS + Backend Proxy Pattern:**
Artha uses a strict zero-trust posture for database access. Row Level Security (RLS) is used as a kill-switch for direct client access.

- **Enable RLS on all tables**: Every table (`User`, `Trade`, `BrokerAccount`, etc.) MUST have RLS enabled.
- **Default Deny**: Do NOT create permissive public policies. The Supabase/PostgREST API should return 0 rows for any unauthenticated or standard authenticated direct client request.
- **Backend Gatekeeper**: All database interactions MUST go through Next.js API routes or Edge Functions.
- **Service Role Secret**: The backend uses the `service_role` key (via Prisma) to bypass RLS after validating the user's identity.
- **Strict Authorization**: 
  - Every API route MUST verify the session JWT via `auth()`.
  - Every Prisma query MUST include an explicit `{ where: { userId: session.user.id } }` filter.
  - Never trust a `userId` passed in a request body or URL parameter.
- **Error Handling**: Fail silently or with generic 403 Forbidden errors to prevent account/data enumeration.

## Common Pitfalls & Troubleshooting

### SnapTrade API
- **CRITICAL**: Always use snake_case for SnapTrade SDK fields (e.g., `trade.option_symbol`, NOT `trade.optionSymbol`)
- Check for `option_symbol` existence to detect options: `const isOption = !!trade.option_symbol`
- Mini options use 10x multiplier, standard options use 100x
- Always handle null/undefined for optional fields like `trade.symbol`, `trade.option_symbol`

### Database & Prisma
- NEVER run `prisma migrate reset` or `prisma db push --force-reset` without explicit user approval
- Always regenerate Prisma client after schema changes: `pnpm prisma generate`
- Use `DIRECT_URL` for migrations, `DATABASE_URL` for connection pooling

### Rate Limiting
- App gracefully degrades if Redis is unavailable (logs warning, allows request)
- Test rate limits in development by setting short windows in `src/lib/ratelimit.ts`

### AI Coaching
- Gemini 2.0 is primary, Groq is fallback - both should be configured for reliability
- Cache misses trigger LLM call - ensure Redis is working to avoid excessive API usage
- Rate limiting protects against quota exhaustion (10 req/hour per user)

### Trade Tagging
- Tags apply to positions (via positionKey), not individual executions
- Metrics must respect tag filters - always pass `tagIds` to `/api/metrics`
- Position keys format: `{accountId}:{symbol}:{side}`

### Authentication
- NextAuth requires both `AUTH_SECRET` and `NEXTAUTH_SECRET` for backwards compatibility
- Email magic links require Resend API key and verified sending domain
- OAuth redirects must match exactly in provider settings

### Performance
- Trade sync has 25s Vercel timeout - avoid blocking operations
- AI insights cached for 1 hour - clear cache if testing new prompts
- Use client-side filtering for instant UI updates (FilterContext)
