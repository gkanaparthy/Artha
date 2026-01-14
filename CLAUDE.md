# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Artha is a trading journal that automatically syncs trades from connected brokerage accounts via SnapTrade API, calculates P&L using FIFO lot matching, and provides analytics. Built with Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, and Prisma with PostgreSQL (Supabase).

## Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm lint                   # Run ESLint

# Database
pnpm prisma generate        # Regenerate Prisma client after schema changes
pnpm prisma db push         # Push schema changes to database (dev)
pnpm prisma studio          # Open visual database editor
```

## Architecture

### Route Structure
- `/` - Public landing page
- `/login` - OAuth sign-in (Google/Apple)
- `/demo/*` - Public demo mode (no auth required)
- `/privacy`, `/terms`, `/contact` - Public legal pages
- `/(dashboard)/*` - Protected routes (dashboard, journal, reports, settings)
- `/api/*` - REST API endpoints
- `/api/cron/*` - Cron job endpoints (protected by CRON_SECRET)

### Middleware (`src/middleware.ts`)
Protects all routes except:
- `/`, `/login`, `/privacy`, `/terms`, `/contact`, `/demo/*` (public pages)
- `/api/auth/*` (auth callbacks)
- `/api/cron/*` (cron jobs - use Bearer token)
- `/api/health` (health check)

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

### Data Flow
1. User authenticates via NextAuth (Google/Apple OAuth)
2. User connects broker via SnapTrade (`connect-broker-button.tsx`)
3. `/api/trades/sync` pulls trades, stores in PostgreSQL (25s timeout for Vercel)
4. `/api/metrics` calculates P&L and returns analytics
5. Cron job (`/api/cron/sync-all`) syncs all users on schedule

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
- **BrokerAccount** - Connected brokerage accounts
- **Trade** - Transactions with option fields:
  - `type`: "STOCK" or "OPTION"
  - `optionType`: "CALL" or "PUT"
  - `strikePrice`, `expiryDate`
  - `optionAction`: BUY_TO_OPEN, SELL_TO_CLOSE, etc.
  - `contractMultiplier`: 100 for options, 1 for stocks

## Environment Variables

Required in `.env`:
```
DATABASE_URL              # PostgreSQL (Supabase pooler)
DIRECT_URL                # PostgreSQL (direct for migrations)
AUTH_SECRET               # NextAuth secret
AUTH_URL                  # App URL
GOOGLE_CLIENT_ID          # Google OAuth
GOOGLE_CLIENT_SECRET
SNAPTRADE_CLIENT_ID       # Brokerage API
SNAPTRADE_CONSUMER_KEY
DATA_ENCRYPTION_KEY       # For encrypting SnapTrade secrets
CRON_SECRET               # For cron job authentication
NEXT_PUBLIC_APP_URL
```

## Code Patterns

- Path alias: `@/*` maps to `./src/*`
- UI components: shadcn/ui primitives in `src/components/ui/`
- Animations: Framer Motion (`src/components/motion.tsx`)
- Global state: Filter Context (`src/contexts/filter-context.tsx`) with localStorage persistence
- Brand colors: `#2E4A3B` (dark green), `#FAFBF6` (cream), `#E59889` (coral)

## P&L Calculation Details

The FIFO engine handles several edge cases:
- **Account isolation**: Trades are matched only within the same brokerage account
- **Option expiration**: `OPTIONEXPIRATION` action - negative quantity = closing long, positive = closing short
- **OCC symbol fallback**: Raw symbols like `SPXW  260105C06920000` auto-detected as options with 100x multiplier
- **Trade deduplication**: Prevents duplicate syncs by matching on snapTradeTradeId and content hash
