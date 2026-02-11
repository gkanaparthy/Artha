# Artha Analytics Roadmap

**Date:** February 8, 2026
**Status:** Planning
**Goal:** Expand Artha's analytics suite to serve day traders, swing traders, and options traders with metrics that justify Pro pricing and create competitive differentiation.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Competitive Gaps](#2-competitive-gaps)
3. [Proposed Features by Priority](#3-proposed-features-by-priority)
4. [Tier 1 — Must-Have (Next Release)](#4-tier-1--must-have-next-release)
5. [Tier 2 — High Value (Following Release)](#5-tier-2--high-value-following-release)
6. [Tier 3 — Differentiators (Future)](#6-tier-3--differentiators-future)
7. [Feature Details by Trader Type](#7-feature-details-by-trader-type)
8. [Implementation Considerations](#8-implementation-considerations)
9. [What NOT to Build](#9-what-not-to-build)

---

## 1. Current State

### What Artha Already Has
- FIFO P&L engine with multi-account, multi-asset support
- Core metrics: Net P&L, Win Rate, Profit Factor, Avg Win/Loss, Largest Win/Loss, MTD/YTD
- 7 chart types: Equity Curve, Monthly Performance, Win/Loss Distribution, Day of Week, Radar, Drawdown, Symbol Performance
- Calendar heat map with daily/weekly/monthly P&L
- Tag-based performance attribution (Setup, Mistake, Emotion categories)
- "Behavioral Alpha" card showing cost of mistakes
- AI Performance Coaching (Gemini/Groq with persona selection)
- Options support: spread detection, multi-leg strategies, Greeks-aware FIFO
- Global filtering: date range, symbol, account, asset type, tags
- Export to CSV/Excel

### What's Missing (vs. Competitors)
The gaps fall into five categories:

| Category | Gap | Competitors Who Have It |
|----------|-----|------------------------|
| **Time Analysis** | Entry/exit time-of-day heatmap | TradeZella, Tradervue, TraderSync, EdgeWonk |
| **Time Analysis** | Trade duration vs. P&L | TradeZella, TraderSync, EdgeWonk, Kinfo |
| **Risk Metrics** | R-Multiple, Sharpe, Sortino | EdgeWonk, Tradervue, TradesViz |
| **Trade Quality** | MFE/MAE (max favorable/adverse excursion) | Tradervue, TraderSync, EdgeWonk, TradesViz |
| **Trade Quality** | Best exit analysis | TraderSync, TradesViz |
| **Behavioral** | Overtrading detection | TradeZella, EdgeWonk |
| **Behavioral** | Plan compliance tracking | EdgeWonk, TradesViz |
| **Behavioral** | Composite performance score | TradeZella (Zella Score), EdgeWonk (Tiltmeter) |
| **Options** | Greeks tracking (Delta, Theta, IV) | TradesViz |
| **Options** | DTE analysis | TradesViz |
| **Statistical** | Kelly Criterion, SQN | Tradervue |
| **Statistical** | P-value / statistical significance | Tradervue |
| **Simulation** | What-if / rolling exit | TraderSync, EdgeWonk, TradesViz |
| **Comparison** | Side-by-side strategy comparison | TraderSync |

---

## 2. Competitive Gaps

### Artha's Current Position

**Artha is strong in:**
- AI coaching (only TradeZella and TradesViz compete here)
- Tag-based behavioral analytics (Mistake Cost + What-If)
- Clean UX (most competitors look like Bloomberg terminals from 2008)
- Auto-sync from 25+ brokers (removes manual entry friction)

**Artha is weak in:**
- Time-of-day analysis (every competitor has this, Artha doesn't)
- Trade duration insights (basic avg holding period, no breakdown)
- Risk-adjusted metrics (no Sharpe, Sortino, or R-Multiple)
- Trade quality metrics (no MFE/MAE)
- Options-specific analytics (have FIFO but no Greeks/DTE analysis)
- Statistical rigor (no significance testing, no SQN)

**Biggest competitive threat:** A day trader comparing Artha vs TradeZella will immediately notice the missing time-of-day and duration reports. These are table-stakes features.

---

## 3. Proposed Features by Priority

### Priority Framework

Features are ranked by:
1. **Competitive necessity** — Do most competitors have this? (table stakes)
2. **User demand** — Which trader types need this most?
3. **Implementation effort** — Can we build it with existing data?
4. **Revenue impact** — Does this justify Pro pricing?

---

## 4. Tier 1 — Must-Have (Next Release)

These features close the most critical competitive gaps using data we already collect.

### 4.1 Time-of-Day Performance Report

**What:** Heatmap and bar chart showing P&L by hour of day (entry time).

**Why:** Every competitor has this. Day traders consider it essential for identifying their productive hours vs. overtrading windows.

**Metrics per hour:**
- Net P&L
- Trade count
- Win rate
- Avg P&L per trade

**Visualizations:**
- Heatmap grid: Hour (rows) x Day of week (columns), colored by P&L
- Bar chart: Hourly P&L with trade count overlay
- "Best Window" highlight: Auto-identify the 2-hour block with highest profit factor

**Data source:** Trade `date` field already has timestamps. Group by hour of `date`.

**Trader types served:** Day traders (primary), swing traders (secondary — identifies best entry windows).

**Effort:** Low — pure frontend aggregation from existing metrics API data.

---

### 4.2 Trade Duration Analysis

**What:** Scatter plot and breakdown showing how long trades are held vs. their P&L outcome.

**Why:** TradeZella, TraderSync, EdgeWonk, and Kinfo all have this. It answers: "Am I holding winners long enough? Am I cutting losers fast enough?"

**Metrics:**
- Average hold time for winners vs. losers (already calculated but not broken down)
- P&L distribution by hold time bucket (< 1 hour, 1-4 hours, 4-8 hours, 1 day, 2-5 days, 1-4 weeks, > 1 month)
- Optimal hold time identification (bucket with highest avg P&L)

**Visualizations:**
- Scatter plot: X = hold time (log scale), Y = P&L, colored by win/loss
- Bar chart: Avg P&L by duration bucket
- Stat card: "Your sweet spot: trades held 1-4 hours have 68% win rate"

**Data source:** Difference between entry and exit dates on closed positions. Already available in FIFO output.

**Trader types served:** All (day traders see intraday patterns, swing traders see multi-day patterns).

**Effort:** Low — calculation from existing position data.

---

### 4.3 Session Performance (Day Trader View)

**What:** Break each trading day into Morning (9:30-11:30), Midday (11:30-14:00), and Afternoon (14:00-16:00) sessions.

**Why:** Day traders frequently have a strong morning but give back profits in the afternoon. This feature directly addresses that pattern.

**Metrics per session:**
- Net P&L
- Trade count
- Win rate
- Avg trade P&L
- "Session contribution" — percentage of daily P&L from each session

**Visualizations:**
- Stacked bar chart: Daily P&L split by session (morning/midday/afternoon)
- Summary stats: "You make 78% of your profits before 11:30 AM"
- Warning indicator if afternoon trading has negative expectancy

**Data source:** Trade timestamps, grouped into sessions.

**Effort:** Low-Medium — needs session bucketing logic, otherwise existing data.

---

### 4.4 Risk-Adjusted Metrics

**What:** Add Sharpe Ratio, Sortino Ratio, and Risk/Reward enhancements to the Reports page.

**Why:** Serious traders judge systems by risk-adjusted returns, not raw P&L. EdgeWonk and TradesViz have these. Tradervue has SQN. Adding these signals that Artha is for serious traders.

**Metrics to add:**
- **Sharpe Ratio**: (Mean daily P&L - Risk-free rate) / Std deviation of daily P&L. Standard benchmark: > 1.0 is good, > 2.0 is excellent.
- **Sortino Ratio**: Like Sharpe but only penalizes downside volatility. Better for traders who have occasional big wins.
- **Calmar Ratio**: Annualized return / Max drawdown. Measures return per unit of drawdown pain.
- **Trade P&L Standard Deviation**: Already used internally for Sharpe, surface it as a stat.

**Display:**
- Add to the existing summary stats cards on the Reports page
- Color-coded: Red (< 0.5), Yellow (0.5-1.0), Green (> 1.0), Blue (> 2.0)
- Tooltip explaining what each ratio means in plain English

**Data source:** Daily P&L time series (already calculated for equity curve). Pure math on existing data.

**Effort:** Low — mathematical calculations on existing arrays.

---

### 4.5 Overtrading Detection

**What:** Track trade count per day against profitability. Alert when the user's performance degrades with more trades.

**Why:** Overtrading is the #1 behavioral mistake for day traders. EdgeWonk and TradeZella have variants of this.

**Metrics:**
- Avg P&L per trade when trading 1-3 trades/day vs. 4-6 vs. 7-10 vs. 10+
- Win rate by daily trade count
- "Optimal trade count" — the daily volume where expected value peaks
- Days where overtrading caused a positive morning to turn into a loss day

**Visualizations:**
- Bar chart: Avg P&L per trade vs. daily trade count buckets
- Stat card: "Your optimal zone: 3-5 trades/day (win rate: 62%). Above 8 trades, your win rate drops to 41%."
- AI coaching integration: Feed this data to the AI for personalized overtrading warnings

**Data source:** Group existing trade data by date, count trades per day, correlate with P&L.

**Effort:** Low-Medium.

---

## 5. Tier 2 — High Value (Following Release)

These features add significant analytical depth and competitive differentiation.

### 5.1 MFE/MAE Analysis (Maximum Favorable/Adverse Excursion)

**What:** For each closed trade, calculate how far price moved in your favor (MFE) and against you (MAE) during the life of the trade.

**Why:** This is one of the most powerful trade management tools. It answers: "Am I leaving money on the table by exiting too early?" and "Am I letting losers run too far before stopping out?"

**Metrics:**
- Average MFE (how much was available to capture)
- Average MAE (how much pain was endured before exit)
- MFE Capture Ratio: Actual P&L / MFE — "you captured 45% of available profit on average"
- MAE Tolerance: MAE / Entry price — "average drawdown before exit was 2.3%"

**Visualizations:**
- Scatter plot: MFE (x) vs. actual P&L (y) — shows how much profit you leave on the table
- Scatter plot: MAE (x) vs. actual P&L (y) — shows your stop-loss discipline
- Distribution histogram of MFE capture ratio

**Data requirement:** This needs intraday high/low data between entry and exit dates. Options:
1. Fetch historical OHLC data from a market data API (Alpha Vantage, Polygon, Yahoo Finance)
2. Approximate using daily high/low from SnapTrade's activity data
3. Store as metadata when syncing trades if SnapTrade provides price history

**Effort:** Medium-High — requires external market data integration.

**Trader types served:** All, but especially day traders optimizing exits.

---

### 5.2 R-Multiple Analysis

**What:** Express each trade's P&L in units of initial risk (R), where 1R = the amount risked on the trade.

**Why:** R-Multiples normalize trade performance regardless of position size. A +3R trade (made 3x what you risked) is objectively better than a +$500 trade where context is unknown.

**Metrics:**
- Average R-Multiple (expectancy in R units)
- R-Multiple distribution histogram
- Percentage of trades > +2R, > +3R
- Percentage of trades worse than -1R (trades where you lost more than planned)

**Data requirement:** Needs the user's intended stop-loss for each trade. Options:
1. Allow users to manually enter stop-loss when tagging trades
2. Estimate from MAE data (if MFE/MAE is built first)
3. Calculate from initial position risk using ATR-based default stops

**Display:**
- Histogram: R-Multiple distribution with mean line
- Stat cards: Avg R, % of trades > 2R, % of trades > -1R
- Table column: R-Multiple per position in the positions table

**Effort:** Medium — needs stop-loss data (user input or estimation).

---

### 5.3 Strategy Comparison (Side-by-Side)

**What:** Compare two or more tagged strategies (setups) head-to-head across all metrics.

**Why:** Traders tag trades with setup types but currently can only see aggregate performance. They need: "Is my breakout strategy better than my pullback strategy?"

**Metrics per strategy (side-by-side):**
- Net P&L, Win Rate, Profit Factor, Avg Win/Loss, Trade Count
- Equity curve overlay (both strategies on same chart)
- Risk-adjusted metrics (Sharpe, Sortino per strategy)
- Best/worst performing setup with statistical significance

**Visualization:**
- Comparison table with delta column ("Strategy A wins by +12% in win rate")
- Overlaid equity curves (2-3 strategies on same chart)
- Radar chart comparing multiple strategies across 5 dimensions

**Data source:** Existing tag system already associates trades with setups. Filter metrics by tag.

**Effort:** Medium — needs UI for comparison selection, then reuse existing metrics calculations with tag filters.

---

### 5.4 Artha Score (Composite Performance Score)

**What:** A single 0-100 score that captures overall trading quality, updated daily.

**Why:** TradeZella has "Zella Score," EdgeWonk has "Tiltmeter." A composite score creates engagement (traders check it daily) and gamification (improvement over time).

**Score Components (weighted):**
| Component | Weight | What It Measures |
|-----------|--------|-----------------|
| Win Rate | 15% | Consistency |
| Profit Factor | 20% | Edge quality |
| Risk Management | 20% | Max drawdown, avg loss size, stop discipline |
| Behavioral Discipline | 20% | Mistake frequency, overtrading, plan adherence |
| Consistency | 15% | Std deviation of daily P&L, streak patterns |
| Growth | 10% | Month-over-month improvement trend |

**Display:**
- Large circular gauge on dashboard (like a credit score)
- Trend sparkline showing score over last 30 days
- Breakdown showing which components are dragging the score down
- "Improve your score" suggestions linked to AI coaching

**Effort:** Medium — algorithm design is the hard part, data is already available.

---

### 5.5 Win/Loss Day Analysis

**What:** Separate analysis of winning days vs. losing days.

**Why:** Tradervue has a dedicated "Win vs Loss Days" report. The insight: "On winning days, I average +$450 in 4 trades. On losing days, I average -$680 in 9 trades." This immediately reveals overtrading on bad days.

**Metrics:**
- Count of green days vs. red days
- Day Win Rate (% of trading days that are profitable)
- Avg P&L on winning days vs. losing days
- Avg trade count on winning days vs. losing days
- Avg first trade P&L on winning vs. losing days
- "Loss day profile": What's different about your bad days?

**Visualization:**
- Side-by-side comparison cards
- Distribution chart: Daily P&L histogram with normal curve overlay
- Stat: "On losing days you trade 2.3x more often — consider a daily loss limit"

**Data source:** Group existing daily P&L data.

**Effort:** Low-Medium.

---

### 5.6 Options Analytics: DTE & IV Analysis

**What:** Performance breakdown by Days to Expiration (DTE) at entry and Implied Volatility regime.

**Why:** Options traders need to know: "Do I perform better with weekly options or monthly?" and "Am I profitable selling premium in high IV?"

**Metrics:**
- P&L by DTE bucket at entry (0 DTE, 1-7 DTE, 8-21 DTE, 22-45 DTE, 45+ DTE)
- Win rate by DTE bucket
- P&L by option type (calls vs puts)
- P&L by strategy type (single leg, vertical spread, iron condor, etc.)
- Avg theta decay captured per trade

**Visualization:**
- Bar chart: P&L by DTE bucket
- Comparison: Calls vs. Puts performance
- Strategy performance table (already partially built in Strategy view)

**Data source:** `strikePrice`, `expirationDate`, `optionType` are already stored on trades. DTE = expirationDate - entryDate.

**Effort:** Medium — DTE calculation is simple, but IV data may need external source.

---

## 6. Tier 3 — Differentiators (Future)

These features would make Artha genuinely unique in the market.

### 6.1 Pre-Trade Checklist & Plan Compliance

**What:** Let users define a pre-trade checklist (e.g., "Is the trend confirmed?", "Is volume above average?", "Did I set a stop-loss?"). Track compliance rate and correlate with P&L.

**Why:** EdgeWonk and TradesViz have this. It's the bridge between journaling and execution discipline. No other auto-sync journal does this well.

**Metrics:**
- Plan compliance rate (% of trades where all boxes were checked)
- P&L when compliant vs. non-compliant
- Most-violated rule and its cost
- Compliance trend over time

**Effort:** High — needs new data model, UI for checklist creation, and tagging integration.

---

### 6.2 What-If Simulator

**What:** "What if I had held 1 more day?" / "What if I used a 2% stop instead of 3%?" Backtest alternative exit strategies against your actual entries.

**Why:** TraderSync, EdgeWonk, and TradesViz have variants. This is the most powerful learning tool — showing what would have happened with different trade management.

**Requires:** Historical price data (OHLC) for the period after trade entry. Significant external data dependency.

**Effort:** High — requires market data API, simulation engine.

---

### 6.3 Statistical Significance Testing

**What:** For each strategy/setup, calculate the p-value to determine if results are statistically significant or could be random chance.

**Why:** Tradervue is the only competitor with this. It's a massive differentiator for quantitative traders. Answers: "Is my 65% win rate on breakouts real, or am I 30 trades into a lucky streak?"

**Metrics:**
- P-value per strategy (one-tailed t-test)
- Confidence level (90%, 95%, 99%)
- Minimum sample size needed for significance
- SQN (System Quality Number) — Van Tharp's metric

**Effort:** Low-Medium — pure statistics on existing data. The math is straightforward.

---

### 6.4 Kelly Criterion Position Sizing

**What:** Calculate the optimal position size for each strategy based on historical win rate and avg win/loss ratio.

**Why:** Only Tradervue offers this. It answers: "How much of my account should I risk per trade on this setup?"

**Formula:** Kelly % = Win Rate - ((1 - Win Rate) / (Avg Win / Avg Loss))

**Display:**
- Per-setup Kelly % recommendation
- Warning if current position sizing exceeds Kelly (over-leveraged)
- Half-Kelly recommendation (more conservative, industry standard)

**Effort:** Low — simple calculation on existing metrics.

---

### 6.5 Market Correlation Analysis

**What:** Compare the user's equity curve against SPY, QQQ, or a custom benchmark. Calculate Beta and correlation coefficient.

**Why:** Answers: "Am I generating alpha, or am I just riding the market?" Swing traders especially need this.

**Metrics:**
- Alpha (excess return above benchmark)
- Beta (sensitivity to market movements)
- Correlation coefficient (how much your returns move with the market)
- Up-capture / Down-capture ratios

**Requires:** Benchmark index data (SPY daily returns). Available from free APIs.

**Effort:** Medium — needs external benchmark data.

---

### 6.6 Mood/Energy Journaling & Correlation

**What:** Let users log daily pre-market state: sleep quality, stress level, confidence level, market outlook. Correlate with trading performance.

**Why:** TradesViz has this. It's the ultimate behavioral analytics feature — proving with data that "I trade worse when I sleep less than 6 hours."

**Metrics:**
- P&L by sleep quality rating
- P&L by stress level
- P&L by confidence level
- "Your best trading days: 7+ hours sleep, moderate confidence, low stress"

**Effort:** High — new data model, daily logging UI, correlation engine.

---

## 7. Feature Details by Trader Type

### For Day Traders (Highest Priority)

Day traders trade frequently and need intraday analytics.

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| Time-of-Day Performance | Tier 1 | Low | Very High |
| Session Performance (AM/PM) | Tier 1 | Low-Med | Very High |
| Trade Duration Analysis | Tier 1 | Low | High |
| Overtrading Detection | Tier 1 | Low-Med | Very High |
| Win/Loss Day Analysis | Tier 2 | Low-Med | High |
| MFE/MAE | Tier 2 | Med-High | Very High |
| Daily P&L Limit Alerts | Tier 2 | Low | Medium |

**Day trader persona:** Trades 5-20 times per day, needs to know which hours are profitable, when to stop for the day, and whether they're overtrading.

### For Swing Traders (Medium Priority)

Swing traders hold for days to weeks and need position-level analytics.

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| Trade Duration Analysis | Tier 1 | Low | Very High |
| Risk-Adjusted Metrics (Sharpe/Sortino) | Tier 1 | Low | High |
| Strategy Comparison | Tier 2 | Medium | High |
| Market Correlation (Alpha/Beta) | Tier 3 | Medium | High |
| R-Multiple Analysis | Tier 2 | Medium | Medium |
| What-If Simulator | Tier 3 | High | Very High |

**Swing trader persona:** Trades 2-5 times per week, holds for 2-20 days, needs to compare setups and understand risk-adjusted performance.

### For Options Traders (Growing Segment)

Options traders need strategy-level and Greeks-aware analytics.

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| DTE Analysis | Tier 2 | Medium | Very High |
| Options P&L by Strategy Type | Tier 2 | Low-Med | High |
| Calls vs. Puts Performance | Tier 2 | Low | Medium |
| Greeks Tracking (Delta, Theta, IV) | Tier 3 | High | High |
| Options Payoff Diagrams | Tier 3 | High | Medium |

**Options trader persona:** Sells premium or trades directional options, needs to know which expiration windows and strategy types are profitable.

---

## 8. Implementation Considerations

### Data Availability

| Feature | Needs New Data? | Source |
|---------|----------------|--------|
| Time-of-Day | No | Trade timestamps already stored |
| Trade Duration | No | Entry/exit dates on positions |
| Session Performance | No | Trade timestamps |
| Risk Metrics (Sharpe etc.) | No | Daily P&L array from metrics API |
| Overtrading Detection | No | Daily trade counts from existing data |
| Win/Loss Day Analysis | No | Daily P&L aggregation |
| Artha Score | No | Composite of existing metrics |
| Strategy Comparison | No | Tag filter on existing metrics |
| Statistical Significance | No | Pure math on existing metrics |
| Kelly Criterion | No | Pure math on existing metrics |
| DTE Analysis | No | Expiration dates already on options trades |
| MFE/MAE | **Yes** | Needs intraday OHLC data (external API) |
| R-Multiple | **Yes** | Needs stop-loss per trade (user input) |
| What-If Simulator | **Yes** | Needs historical price data (external API) |
| Market Correlation | **Yes** | Needs benchmark index data (free API) |
| Mood/Energy | **Yes** | New daily journal entries (new model) |
| Plan Compliance | **Yes** | New checklist model + trade association |

**Key insight:** 10 of the 17 proposed features can be built entirely from data we already have. No new API integrations or data models needed.

### Architecture Approach

**Option A: Compute in metrics API (server-side)**
- Extend `/api/metrics` to return additional calculated fields
- Pro: Single source of truth, works with existing caching
- Con: Larger API response, may need optional field selection

**Option B: Compute in dedicated report endpoints**
- New endpoints like `/api/analytics/time-of-day`, `/api/analytics/duration`
- Pro: Modular, each report loads independently
- Con: More API routes, potential duplicate FIFO calculations

**Recommendation:** Option A for metrics that reuse the same FIFO output (time, duration, overtrading, risk metrics). Option B for analytics that need different data shapes (MFE/MAE, correlation, score).

### Performance

- Current metrics API processes all trades through FIFO on each request (with date/tag filters)
- Adding more aggregations to the same pass is nearly free (O(n) where n = trades)
- Consider Redis caching for expensive calculations (Sharpe, Sortino need daily returns)
- Consider precomputing Artha Score nightly via cron

---

## 9. What NOT to Build

Based on competitive analysis, these features are either low-value or poor fit for Artha:

| Feature | Why Not |
|---------|---------|
| **Trade Replay** | Requires tick-by-tick market data. Massive storage/cost. TradeZella and TraderSync already dominate here. |
| **Live market data** | Artha is a journal, not a trading platform. Real-time data is a different product. |
| **Social/Leaderboard** | Kinfo's niche. Creates toxic comparison culture. Doesn't align with Artha's behavioral coaching mission. |
| **Options Chain Simulator** | TradesViz dominates. Extremely complex, low overlap with journaling value prop. |
| **Backtesting engine** | Full backtesting is a separate product category (TradingView, QuantConnect). Out of scope. |
| **Commission optimizer** | Nice-to-have but doesn't drive Pro upgrades. |

---

## Recommended Build Order

### Phase 1 — Close Competitive Gaps (Tier 1)
Build all 5 Tier 1 features. These use existing data, are low-effort, and close the biggest gaps vs. TradeZella/Tradervue.

1. Time-of-Day Performance Report
2. Trade Duration Analysis
3. Session Performance
4. Risk-Adjusted Metrics (Sharpe, Sortino, Calmar)
5. Overtrading Detection

**Estimated scope:** New "Analytics" sub-tab on Reports page with these 5 views. Extend metrics API response with additional aggregations.

### Phase 2 — Deepen the Edge (Tier 2)
Build features that create real stickiness and justify Pro pricing.

6. Artha Score (composite score on dashboard)
7. Win/Loss Day Analysis
8. Strategy Comparison
9. Options DTE Analysis
10. Statistical Significance + Kelly Criterion

### Phase 3 — Differentiate (Tier 3)
Build features that make Artha genuinely unique.

11. MFE/MAE Analysis (requires market data API)
12. R-Multiple Analysis (requires stop-loss input)
13. Pre-Trade Checklist & Plan Compliance
14. Market Correlation (Alpha/Beta)

### Phase 4 — Behavioral Moat (Tier 3)
15. Mood/Energy Journaling & Correlation
16. What-If Simulator

---

*This roadmap should be revisited after user feedback on Tier 1 features to validate priorities for Tier 2+.*
