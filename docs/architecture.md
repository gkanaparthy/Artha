# Artha Trading Journal - Architecture Document

## 1. Executive Summary

Artha is a modern trading journal application designed to help traders track, analyze, and improve their trading performance. The application integrates with brokerage accounts through SnapTrade API to automatically sync trades and provide comprehensive analytics.

## 2. System Overview

### 2.1 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Frontend | Next.js | 16.1 | React framework with App Router |
| UI Components | Shadcn/UI | Latest | Pre-built accessible components |
| Styling | Tailwind CSS | 4.x | Utility-first CSS framework |
| Animations | Framer Motion | 12.x | Declarative animations |
| Charts | Recharts | 3.x | Data visualization |
| Database | PostgreSQL | Latest | Cloud relational database (Supabase) |
| ORM | Prisma | 5.22.x | Database abstraction layer |
| Brokerage API | SnapTrade | Latest | Broker integration (100+ brokers) |
| AI Integration | Google Gemini / Groq | 1.5 Flash / Llama 3.3 | Performance Coaching & Insights |
| Caching | Upstash Redis | Latest | Rate limiting & Content caching |

### 2.2 Architecture Pattern

The application follows a **Monolithic Full-Stack Architecture** using Next.js App Router:

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React Components (Client)                │   │
│  │    - Dashboard, Journal, Reports, Settings Pages      │   │
│  │    - Framer Motion Animations                        │   │
│  │    - Recharts Visualizations                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Server (App Router)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   API Routes                          │   │
│  │    /api/metrics    - Trade metrics calculation        │   │
│  │    /api/trades     - Trade CRUD operations            │   │
│  │    /api/accounts   - Account management               │   │
│  │    /api/user       - User data                        │   │
│  │    /api/auth/*     - SnapTrade authentication         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
┌─────────────────────────┐         ┌───────────────────────────┐
│   PostgreSQL (Supabase) │         │     SnapTrade API         │
│     (via Prisma ORM)    │         │   (External Service)      │
│  ┌───────────────────┐  │         │  - Broker connections     │
│  │ User (AiPersona)  │  │         │  - Account data           │
│  │ BrokerAccount     │  │         │  - Trade history          │
│  │ Trade             │  │         └───────────────────────────┘
│  │ TagDefinition     │  │                       ▲
│  │ PositionTag       │  │                       │ 
│  │ TradeGroup (Legs) │  │          ┌────────────┴─────────────┐
│  └───────────────────┘  │          │   AI Integration Layer   │
└─────────────────────────┘          │ - Gemini 1.5 (Primary)   │
            ▲                        │ - Groq Llama 3.3 (Backup)│
            │                        └──────────────────────────┘
    ┌───────┴───────┐
    │ Upstash Redis │
    │ - Caching     │
    │ - Rate Limit  │
    └───────────────┘
```

## 3. Data Model

### 3.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐
│    User      │       │  BrokerAccount   │
├──────────────┤       ├──────────────────┤
│ id (PK)      │──────<│ userId (FK)      │
│ snapTradeId  │       │ id (PK)          │
│ aiPersona    │       │ accountNumber    │
│ createdAt    │       │ brokerName       │
└──────┬───────┘       └────────┬─────────┘
       │                        │
       │               ┌────────▼─────────┐
       │               │     Trade        │
       │               ├──────────────────┤
       │               │ id (PK)          │
       │               │ accountId (FK)   │
       │               │ symbol           │
       │               │ quantity/price   │
       │               │ positionKey      │
       └──────┬────────┴────────┬─────────┘
              │                 │
     ┌────────▼─────────┐       │      ┌──────────────────┐
     │  TagDefinition   │       │      │   TradeGroup     │
     ├──────────────────┤       │      ├──────────────────┤
     │ id (PK)          │       │      │ id (PK)          │
     │ name             │       │      │ strategyType     │
     │ category         │       │      │ opened/closedAt  │
     └────────┬─────────┘       │      └────────┬─────────┘
              │                 │               │
     ┌────────▼─────────┐       │      ┌────────▼─────────┐
     │   PositionTag    │<──────┘      │   TradeGroupLeg  │
     ├──────────────────┤              ├──────────────────┤
     │ positionKey (FK) │              │ groupId (FK)     │
     │ tagDefId (FK)    │              │ tradeId (FK)     │
     └──────────────────┘              └──────────────────┘
```

### 3.2 Database Schema Details

#### User Table
- **id**: UUID, primary key
- **snapTradeUserId**: Unique identifier from SnapTrade
- **createdAt/updatedAt**: Timestamps

#### Account Table
- **id**: UUID, primary key
- **userId**: Foreign key to User
- **snapTradeAccountId**: Unique brokerage account ID
- **brokerName**: Display name of the broker (e.g., "Robinhood", "TD Ameritrade")

#### Trade Table
- **id**: UUID, primary key
- **accountId**: Foreign key to Account
- **symbol**: Stock/ETF ticker symbol
- **action**: "BUY" or "SELL"
- **quantity**: Number of shares (can be negative for sells)
- **price**: Execution price per share
- **timestamp**: Trade execution time
- **fees**: Transaction fees
- **type**: Order type (MARKET, LIMIT, etc.)
- **currency**: Currency code (USD, CAD, etc.)
- **snapTradeId**: Original ID from SnapTrade for deduplication

## 4. Core Algorithms

### 4.1 FIFO P&L Calculation

The application uses **First-In-First-Out (FIFO)** matching to calculate profit/loss for each position:

```typescript
// Pseudocode for FIFO P&L calculation
function calculatePositionPnL(trades: Trade[]): ClosedPosition[] {
  // Group trades by symbol
  const tradesBySymbol = groupBy(trades, 'symbol');
  const closedPositions: ClosedPosition[] = [];

  for (const [symbol, symbolTrades] of tradesBySymbol) {
    // Sort by timestamp (oldest first)
    symbolTrades.sort((a, b) => a.timestamp - b.timestamp);

    const openLots: Lot[] = [];

    for (const trade of symbolTrades) {
      if (trade.action === 'BUY') {
        // Add to open lots
        openLots.push({
          quantity: trade.quantity,
          price: trade.price,
          timestamp: trade.timestamp
        });
      } else if (trade.action === 'SELL') {
        // Match against open lots (FIFO)
        let remainingToSell = Math.abs(trade.quantity);

        while (remainingToSell > 0 && openLots.length > 0) {
          const oldestLot = openLots[0];
          const matchedQty = Math.min(remainingToSell, oldestLot.quantity);

          // Calculate P&L
          const pnl = (trade.price - oldestLot.price) * matchedQty - fees;

          closedPositions.push({
            symbol,
            pnl,
            entryPrice: oldestLot.price,
            exitPrice: trade.price,
            quantity: matchedQty,
            openedAt: oldestLot.timestamp,
            closedAt: trade.timestamp
          });

          remainingToSell -= matchedQty;
          oldestLot.quantity -= matchedQty;

          if (oldestLot.quantity <= 0) {
            openLots.shift(); // Remove exhausted lot
          }
        }
      }
    }
  }

  return closedPositions;
}
```

### 4.2 Metrics Calculation

Key trading metrics are calculated from closed positions:

| Metric | Formula |
|--------|---------|
| Win Rate | (Winning Trades / Total Trades) * 100 |
| Profit Factor | Gross Profit / Gross Loss |
| Average Win | Total Profits / Winning Trade Count |
| Average Loss | Total Losses / Losing Trade Count |
| Risk/Reward | Average Win / Average Loss |
| Expectancy | (Win Rate * Avg Win) - (Loss Rate * Avg Loss) |
| Max Drawdown | Max(Peak - Current) / Peak * 100 |

## 5. API Reference

### 5.1 Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics` | GET | Get calculated trading metrics |
| `/api/trades` | GET | List all trades |
| `/api/trades/sync` | POST | Sync trades from SnapTrade |
| `/api/accounts` | GET | List connected accounts |
| `/api/user` | GET | Get user data |
| `/api/auth/snaptrade/register` | POST | Register user with SnapTrade |
| `/api/auth/snaptrade/login` | POST | Get SnapTrade connection link |
| `/api/auth/callback` | GET | Handle SnapTrade OAuth callback |

### 5.2 Query Parameters

**GET /api/metrics**
- `userId`: Required. User identifier
- `startDate`: Optional. Filter start date (ISO 8601)
- `endDate`: Optional. Filter end date (ISO 8601)
- `symbol`: Optional. Filter by symbol

## 6. Security Architecture

### 6.1 Implemented Protections
- **Authentication**: NextAuth.js v5 using JWT strategy for Edge compatibility.
- **Row-Level Security (RLS)**: Enforced via Supabase to ensure users can only access their own data.
- **Field-Level Encryption**: AES-256-GCM encryption for SnapTrade secrets and OAuth tokens using Node.js `crypto`.
- **Rate Limiting**: Integrated Upstash Redis for preventing API abuse on critical endpoints (Auth, Sync, AI).
- **Zero-Public API**: All sensitive brokerage interactions are proxied through server-side handlers; no direct client-to-SnapTrade communication.

### 6.2 Data Privacy
- **AES-256-GCM**: Sensitive SnapTrade tokens are encrypted before being stored in PostgreSQL.
- **Self-Hosted Preference**: Architecture designed to be easily deployable on Vercel or private VPS instances.

## 7. Component Architecture

### 7.1 Page Components

```
src/app/
├── page.tsx              # Dashboard
├── journal/page.tsx      # Trade Journal
├── reports/page.tsx      # Analytics & Reports
├── settings/page.tsx     # User Settings
└── auth/callback/page.tsx # OAuth callback
```

### 7.2 Shared Components

```
src/components/
├── ui/                   # Shadcn UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── table.tsx
│   └── ...
├── layout/
│   └── app-sidebar.tsx   # Navigation sidebar
├── positions-table.tsx   # Positions display
├── trade-detail-sheet.tsx # Trade details modal
└── motion.tsx            # Animation utilities
```

## 8. State Management

The application uses React's built-in state management:

- **useState**: Local component state
- **useCallback/useMemo**: Optimized computations
- **useEffect**: Data fetching and side effects
- **localStorage**: Persistent user ID storage

## 9. Performance Optimizations

1. **Client-side filtering**: Reduces API calls
2. **Memoized calculations**: Prevents unnecessary re-renders
3. **Lazy loading**: Components load on demand
4. **Optimistic updates**: Immediate UI feedback
5. **Animation throttling**: Delays based on position index

## 10. Future Architecture Considerations

### 10.1 Scalability
- Migrate to PostgreSQL for production
- Add Redis for caching
- Implement background job processing

### 10.2 Multi-tenancy
- Add proper user authentication
- Implement row-level security
- Add organization/team support

### 10.3 Mobile App
- Share API layer with React Native app
- Consider tRPC for type-safe API calls
- Implement offline-first architecture

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Claude Code Assistant*
