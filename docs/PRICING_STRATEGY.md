# Artha Trading Journal - Pricing Strategy

## Executive Summary

This document outlines the recommended pricing strategy for Artha Trading Journal based on competitive analysis and SaaS best practices. The strategy implements a 3-tier freemium model designed to maximize user acquisition while creating clear upgrade paths.

---

## Competitive Landscape

### Direct Competitors Pricing (as of January 2026)

| Platform | Free Tier | Entry Price | Mid Tier | Premium | Annual Option |
|----------|-----------|-------------|----------|---------|---------------|
| **Tradervue** | Yes (30 trades/mo) | $29.95/mo | $49.95/mo | - | No |
| **TraderSync** | No (7-day trial) | $29.95/mo | $49.95/mo | $79.95/mo | 13% off |
| **TradeZella** | No | $29/mo | $49/mo | - | $288/yr, $399/yr |
| **TradesViz** | Yes (3k exec/mo) | $19.99/mo | $29.99/mo | - | 25% off |
| **Edgewonk** | No (14-day trial) | $169/yr (~$14/mo) | - | - | Only annual |
| **Trademetria** | Trial with discount | $29.95/mo | $39.95/mo | - | $215/yr, $279/yr |

### Key Insights

1. **Price clustering at $29-30/mo** - Most competitors anchor at this price point
2. **TradesViz undercuts at $19.99** - Only competitor with robust free tier AND lower pricing
3. **Edgewonk dominates annual** - $169/year is compelling for cost-conscious traders
4. **Free tiers are limited** - Tradervue (30 trades), TradesViz (3k executions) - designed for conversion

---

## Artha's Competitive Advantages

### Current Features (All Free)

| Feature | Artha | TraderSync | TradeZella | TradesViz |
|---------|-------|------------|------------|-----------|
| Auto broker sync | 700+ brokers | 900+ brokers | Limited | 200+ |
| FIFO P&L engine | Yes | Yes | Yes | Yes |
| Options support | Full (100x/10x) | Full | Full | Full |
| Multi-broker | Unlimited | Tiered | Tiered | Tiered |
| Live positions | Yes | Yes | Yes | Yes |
| Export | CSV | CSV/Excel | Excel | CSV |
| Demo mode | Yes | No | No | Yes |

### Gaps to Address

| Feature | Artha | Competitors |
|---------|-------|-------------|
| Multi-leg strategies | Planned | TradesViz only |
| Psychology tracking | No | Edgewonk |
| AI insights | No | TraderSync |
| Mobile app | No | TradeZella |

---

## Recommended Pricing Tiers

### Tier 1: Free
**Price:** $0/month

**Target User:** Casual traders, beginners, evaluation users

**Limits:**
- 1 broker connection
- 100 trade syncs per month
- 6 months historical data retention
- Basic metrics only:
  - Net P&L
  - Win Rate
  - Total Trades
  - Basic equity curve
- No export functionality
- No multi-leg strategy grouping
- Community support only

**Rationale:**
- Free tier is essential for user acquisition (reduces CAC by 60%)
- 100 trades/month covers ~5 trades/day - enough for swing traders, limits day traders
- 6-month history creates urgency to upgrade before data loss
- Basic metrics provide value while reserving advanced analytics for paid tiers

---

### Tier 2: Pro
**Price:** $14.99/month OR $119/year (34% savings)

**Target User:** Active traders, day traders, options traders

**Features:**
- 3 broker connections
- Unlimited trade syncs
- Unlimited historical data
- Full dashboard metrics:
  - All 10+ metrics
  - Profit factor, largest win/loss, avg trade
  - MTD/YTD calculations
- All report charts:
  - Equity curve
  - Monthly performance
  - Symbol breakdown
  - Day-of-week analysis
  - Drawdown chart
  - Trading radar
- Calendar heatmap
- CSV export
- Report sharing
- Multi-leg strategy grouping (vertical spreads)
- Advanced filtering (symbol, account, date, asset type)
- Email support (48hr response)

**Rationale:**
- $14.99 undercuts ALL competitors ($19.99-$29.95 range)
- "Under $15" psychological pricing threshold
- $119/year ($9.92/mo effective) competes with Edgewonk ($169/yr)
- 3 broker connections covers most active traders

---

### Tier 3: Premium
**Price:** $29.99/month OR $239/year (33% savings)

**Target User:** Professional traders, multi-account managers

**Features:**
- Everything in Pro, plus:
- Unlimited broker connections
- Multi-leg strategy grouping (all strategy types)
- Advanced analytics:
  - Symbol correlation
  - Portfolio beta
  - Sector breakdown
- Priority sync (2-minute intervals vs 6-hour)
- API access (future)
- White-label reports (future)
- Priority support (24hr response)
- Psychology tracking & mood tagging (future)

**Rationale:**
- $29.99 still undercuts TraderSync Premium ($49.95) and TradeZella ($49)
- Unlimited brokers appeals to professionals with multiple accounts
- Priority sync is low-cost differentiator with high perceived value
- Creates clear upgrade path as traders scale

---

## Pricing Psychology & Strategy

### Why These Prices Work

1. **Anchoring below market** - All tiers are 30-50% below competing products
2. **Annual discount visibility** - 33-34% savings creates urgency
3. **Feature gating done right** - Free tier is useful, not crippled
4. **Value-based progression** - Each tier unlocks clear additional value

### Free-to-Paid Conversion Strategy

Based on SaaS benchmarks (2-5% freemium conversion), targeting:
- **Month 1-3:** Focus on activation (getting users to sync trades)
- **Month 3-6:** Show upgrade prompts when limits approached
- **Month 6+:** Data retention warning creates urgency

**Key Conversion Triggers:**
1. "You've used 90/100 trades this month" notification
2. "Your data older than 6 months will be archived" warning
3. "Unlock strategy grouping for your options trades" prompt
4. "Export your trades to CSV" gated feature

---

## Implementation Phases

### Phase 1: Foundation (Now)
- Keep current features free for existing users
- Implement usage tracking (trade count, broker count)
- Mark existing users as "Founders" tier

### Phase 2: Soft Limits (After multi-leg feature)
- New signups get Free tier with limits
- Show limits in settings page
- Add "Upgrade" buttons throughout app
- Implement 14-day Pro trial for new users

### Phase 3: Full Monetization
- Integrate Stripe for subscription management
- Implement subscription webhooks
- Add billing management page
- Launch with promotional pricing (first 100 paid users get 50% off first year)

---

## Revenue Projections

### Conservative Estimates (2-5% conversion rate)

| Total Users | Free (80%) | Pro (15%) | Premium (5%) | Monthly Revenue |
|-------------|------------|-----------|--------------|-----------------|
| 100 | 80 | 15 | 5 | $375 |
| 500 | 400 | 75 | 25 | $1,875 |
| 1,000 | 800 | 150 | 50 | $3,750 |
| 2,500 | 2,000 | 375 | 125 | $9,375 |
| 5,000 | 4,000 | 750 | 250 | $18,750 |
| 10,000 | 8,000 | 1,500 | 500 | $37,500 |

### Optimistic Estimates (5-10% conversion)

| Total Users | Free (70%) | Pro (22%) | Premium (8%) | Monthly Revenue |
|-------------|------------|-----------|--------------|-----------------|
| 1,000 | 700 | 220 | 80 | $5,698 |
| 5,000 | 3,500 | 1,100 | 400 | $28,490 |
| 10,000 | 7,000 | 2,200 | 800 | $56,980 |

---

## Competitor Response Anticipation

### If competitors lower prices:
- Emphasize auto-sync quality and broker coverage
- Highlight FIFO accuracy for options
- Double down on free tier value

### If competitors add free tiers:
- Increase free tier limits slightly
- Accelerate premium feature development
- Focus on user experience differentiation

---

## Key Metrics to Track

1. **Acquisition:** Free signups per week
2. **Activation:** % of signups who sync 1+ trade
3. **Conversion:** Free-to-Pro conversion rate
4. **Expansion:** Pro-to-Premium upgrade rate
5. **Retention:** Monthly churn by tier
6. **Revenue:** MRR, ARPU, LTV

---

## Appendix: Feature Comparison Matrix

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Broker connections | 1 | 3 | Unlimited |
| Trade syncs/month | 100 | Unlimited | Unlimited |
| Historical data | 6 months | Unlimited | Unlimited |
| Basic metrics | Yes | Yes | Yes |
| Advanced metrics | No | Yes | Yes |
| All report charts | No | Yes | Yes |
| Calendar heatmap | No | Yes | Yes |
| CSV export | No | Yes | Yes |
| Report sharing | No | Yes | Yes |
| Vertical spreads | No | Yes | Yes |
| All strategy types | No | No | Yes |
| Advanced analytics | No | No | Yes |
| Priority sync | No | No | Yes |
| API access | No | No | Yes |
| Support | Community | Email (48hr) | Priority (24hr) |

---

**Document Version:** 1.0
**Created:** 2026-01-24
**Status:** Ready for Review
