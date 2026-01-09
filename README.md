# Artha - Trading Journal & Analytics Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma)

**A modern, self-hosted trading journal that automatically syncs with your brokerage accounts.**

[Features](#features) • [Tech Stack](#tech-stack) • [Architecture](#architecture) • [Getting Started](#getting-started) • [Screenshots](#screenshots)

</div>

---

## Overview

**Artha** (Sanskrit: अर्थ, meaning "wealth" or "purpose") is a powerful trading journal and analytics platform designed for retail traders. It automatically syncs your trades from connected brokerage accounts, calculates P&L using FIFO lot matching, and provides comprehensive analytics to help you understand and improve your trading performance.

Unlike cloud-based solutions, Artha is self-hosted, giving you complete control over your sensitive financial data.

## Features

### 📊 Dashboard & Analytics
- **Real-time P&L tracking** - Net P&L, MTD, YTD metrics
- **Win rate & profit factor** - Key performance indicators
- **Cumulative P&L charts** - Visualize your equity curve
- **Symbol performance breakdown** - See which tickers perform best
- **Drawdown analysis** - Track and minimize losses
- **Day-of-week performance** - Identify your best trading days

### 📅 Calendar View
- **Daily P&L heatmap** - Color-coded calendar showing profit/loss days
- **Weekly summaries** - Aggregated weekly performance
- **Monthly overview** - Quick glance at monthly results
- **Trade counts** - See how active you are each day

### 📒 Trade Journal
- **Automatic trade sync** - Connect your broker, trades sync automatically
- **Trade history** - Full searchable history of all trades
- **Filtering & sorting** - Filter by symbol, date, broker, action type
- **Position tracking** - View open and closed positions

### 🔗 Broker Integration
- **SnapTrade integration** - Connect 15+ brokerages (Schwab, Fidelity, Interactive Brokers, etc.)
- **Automatic sync** - Trades are pulled automatically
- **Multi-account support** - Connect multiple brokerage accounts

### 🧮 Smart P&L Calculation
- **FIFO lot matching** - Accurate cost basis calculation
- **Options support** - Handles assignments, exercises, and options trades
- **Fee tracking** - Includes commissions in P&L calculations

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS 4 |
| **Components** | Radix UI, shadcn/ui |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Database** | SQLite + Prisma ORM |
| **Auth** | NextAuth.js v5 (Google OAuth) |
| **Broker API** | SnapTrade SDK |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Dashboard  │  │   Journal   │  │   Reports   │  │  Settings  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                                   │                                  │
│                    ┌──────────────┴──────────────┐                  │
│                    │     Filter Context          │                  │
│                    │  (Global State Management)  │                  │
│                    └──────────────┬──────────────┘                  │
└───────────────────────────────────┼─────────────────────────────────┘
                                    │ HTTP/REST
┌───────────────────────────────────┼─────────────────────────────────┐
│                         NEXT.JS SERVER                              │
│  ┌────────────────────────────────┴────────────────────────────┐   │
│  │                      API Routes (/api)                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │   │
│  │  │ /metrics │  │ /trades  │  │/accounts │  │ /auth/...   │  │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │   │
│  └───────┼─────────────┼─────────────┼───────────────┼──────────┘   │
│          │             │             │               │              │
│  ┌───────┴─────────────┴─────────────┴───────┐  ┌────┴────────┐    │
│  │              Prisma ORM                    │  │  NextAuth   │    │
│  │         (Data Access Layer)                │  │   (Auth)    │    │
│  └───────────────────┬───────────────────────┘  └──────┬──────┘    │
│                      │                                  │           │
│  ┌───────────────────┴──────────────────────────────────┴────────┐ │
│  │                     SQLite Database                            │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌─────────┐         │ │
│  │  │  Users  │ │ Trades  │ │BrokerAccounts│ │Sessions │         │ │
│  │  └─────────┘ └─────────┘ └─────────────┘ └─────────┘         │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
                    ┌───────────────────────────────┐
                    │      SnapTrade API            │
                    │   (Brokerage Aggregator)      │
                    │                               │
                    │  ┌─────────┐  ┌──────────┐   │
                    │  │ Schwab  │  │ Fidelity │   │
                    │  └─────────┘  └──────────┘   │
                    │  ┌─────────┐  ┌──────────┐   │
                    │  │  IBKR   │  │    ...   │   │
                    │  └─────────┘  └──────────┘   │
                    └───────────────────────────────┘
```

### Key Design Decisions

- **FIFO Lot Engine** - Deterministic P&L calculation with proper cost basis tracking for both long and short positions
- **Client-side filtering** - Instant filter updates for status/broker without API calls
- **Server-side filtering** - Date and symbol filters query the database for performance
- **Local-first** - SQLite database for simplicity and data ownership

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gkanaparthy/Artha.git
   cd Artha
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Configure the following in `.env`:
   ```env
   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # SnapTrade (for broker integration)
   SNAPTRADE_CLIENT_ID=your-snaptrade-client-id
   SNAPTRADE_CONSUMER_KEY=your-snaptrade-consumer-key
   ```

4. **Initialize the database**
   ```bash
   npx prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID and Secret to your `.env` file

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard routes (protected)
│   │   ├── journal/        # Trade journal page
│   │   ├── reports/        # Analytics & reports
│   │   └── settings/       # User settings
│   ├── api/                # API routes
│   │   ├── metrics/        # P&L calculations
│   │   ├── trades/         # Trade CRUD & sync
│   │   └── accounts/       # Broker accounts
│   └── login/              # Auth pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── layout/             # Layout components
├── contexts/               # React contexts
├── hooks/                  # Custom hooks
├── lib/                    # Utilities & services
│   └── services/           # External API services
├── types/                  # TypeScript types
└── prisma/                 # Database schema
```

## Roadmap

- [ ] Trade tagging and notes
- [ ] Custom trade entry (manual trades)
- [ ] Import from CSV/Excel
- [ ] Multiple currency support
- [ ] Dark/Light theme toggle
- [ ] Mobile responsive design improvements
- [ ] Export reports to PDF
- [ ] Trade replay and simulation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

---

<div align="center">

**Built with passion by [Gautham Kanaparthy](https://www.linkedin.com/in/gkanaparthy/)**

</div>
