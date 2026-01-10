# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Artha is a self-hosted trading journal that automatically syncs trades from connected brokerage accounts via SnapTrade API, calculates P&L using FIFO lot matching, and provides comprehensive analytics. Built with Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, and Prisma with PostgreSQL.

## Commands

```bash
# Development
pnpm dev                    # Start dev server (http://localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# Database
pnpm prisma generate        # Regenerate Prisma client
pnpm prisma migrate dev     # Run migrations in development
pnpm prisma studio          # Open visual database editor
```

## Architecture

### Route Structure
- `/` - Public landing page
- `/login` - OAuth sign-in (Google/Apple)
- `/(dashboard)/*` - Protected routes (dashboard, journal, reports, settings)
- `/api/*` - REST API endpoints

### Key Directories
- `src/app/(dashboard)/` - Dashboard pages with shared layout
- `src/app/api/` - API routes (metrics, trades, accounts, auth)
- `src/components/ui/` - shadcn/ui primitives
- `src/contexts/filter-context.tsx` - Global filter state (symbol, date, status, broker)
- `src/lib/` - Utilities, auth config, Prisma client, SnapTrade SDK

### Data Flow
1. User authenticates via NextAuth (Google/Apple OAuth)
2. User connects broker via SnapTrade SDK (connect-broker-button.tsx)
3. `/api/trades/sync` pulls trades from SnapTrade, stores in PostgreSQL
4. `/api/metrics` calculates P&L using FIFO lot matching algorithm
5. Dashboard pages fetch metrics and render with Recharts

### FIFO P&L Engine
Located in `/api/metrics/route.ts`. Groups trades by symbol, sorts chronologically, matches BUY orders with SELL orders using FIFO. Supports both long and short positions, options (strike price, expiry date), and fee tracking.

### Authentication
NextAuth v5 with JWT strategy. Middleware in `src/middleware.ts` protects all `/(dashboard)/*` routes. User's SnapTrade credentials stored in User model (snapTradeUserId, snapTradeUserSecret).

### State Management
- Filter Context: Global filters (symbol, date range, status, broker) with localStorage persistence
- No Redux/Zustand - uses React hooks (useState, useContext, useMemo)

## Database Schema

Key models in `prisma/schema.prisma`:
- **User** - NextAuth user with SnapTrade credentials
- **BrokerAccount** - Connected brokerage accounts (Schwab, Fidelity, etc.)
- **Trade** - Individual transactions with optional options fields (optionType, strikePrice, expiryDate)
- **Tag** - Trade tagging for analysis

## Environment Variables

Required in `.env`:
```
DATABASE_URL          # PostgreSQL (Supabase pooled connection)
DIRECT_URL            # PostgreSQL (direct for migrations)
AUTH_SECRET           # NextAuth secret (32+ chars)
AUTH_URL              # App URL
GOOGLE_CLIENT_ID      # Google OAuth
GOOGLE_CLIENT_SECRET
SNAPTRADE_CLIENT_ID   # Brokerage API
SNAPTRADE_CONSUMER_KEY
NEXT_PUBLIC_APP_URL
```

## Code Style

- Prettier: single quotes, semicolons, 2-space tabs, ES5 trailing commas
- Path alias: `@/*` maps to `./src/*`
- Components use shadcn/ui primitives from `src/components/ui/`
- Animations via Framer Motion (see `src/components/motion.tsx`)
