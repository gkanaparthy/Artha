# R-Multiple Implementation Plan

## Executive Summary

This document outlines the implementation of R-multiple calculations in Artha. R-multiple measures trade outcome relative to initial risk, giving traders a standardized way to evaluate performance independent of position size. A +2R trade returned twice the initial risk; a -0.5R trade lost half the planned risk.

**Key Design Principles:**
1. **Risk is per-position, not per-trade** — R measures the thesis quality when you entered
2. **Pro-rata on partial exits** — so the math always reconciles across scale-outs
3. **Null over zero** — missing data is explicitly separate from 0R trades
4. **Coverage metric** — the user always knows how complete their risk data is
5. **Multi-asset aware** — options, futures, and spreads each have distinct risk profiles

---

## Part 1: Data Model

### New Table: `PositionRisk`

```prisma
model PositionRisk {
  id                 String   @id @default(cuid())
  userId             String
  positionKey        String
  initialRiskUsd     Float              // |entry - stop| × qty × multiplier (the 1R amount)
  initialStopPrice   Float?             // Optional: where the stop was placed
  initialTargetPrice Float?             // Optional: the take-profit level
  riskSource         String   @default("MANUAL")  // MANUAL | AUTO_PREMIUM | TRADE_GROUP
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([userId, positionKey])
  @@index([userId])
  @@map("position_risks")
}
```

**Field rationale:**
- `initialRiskUsd` — the dollar denominator in `R = PnL / initialRiskUsd`. This is the 1R amount.
- `initialStopPrice` — optional; used by the UI to auto-calculate `initialRiskUsd` and for display
- `initialTargetPrice` — optional; for R:R display (target/risk ratio)
- `riskSource` — tracks how risk was defined. Values:
  - `MANUAL` — user typed it in
  - `AUTO_PREMIUM` — auto-inferred from long option premium
  - `TRADE_GROUP` — inherited from `TradeGroup.maxLoss`

### Schema Changes

```prisma
// Add relation to User model
model User {
  // ... existing fields ...
  positionRisks     PositionRisk[]
}
```

### Migration

```bash
pnpm prisma db push
```

No data migration needed — this is a new, additive table.

---

## Part 2: R Calculation Logic

### Core Formula

```
R = realizedPnL / initialRiskUsd
```

### Partial Exit Pro-Rata Allocation

When a position has multiple closes (scale-out), allocate risk proportionally by quantity:

```
closeRiskUsd = initialRiskUsd × (closedQuantity / totalEntryQuantity)
closeR = closePnL / closeRiskUsd
```

This ensures:
- `sum(closeR × closeRiskUsd) == totalPnL`
- `sum(closeRiskUsd) == initialRiskUsd`

### Risk Resolution Chain

Not all positions have explicitly defined risk. Use this priority chain:

```typescript
function resolveRisk(
  trade: ClosedTrade,
  positionRiskMap: Map<string, PositionRisk>,
  tradeGroupMap: Map<string, TradeGroup>
): number | null {
  // 1. Explicit user-defined risk (highest priority)
  const explicit = positionRiskMap.get(trade.positionKey);
  if (explicit && explicit.initialRiskUsd > 0) {
    return explicit.initialRiskUsd;
  }

  // 2. TradeGroup maxLoss (for spreads and defined-risk strategies)
  if (trade.groupId) {
    const group = tradeGroupMap.get(trade.groupId);
    if (group?.maxLoss && group.maxLoss > 0) {
      return Math.abs(group.maxLoss);
    }
  }

  // 3. Auto-infer for long options: risk = premium paid
  if (isLongOption(trade)) {
    return trade.entryPrice * trade.quantity * trade.multiplier;
  }

  // 4. No risk data available
  return null;
}

function isLongOption(trade: ClosedTrade): boolean {
  return trade.type === 'OPTION' && trade.side === 'long';
}
```

### Where to Compute

Inside `getMetrics()` in `src/app/api/metrics/route.ts`:

1. Fetch all `PositionRisk` records for the user
2. Build a `Map<positionKey, PositionRisk>`
3. For each `filteredTrade` from FIFO:
   - Look up risk via the resolution chain
   - If found: compute `R = pnl / proRataRisk`
   - If not found: `R = null` (excluded from R metrics)
4. Aggregate R metrics only from trades with defined risk

---

## Part 3: Options — Three Distinct Risk Profiles

### Long Options (BUY_TO_OPEN) — Risk Is Capped

Max risk = premium paid. No stop price needed.

```
initialRiskUsd = entryPrice × quantity × contractMultiplier(100)
```

**Example:** Buy 10 AAPL $150C @ $3.25 → risk = $3.25 × 10 × 100 = **$3,250**

The UI auto-suggests `initialRiskUsd = premiumPaid` when the user opens the risk form for a long option. The user can override with a tighter mental stop:

```
initialRiskUsd = min(userDefinedRisk, premiumPaid)
```

### Short Options (SELL_TO_OPEN Naked) — Risk Is Undefined

A naked short call has theoretically infinite risk. A naked short put's max loss is `strikePrice × multiplier × qty`. There is no sane auto-calculation.

The user **must** define their own `initialRiskUsd`. The UI should:
- Flag short options without risk defined as "⚠️ Risk undefined"
- Require manual entry: "What's your max planned loss on this position?"
- Optionally auto-suggest max loss for puts: `strikePrice × 100 × qty`

### Spreads / Multi-Leg (TradeGroup) — Risk = Max Loss of the Structure

The existing `TradeGroup` model already has a `maxLoss` field. For defined-risk strategies:

| Strategy | Max Loss (1R) |
|---|---|
| Bull call spread | Net debit paid |
| Bear put spread | Net debit paid |
| Bull put spread / Bear call spread | Width of strikes - net credit |
| Iron condor | Width of widest wing - net credit |
| Iron butterfly | Width of wing - net credit |

Use `TradeGroup.maxLoss` directly. No separate `PositionRisk` needed unless the user wants to override.

---

## Part 4: Futures — The Multiplier Matters

Futures have large contract multipliers:

| Symbol | Point Value (multiplier) |
|---|---|
| ES (S&P 500) | $50/point |
| NQ (Nasdaq) | $20/point |
| CL (Crude Oil) | $1,000/point |
| GC (Gold) | $100/point |
| MES (Micro S&P) | $5/point |
| MNQ (Micro Nasdaq) | $2/point |

The risk formula works correctly **if `contractMultiplier` is set correctly** on the Trade:

```
initialRiskUsd = |entryPrice - stopPrice| × quantity × contractMultiplier
```

**Example:** Buy 2 ES @ 5,250, stop at 5,240:
```
risk = |5250 - 5240| × 2 × 50 = $1,000
```

### Validation

If `contractMultiplier = 1` on a known futures symbol (ES, NQ, CL, etc.), show a warning:
"Multiplier looks incorrect for this futures contract — R calculations may be inaccurate."

---

## Part 5: Metrics API Extension

### New Response Fields

Add to the metrics response from `src/app/api/metrics/route.ts`:

```typescript
// In getMetrics() return object
rMultiple: {
  coverage: number;      // % of closed trades that have risk defined (0-100)
  coveredTrades: number; // Count of trades with risk data
  totalTrades: number;   // Total closed trades
  netR: number;          // Sum of all R values
  avgR: number;          // Expectancy in R (netR / coveredTrades)
  avgWinR: number;       // Average R on winners
  avgLossR: number;      // Average R on losers (negative number)
  maxR: number;          // Best single trade in R
  minR: number;          // Worst single trade in R
  monthlyR: {            // Monthly sum of R
    month: string;
    r: number;
  }[];
} | null;  // null if zero trades have risk defined
```

### Implementation in `getMetrics()`

```typescript
// After computing filteredTrades...

// Fetch risk data
const positionRisks = await prisma.positionRisk.findMany({
  where: { userId: session.user.id }
});
const riskMap = new Map(positionRisks.map(r => [r.positionKey, r]));

// Compute R for each trade
const tradesWithR = filteredTrades.map(trade => {
  const risk = resolveRisk(trade, riskMap, tradeGroupMap);
  if (risk === null || risk <= 0) return { ...trade, r: null };

  // Pro-rata for partial exits
  const totalEntryQty = getTotalEntryQuantity(trade.positionKey, allTrades);
  const proRataRisk = risk * (trade.quantity / totalEntryQty);
  const r = trade.pnl / proRataRisk;
  return { ...trade, r: Math.round(r * 100) / 100 };
});

const rTrades = tradesWithR.filter(t => t.r !== null);

const rMultiple = rTrades.length > 0 ? {
  coverage: Math.round((rTrades.length / filteredTrades.length) * 100),
  coveredTrades: rTrades.length,
  totalTrades: filteredTrades.length,
  netR: round2(rTrades.reduce((s, t) => s + t.r!, 0)),
  avgR: round2(rTrades.reduce((s, t) => s + t.r!, 0) / rTrades.length),
  avgWinR: round2(avg(rTrades.filter(t => t.r! > 0).map(t => t.r!))),
  avgLossR: round2(avg(rTrades.filter(t => t.r! < 0).map(t => t.r!))),
  maxR: round2(Math.max(...rTrades.map(t => t.r!))),
  minR: round2(Math.min(...rTrades.map(t => t.r!))),
  monthlyR: computeMonthlyR(rTrades),
} : null;
```

### TypeScript Interface Update

```typescript
// In src/types/trading.ts — update Metrics interface
export interface Metrics {
  // ... existing fields ...
  rMultiple?: {
    coverage: number;
    coveredTrades: number;
    totalTrades: number;
    netR: number;
    avgR: number;
    avgWinR: number;
    avgLossR: number;
    maxR: number;
    minR: number;
    monthlyR: { month: string; r: number }[];
  } | null;
}
```

---

## Part 6: API Endpoints

### Risk Management

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/position-risk?positionKey=xxx` | Get risk record for a position |
| GET | `/api/position-risk/bulk?positionKeys=a,b,c` | Get risk records for multiple positions |
| PUT | `/api/position-risk` | Upsert a risk record |
| DELETE | `/api/position-risk?positionKey=xxx` | Remove risk record |

### PUT `/api/position-risk` — Request Body

```json
{
  "positionKey": "acc123|AAPL|STOCK",
  "initialRiskUsd": 250.00,
  "initialStopPrice": 170.00,
  "initialTargetPrice": 195.00
}
```

### Validation Rules

- `initialRiskUsd` must be > 0
- `initialStopPrice` must differ from entry price (if provided)
- `positionKey` must be a non-empty string
- User can only access their own risk records

### Client-Side Helper

```typescript
// src/lib/utils/risk.ts

export function calculateRiskUsd(
  entryPrice: number,
  stopPrice: number,
  quantity: number,
  multiplier: number = 1
): number {
  return Math.abs(entryPrice - stopPrice) * Math.abs(quantity) * multiplier;
}

export function calculateRMultiple(pnl: number, riskUsd: number): number | null {
  if (riskUsd <= 0) return null;
  return Math.round((pnl / riskUsd) * 100) / 100;
}

export function formatR(r: number | null): string {
  if (r === null) return '—';
  const sign = r >= 0 ? '+' : '';
  return `${sign}${r.toFixed(2)}R`;
}
```

---

## Part 7: Missing Data Handling

| Scenario | Behavior |
|---|---|
| No `PositionRisk` for a `positionKey` | `R = null` for that trade. Excluded from R metrics. |
| `initialRiskUsd = 0` | Skip. Division by zero guard. Show "Invalid risk" in UI. |
| `initialRiskUsd < 0` | Reject at API validation. Must be > 0. |
| No risk records for the entire user | `rMultiple = null` in API. UI shows "Set your risk to unlock R-multiples." |
| Partial coverage (some trades have risk) | Compute R from covered trades. Display `coverage` %. |
| Position still open | Don't compute R yet (unrealized). Could show unrealized R later. |
| Risk set after position closed | R computes correctly on next metrics fetch (retroactive). |
| Orphaned risk record (positionKey matches no trade) | Silently ignored. No effect on metrics. |
| Filter excludes all risk-having trades | `rMultiple = null` for the filtered view. |

---

## Part 8: Dashboard Placement

### Primary: Replace "Avg Trade" Metric Card

The current secondary metrics row has 5 cards:
`Unrealized P&L | Total Trades | Avg Win | Avg Loss | Avg Trade`

Replace **"Avg Trade"** with **"Avg R"** (expectancy):

| Card Title | Value | Subtitle |
|---|---|---|
| **Avg R** | `+0.82R` | "Expectancy (47 of 62 trades)" |

When risk data is missing: show `—` with subtitle "Add risk to unlock."

Move "Avg Trade" into the detailed R card below.

### Secondary: R-Multiple Detail Card (Collapsible)

Add a new section below the metric cards, above the Positions table:

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 R-Multiple Analysis          Coverage: 76% (47/62 trades)   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Avg Win R    │  │ Avg Loss R   │  │ R Distribution           ││
│  │ +1.85R       │  │ -0.72R       │  │  ▁▃▅▇█▇▅▃▁              ││
│  │ 28 winners   │  │ 19 losers    │  │  -3R      0      +3R    ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐│
│  │ Best Trade   │  │ Worst Trade  │  │ Avg Trade (moved here)   ││
│  │ +4.20R (NVDA)│  │ -2.10R (TSLA)│  │ +$124.50                ││
│  └──────────────┘  └──────────────┘  └──────────────────────────┘│
│                                                                  │
│  [Expand: Monthly R Chart]                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

When no risk data exists, this card shows an empty state:

```
┌──────────────────────────────────────────────────────────────────┐
│  📊 R-Multiple Analysis                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│        Define your risk per trade to unlock R-multiples.         │
│        Click any position → set your stop price.                 │
│                                                                  │
│                    [Learn About R-Multiples]                      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Positions Table — R Column

Add "R" column to the positions table:

| Symbol | Entry | Exit | P&L | R | Tags |
|---|---|---|---|---|---|
| AAPL | $150 | $160 | +$1,000 | **+2.0R** | Breakout |
| TSLA | $240 | $235 | -$500 | **-1.0R** | FOMO |
| MSFT | $400 | $410 | +$1,000 | **—** | — |

- Click `—` to set risk inline
- Color: green for positive R, red for negative R

### Reports Page

Add R-distribution histogram:

```
R Distribution (47 trades)
  ┌─────────────────────────────────┐
  │     ▁                           │
  │   ▃ █ ▅                         │
  │ ▁ █ █ █ ▇ ▃                     │
  │ █ █ █ █ █ █ ▅ ▃ ▁               │
  ├─────────────────────────────────┤
  │ -3R -2R -1R  0  +1R +2R +3R >3R│
  └─────────────────────────────────┘
```

---

## Part 9: Demo Page Changes

### Demo Position Risks

Add sample risk data to `src/lib/demo-data.ts`:

```typescript
export const DEMO_POSITION_RISKS: Array<{
  positionKey: string;
  initialRiskUsd: number;
  initialStopPrice?: number;
  initialTargetPrice?: number;
}> = [
  // NVDA trades — tight stops
  { positionKey: "demo-acc-1|NVDA|STOCK|2026-01-05", initialRiskUsd: 500, initialStopPrice: 470.25, initialTargetPrice: 500.00 },
  { positionKey: "demo-acc-1|NVDA|STOCK|2026-03-04", initialRiskUsd: 900, initialStopPrice: 800.00, initialTargetPrice: 860.00 },

  // AAPL — moderate risk
  { positionKey: "demo-acc-1|AAPL|STOCK|2026-01-07", initialRiskUsd: 300, initialStopPrice: 137.50, initialTargetPrice: 150.00 },

  // MSFT — no risk defined (test coverage gap)

  // TSLA — wide stop
  { positionKey: "demo-acc-1|TSLA|STOCK|2026-01-14", initialRiskUsd: 600, initialStopPrice: 240.00, initialTargetPrice: 270.00 },

  // META
  { positionKey: "demo-acc-1|META|STOCK|2026-02-02", initialRiskUsd: 750, initialStopPrice: 440.00, initialTargetPrice: 510.00 },

  // Options — auto-inferred from premium
  { positionKey: "demo-acc-1|AAPL 260322C185|OPTION|2026-03-12", initialRiskUsd: 3250, initialStopPrice: null },
];
```

### Demo R Metrics

Pre-compute R metrics and add to `DEMO_METRICS`:

```typescript
export const DEMO_METRICS: Metrics = {
  // ... existing fields ...
  rMultiple: {
    coverage: 65,         // 65% of demo trades have risk
    coveredTrades: 13,
    totalTrades: 20,
    netR: 8.40,
    avgR: 0.65,
    avgWinR: 1.85,
    avgLossR: -0.72,
    maxR: 4.20,
    minR: -2.10,
    monthlyR: [
      { month: "2026-01", r: 2.80 },
      { month: "2026-02", r: 1.40 },
      { month: "2026-03", r: 4.20 },
    ],
  },
};
```

---

## Part 10: Files to Create/Modify

### New Files

```
prisma/schema.prisma                         # Add PositionRisk model
src/app/api/position-risk/route.ts           # GET (query), PUT (upsert), DELETE
src/lib/utils/risk.ts                        # calculateRiskUsd, calculateRMultiple, formatR
src/components/r-multiple-card.tsx            # Dashboard R-Multiple detail card
src/components/risk-input-dialog.tsx          # Stop/target/risk input form
```

### Modified Files

```
src/types/trading.ts                         # Add rMultiple to Metrics interface
src/app/api/metrics/route.ts                 # Add R computation to getMetrics()
src/components/views/dashboard-view.tsx       # Add R card, replace Avg Trade metric
src/components/views/reports-view.tsx         # Add R distribution chart
src/components/positions-table.tsx            # Add R column, risk input trigger
src/lib/demo-data.ts                         # Add DEMO_POSITION_RISKS, rMultiple to DEMO_METRICS
src/app/demo/page.tsx                        # Pass demo risk data
src/app/demo/reports/page.tsx                # Pass demo R metrics
```

---

## Part 11: Test Cases & Edge Cases

### Happy Path — Stocks

| # | Test Case | Input | Expected |
|---|---|---|---|
| 1 | Simple winner | Buy 100 AAPL @ $150, risk $500 (stop $145), sell @ $160 → PnL = $1,000 | R = $1,000 / $500 = **+2.0R** |
| 2 | Simple loser | Buy 100 AAPL @ $150, risk $500 (stop $145), sell @ $146 → PnL = -$400 | R = -$400 / $500 = **-0.8R** |
| 3 | Exact stop hit | Buy 100 AAPL @ $150, risk $500, sell @ $145 → PnL = -$500 | R = -$500 / $500 = **-1.0R** |
| 4 | Breakeven | PnL = $0, risk $500 | R = $0 / $500 = **0.0R** |

### Partial Exits (Scale-Out)

| # | Test Case | Input | Expected |
|---|---|---|---|
| 5 | Scale out 2 equal lots | Buy 100 AAPL @ $150, risk $500. Sell 50 @ $160 (PnL=$500), sell 50 @ $155 (PnL=$250). | Lot 1: R = $500 / $250 = +2.0R. Lot 2: R = $250 / $250 = +1.0R. |
| 6 | Uneven scale out | Buy 100, risk $1000. Sell 30 @ profit, sell 70 @ loss. | Pro-rata: risk₁ = $300, risk₂ = $700. Verify sum(R × risk) = totalPnL. |
| 7 | Scale out 3 lots | Buy 100, risk $1000. Sell 25, sell 25, sell 50. | Risks: $250, $250, $500. Each R computed independently. |

### Options

| # | Test Case | Input | Expected |
|---|---|---|---|
| 8 | Long call, full premium as risk | Buy 10 AAPL $150C @ $3.25 (×100), risk = $3,250 (auto). Sell @ $5.50 → PnL = $2,250 | R = $2,250 / $3,250 = **+0.69R** |
| 9 | Long call, user sets tighter stop | Same as 8 but user sets risk = $1,625 (50% premium) | R = $2,250 / $1,625 = **+1.38R** |
| 10 | Long call expires worthless | Buy 10 puts @ $3.25, risk = $3,250, expire worthless → PnL = -$3,250 | R = **-1.0R** (max loss = exactly 1R) |
| 11 | Short naked put, user defines $2k risk | Sell 10 AAPL puts, PnL = +$800, user risk = $2,000 | R = +$800 / $2,000 = **+0.4R** |
| 12 | Short naked put, NO risk defined | Same as 11 but no PositionRisk | R = null. Flagged ⚠️ in UI. |
| 13 | Bull call spread, $500 max loss | TradeGroup.maxLoss = -$500. PnL = +$350 | R = $350 / $500 = **+0.7R** |
| 14 | Iron condor, $1,000 max loss | TradeGroup.maxLoss = -$1,000. PnL = +$600 | R = $600 / $1,000 = **+0.6R** |
| 15 | Spread with user override | TradeGroup.maxLoss = -$500, user sets risk = $300 | User override wins: R = PnL / $300. |
| 16 | Option assignment (ASSIGNMENT action) | Call assigned → becomes stock. | Risk should transfer or be redefined for the stock position. |

### Futures

| # | Test Case | Input | Expected |
|---|---|---|---|
| 17 | ES futures, 2 contracts, 10-pt stop | Buy 2 ES @ 5,250, stop 5,240, multiplier=50 | risk = 10 × 2 × 50 = $1,000 |
| 18 | MES micro, 5 contracts, 4-pt stop | Buy 5 MES @ 5,250, stop 5,246, multiplier=5 | risk = 4 × 5 × 5 = $100 |
| 19 | Futures with multiplier=1 (wrong) | ES trade with contractMultiplier=1 | R will be wildly wrong. Show validation warning. |
| 20 | CL crude oil | Buy 1 CL @ 78.50, stop 78.00, multiplier=1000 | risk = 0.50 × 1 × 1000 = $500 |

### Short Selling

| # | Test Case | Input | Expected |
|---|---|---|---|
| 21 | Short winner | Sell 100 AAPL @ $150, risk $500 (stop $155), buy back @ $140 → PnL = $1,000 | R = $1,000 / $500 = **+2.0R** |
| 22 | Short loser | Sell 100 AAPL @ $150, risk $500, buy back @ $154 → PnL = -$400 | R = -$400 / $500 = **-0.8R** |

### Data Integrity

| # | Test Case | Input | Expected |
|---|---|---|---|
| 23 | No risk defined | Trade closed, no PositionRisk | R = null. Excluded from R metrics. Coverage decreases. |
| 24 | Risk = $0 | `initialRiskUsd = 0` (user error) | Skip R calc. Show "Invalid risk" in UI. |
| 25 | Risk negative | `initialRiskUsd = -100` (user error) | Reject at API validation. Must be > 0. |
| 26 | Risk set retroactively | User adds risk after position is closed | R computes correctly on next metrics fetch. |
| 27 | Orphaned risk record | PositionRisk.positionKey matches no trade | Silently ignored. No effect on metrics. |
| 28 | Duplicate positionKey | Two writes to same (userId, positionKey) | Upsert — second write updates the first. |

### Aggregation Edge Cases

| # | Test Case | Input | Expected |
|---|---|---|---|
| 29 | All trades have risk | 100% coverage | `coverage: 100`. All R metrics populated. |
| 30 | No trades have risk | 0% coverage | `rMultiple: null`. UI shows empty state. |
| 31 | Mixed coverage | 10 of 30 trades have risk | `coverage: 33`. R metrics computed from 10. |
| 32 | Single trade with risk | 1 trade only | `avgR = netR` = that trade's R. One of avgWinR/avgLossR populated (not both). |
| 33 | Date filter excludes all risk trades | Date range filters out covered trades | `rMultiple: null` for the filtered view. |
| 34 | Symbol filter applied | Filter to AAPL only, which has risk | R metrics computed from AAPL trades only. |

### Multi-Account

| # | Test Case | Input | Expected |
|---|---|---|---|
| 35 | Same symbol, different accounts | AAPL in acc-1 (risk=$500) and acc-2 (risk=$800) | Each has its own positionKey, computed independently. |
| 36 | Account filter applied | Filter to acc-1 only | Only acc-1 trades + risks in R metrics. |

### Demo Mode

| # | Test Case | Input | Expected |
|---|---|---|---|
| 37 | Demo R metrics render | Navigate to /demo | R card shows with sample values. No API calls. |
| 38 | Demo position without risk | Position in demo with no risk entry | Shows `—` for R in position row. |
| 39 | Demo R detail card | Click expand on R section | Shows all sub-metrics (avgWinR, avgLossR, etc.). |

---

## Part 12: Implementation Phases

### Phase 1: Database & Types
- [ ] Add `PositionRisk` model to `prisma/schema.prisma`
- [ ] Run `pnpm prisma db push`
- [ ] Create `src/lib/utils/risk.ts` (helpers)
- [ ] Update `src/types/trading.ts` (add rMultiple to Metrics)

### Phase 2: Risk CRUD API
- [ ] Create `src/app/api/position-risk/route.ts` (GET, PUT, DELETE)
- [ ] Add validation (risk > 0, non-empty positionKey)
- [ ] Add auth checks (userId scoping)

### Phase 3: R Calculation in Metrics
- [ ] Implement risk resolution chain in `getMetrics()`
- [ ] Implement pro-rata allocation for partial exits
- [ ] Add rMultiple to metrics response
- [ ] Handle all null/edge cases

### Phase 4: Dashboard UI
- [ ] Replace "Avg Trade" card with "Avg R" card
- [ ] Create `RMultipleCard` component (detail section)
- [ ] Add empty state for no risk data
- [ ] Add R column to positions table

### Phase 5: Risk Input UI
- [ ] Create `RiskInputDialog` component (stop, target, risk fields)
- [ ] Add risk input trigger to positions table row
- [ ] Auto-suggest risk for long options
- [ ] Show ⚠️ for short options without risk

### Phase 6: Demo Page
- [ ] Add `DEMO_POSITION_RISKS` to `demo-data.ts`
- [ ] Add pre-computed `rMultiple` to `DEMO_METRICS`
- [ ] Pass risk data through demo dashboard

### Phase 7: Reports & Charts
- [ ] Add R-distribution histogram to reports
- [ ] Add monthly R sparkline chart
- [ ] Add R column to reports table

### Phase 8: Polish
- [ ] Test all 39 test cases
- [ ] Mobile responsiveness for R card
- [ ] Tooltip explanations ("What is R?")
- [ ] Keyboard shortcuts for quick risk entry

**Status: NOT STARTED**

---

## Part 13: Future Enhancements (Out of Scope for v1)

These are explicitly NOT included in this implementation but noted for future consideration:

1. **Unrealized R** — Show R for open positions using current price
2. **ATR-based risk** — Auto-calculate risk from Average True Range
3. **Risk import from NinjaTrader/TradingView** — Parse stop levels from order history
4. **Kelly criterion** — Calculate optimal position size based on R history
5. **R-streak tracking** — Consecutive winners/losers in R terms
6. **Tick-based input for futures** — "My stop is 8 ticks" instead of a price
7. **Risk templates** — "I always risk 1% of account" → auto-calculate risk
