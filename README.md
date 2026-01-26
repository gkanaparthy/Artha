# Artha - Trading Journal & Analytics Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma)

**A modern, self-hosted trading journal that automatically syncs with your brokerage accounts.**

[Features](#features) • [Tech Stack](#tech-stack) • [Security](#security) • [Getting Started](#getting-started) • [Deployment](#deployment)

</div>

---

## Overview

**Artha** (Sanskrit: अर्थ, meaning "wealth" or "purpose") is a powerful trading journal and analytics platform designed for retail traders. It automatically syncs your trades from connected brokerage accounts, calculates P&L using FIFO lot matching, and provides comprehensive analytics to help you understand and improve your trading performance.

Unlike cloud-based solutions, Artha is self-hosted, giving you complete control over your sensitive financial data.

## ✨ Features

### 📊 Dashboard & Analytics
- **Real-time P&L tracking** - Net P&L, MTD, YTD metrics with live unrealized P&L
- **Win rate & profit factor** - Key performance indicators
- **Cumulative P&L charts** - Visualize your equity curve over time
- **Symbol performance breakdown** - See which tickers perform best
- **Drawdown analysis** - Track and minimize losses
- **Day-of-week performance** - Identify your best trading days
- **Interactive filtering** - Filter by date range, broker, account, symbol

### 📅 Calendar View
- **Daily P&L heatmap** - Color-coded calendar showing profit/loss days
- **Weekly summaries** - Aggregated weekly performance
- **Monthly overview** - Quick glance at monthly results
- **Trade counts** - See how active you are each day

### 📒 Trade Journal
- **Automatic trade sync** - Connect your broker, trades sync automatically
- **Full trade history** - Searchable history of all trades
- **Advanced filtering** - Filter by symbol, date, broker, account, action type
- **Position tracking** - View open and closed positions with live P&L
- **Trade deletion** - Clean up erroneous trades

### 🔗 Broker Integration
- **SnapTrade integration** - Connect 15+ brokerages:
  - Charles Schwab
  - Fidelity
  - Interactive Brokers (IBKR)
  - E*TRADE
  - Robinhood
  - TD Ameritrade
  - And more...
- **Automatic sync** - Trades are pulled automatically via cron jobs
- **Multi-account support** - Connect multiple brokerage accounts
- **OAuth security** - Secure broker authentication flow

### 🧮 Smart P&L Calculation
- **FIFO lot matching** - Accurate cost basis calculation
- **Options support** - Handles assignments, exercises, expirations with proper contract multipliers (100x)
- **Fee tracking** - Includes commissions in P&L calculations
- **Live unrealized P&L** - Real-time tracking of open positions
- **Phantom position detection** - Automatically identifies and handles incomplete trade history

68: ### 🏷️ Trade Tagging System
69: - **Setup & Mistake Tracking** - Tag trades with specific setups (e.g., "Breakout") and mistakes (e.g., "FOMO")
70: - **Position-Based Tagging** - Tags apply to the entire position (entry + exit), not just single executions
71: - **Analytics** - See P&L per tag to identify profitable setups and costly mistakes
72: - **Custom Categories** - Organize tags by Setup, Mistake, Emotion, or Custom
73: - **Bulk Operations** - Tag multiple trades at once for faster journaling
74: 
75: ### 🔔 Proactive Alerts
76: - **Connection Monitoring** - Automatically detects broken broker connections
77: - **Email Notifications** - Sends instant alerts when a connection is invalid (via Resend)
78: - **Actionable Links** - Emails include direct links to fix the issue
79: 
80: ### 🎨 User Experience
81: - **Dark/Light theme** - Toggle between themes
82: - **Responsive design** - Works on desktop and mobile
83: - **Fast filtering** - Client-side filtering for instant updates
84: - **Export capabilities** - Share reports as images
85: - **Smooth animations** - Framer Motion for polished UX
86: 
87: ## 🛡️ Security
88: 
89: Artha implements **enterprise-grade security** to protect your sensitive financial data:
90: 
91: ### Authentication & Authorization
92: - **NextAuth.js v5** - Industry-standard authentication
93: - **Multiple auth providers**:
94:   - Google OAuth
95:   - Apple OAuth
96:   - Email Magic Links (via Resend)
97: - **Session-based auth** - Secure, httpOnly cookies
98: - **Admin-only routes** - Protected admin endpoints with email verification
99: 
100: ### Data Protection
101: - **Field-level encryption** - AES-256-GCM encryption for:
102:   - SnapTrade user secrets
103:   - Broker account numbers
104:   - OAuth tokens
105: - **Zero-Trust architecture**:
106:   - Row-Level Security (RLS) enabled on all tables
107:   - No direct database access from client
108:   - All queries proxied through authenticated API routes
109:   - Service-role bypass only after session validation
110: 
111: ### Rate Limiting
112: - **Upstash Redis-based rate limiting** - Prevents abuse and DoS attacks
113: - **Granular limits**:
114:   - Auth endpoints: 10 requests/minute
115:   - Trade sync: 10 requests/minute
116:   - Single deletions: 30 requests/minute
117:   - Bulk operations: 5 requests/minute
118: - **IP-based tracking** - Sliding window algorithm
119: - **Graceful degradation** - App works even if rate limiting is disabled
120: 
121: ### API Security
122: - **CRON_SECRET protection** - Cron jobs require secret token
123: - **Admin email verification** - Admin routes verify user email
124: - **Input validation** - All inputs validated on server-side
125: - **Error handling** - Generic error messages in production
126: 
127: ## 🏗️ Tech Stack
128: 
129: | Layer | Technology |
130: |-------|------------|
131: | **Framework** | Next.js 16 (App Router, Turbopack) |
132: | **Language** | TypeScript 5 |
133: | **UI Library** | React 19 |
134: | **Styling** | Tailwind CSS 4 |
135: | **Components** | Radix UI, shadcn/ui |
136: | **Animations** | Framer Motion |
137: | **Charts** | Recharts |
138: | **Database** | PostgreSQL (Supabase) + Prisma ORM |
139: | **Auth** | NextAuth.js v5 |
140: | **Email** | Resend |
141: | **Broker API** | SnapTrade SDK |
142: | **AI (Planned)** | Groq (Llama 3) / Gemini |
143: | **Rate Limiting** | Upstash Redis |
144: | **Encryption** | Node.js Crypto (AES-256-GCM) |
145: | **Deployment** | Vercel (Serverless) |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (< 23)
- npm, yarn, pnpm, or bun
- PostgreSQL database (Supabase recommended)
- SnapTrade account (for broker integration)

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
   cp .env.example .env.local
   ```

   Configure the following in `.env.local`:
   ```env
   # Database (Supabase)
   DATABASE_URL=postgres://...
   DIRECT_URL=postgres://...

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-generate-with-openssl

   # Google OAuth (optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Apple OAuth (optional)
   APPLE_CLIENT_ID=your-apple-client-id
   APPLE_CLIENT_SECRET=your-apple-client-secret

   # Email (Resend - for magic links)
   RESEND_API_KEY=your-resend-api-key
   RESEND_FROM_EMAIL=login@yourdomain.com

   # SnapTrade (for broker integration)
   SNAPTRADE_CLIENT_ID=your-snaptrade-client-id
   SNAPTRADE_CONSUMER_KEY=your-snaptrade-consumer-key

   # Encryption (generate with: openssl rand -hex 32)
   DATA_ENCRYPTION_KEY=your-64-character-hex-key

   # Rate Limiting (Upstash Redis - optional but recommended)
   UPSTASH_REDIS_REST_URL=your-upstash-url
   UPSTASH_REDIS_REST_TOKEN=your-upstash-token

   # Admin (for admin routes)
   ADMIN_EMAIL=your-email@example.com

   # Cron (for automated sync)
   CRON_SECRET=your-cron-secret
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Required Setup Steps

#### 1. Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the Client ID and Secret to your `.env` file

#### 2. Resend Email (For Magic Links)
1. Sign up at [Resend](https://resend.com)
2. Verify your sending domain
3. Create an API key
4. Add to `.env.local`

#### 3. SnapTrade (For Broker Integration)
1. Sign up at [SnapTrade](https://snaptrade.com)
2. Get your Client ID and Consumer Key
3. Add to `.env.local`

#### 4. Upstash Redis (For Rate Limiting)
1. Sign up at [Upstash](https://console.upstash.com)
2. Create a Redis database (free tier available)
3. Copy REST URL and Token
4. Add to `.env.local`

## 📦 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables from `.env.local`

3. **Configure Cron Jobs** (in `vercel.json`)
   ```json
   {
     "crons": [{
       "path": "/api/cron/sync-all",
       "schedule": "0 18 * * 1-5"
     }]
   }
   ```

4. **Deploy**
   - Vercel will automatically deploy on push to `main`

### Environment Variables for Production

Make sure to add these in Vercel:
- All variables from `.env.local`
- Set `NEXTAUTH_URL` to your production domain
- Use production SnapTrade credentials
- Generate a new `NEXTAUTH_SECRET` for production
- Add `CRON_SECRET` for cron job protection

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Dashboard routes (protected)
│   │   ├── dashboard/      # Main dashboard
│   │   ├── journal/        # Trade journal page
│   │   ├── reports/        # Analytics & reports
│   │   └── settings/       # User settings
│   ├── api/                # API routes
│   │   ├── auth/           # Authentication
│   │   │   └── snaptrade/  # SnapTrade OAuth
│   │   ├── metrics/        # P&L calculations
│   │   ├── trades/         # Trade CRUD & sync
│   │   ├── accounts/       # Broker accounts
│   │   ├── admin/          # Admin endpoints
│   │   ├── cron/           # Cron jobs
│   │   └── debug/          # Debug endpoints
│   └── login/              # Auth pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   └── views/              # Page views
├── contexts/               # React contexts
├── lib/                    # Utilities & services
│   ├── services/           # External API services
│   ├── encryption.ts       # AES-256-GCM encryption
│   ├── ratelimit.ts        # Upstash rate limiting
│   └── auth.ts             # NextAuth configuration
└── prisma/                 # Database schema
```

## 🔧 Key Features Explained

### FIFO Lot Matching Engine
Artha uses a sophisticated FIFO (First-In-First-Out) lot matching algorithm to calculate accurate P&L:
- Tracks individual lots for each position
- Matches sells/covers to oldest buys/shorts first
- Handles partial fills and multiple lot sizes
- Supports both long and short positions
- Accounts for fees and commissions

### Options Handling
Full support for options trading:
- Contract multiplier (100x) applied automatically
- Assignment tracking (short option → long/short stock)
- Exercise tracking (long option → long/short stock)
- Expiration handling (worthless expirations)
- Accurate P&L for complex option strategies

### Phantom Position Detection
Automatically detects and handles incomplete trade history:
- Identifies orphaned sells (sell without corresponding buy)
- Flags suspicious positions for review
- Provides data quality monitoring dashboard
- Helps users identify missing trades

## 📊 Data Quality & Monitoring

Artha includes built-in data quality monitoring:
- **Admin dashboard** - View data health across all users
- **Phantom position detection** - Find orphaned trades
- **Duplicate detection** - Identify and clean duplicate trades
- **Data validation** - Check for suspicious timestamps, prices, quantities

## 🗺️ Roadmap

- [x] Dark/Light theme toggle
- [x] Rate limiting and security hardening
- [x] Field-level encryption
- [x] Live unrealized P&L
- [x] Admin data quality monitoring
- [x] Trade tagging and notes
- [x] Automated broken connection alerts
- [ ] AI-Powered Trade Analysis (Insights)
- [ ] Custom trade entry (manual trades)
- [ ] Import from CSV/Excel
- [ ] Multiple currency support
- [ ] Mobile app (React Native)
- [ ] Export reports to PDF
- [ ] Trade replay and simulation
- [ ] Advanced charting and technical analysis

## 📚 Documentation

- [Deployment Guide](docs/deployment-guide.md)
- [Security Assessment](docs/security-assessment.md)
- [Data Quality Monitoring](docs/DATA-QUALITY-MONITORING.md)
- [Broker Connection Debug](docs/BROKER-CONNECTION-DEBUG.md)
- [Code Audit](docs/CODE-AUDIT-2026-01-19.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [SnapTrade](https://snaptrade.com) - Brokerage integration API
- [Vercel](https://vercel.com) - Hosting and deployment
- [Supabase](https://supabase.com) - PostgreSQL database
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Upstash](https://upstash.com) - Serverless Redis

---

<div align="center">

**Built with passion by [Gautham Kanaparthy](https://www.linkedin.com/in/gkanaparthy/)**

⭐ Star this repo if you find it useful!

</div>
