# Pro Analytics Expansion Plan

## 1. Executive Summary

The objective of this plan is to expand Artha's "Pro" suite with advanced analytics tailored for three core trader personas: **Swing Traders**, **Day Traders**, and **Options Traders**. By moving beyond basic P&L metrics into execution efficiency, behavioral patterns, and risk analysis, we aim to increase the perceived value of the Pro subscription and drive user retention.

**Constraint:** No code changes are to be made at this stage. This document serves as the architectural roadmap.

---

## 2. Target Personas & Value Proposition

### 🦅 Swing Traders
*   **Goal:** Maximize trend capture and minimize "give back" (leaving profit on the table).
*   **Key Question:** "Am I exiting too early, or holding through too much pain?"
*   **Value:** MAE/MFE and Entry/Exit Efficiency metrics to optimize trade management.

### ⚡ Day Traders
*   **Goal:** Optimization of session performance and tilt avoidance.
*   **Key Question:** "Do I lose money in the first 30 minutes? Do I spiral after 3 losses?"
*   **Value:** Time-of-day heatmaps, Streak analysis, and Session P&L breakdown.

### ♟️ Options Traders
*   **Goal:** Strategy optimization and Greeks management.
*   **Key Question:** "Are my Iron Condors actually profitable, or should I stick to Vertical Spreads?"
*   **Value:** Strategy-based grouping, Greeks exposure (Delta/Theta), and Expiry (DTE) analysis.

---

## 3. Proposed Feature Set

### Module A: Advanced Execution Analytics (The "How")
*Focus: Measuring the quality of trade management, independent of the outcome.*

1.  **MAE (Maximum Adverse Excursion) vs. Final PnL**
    *   **Description:** Measures the maximum unrealized loss during the life of a trade.
    *   **Insight:** "Trades that went > -10% MAE rarely recovered; I should tighten stops."
    *   **Data Req:** Historical minute-bar data for the duration of the trade (SnapTrade/Polygon).
    *   **Viz:** Scatter plot (MAE % vs. PnL %).

2.  **MFE (Maximum Favorable Excursion) vs. Final PnL**
    *   **Description:** Measures the maximum unrealized profit during the life of a trade.
    *   **Insight:** "I consistently give back 50% of my profits before closing; I need a better trailing stop."
    *   **Viz:** Scatter plot (MFE % vs. PnL %); "Efficiency Efficiency" Gauge (0-100%).

3.  **Entry/Exit Efficiency**
    *   **Description:** Comparison of entry price to the session Low/High (for longs) or High/Low (for shorts) post-entry.
    *   **Insight:** "I am chasing entries (buying the top)."

### Module B: Behavioral & Contextual Intelligence (The "When")
*Focus: Identifying environmental and psychological triggers.*

4.  **Time-of-Day / Day-of-Week Heatmap**
    *   **Description:** Grid heatmap showing PnL or Win Rate by hour of day (e.g., 09:30-10:00, 10:00-11:00) and day of week.
    *   **Insight:** "I lose 80% of my money on Fridays after 2 PM."

5.  **Duration Analysis**
    *   **Description:** PnL vs. Trade Duration buckets (e.g., <5 mins, 5-30 mins, 30m-4h, >1d).
    *   **Insight:** "My scalps are profitable, but my swing trades drag down my portfolio."

6.  **Tilt Meter & Streak Analysis**
    *   **Description:** Analysis of performance following a Loss Streak (2+ losses) vs. Win Streak.
    *   **Insight:** "After 3 consecutive losses, my next trade is 90% likely to be a loss (Revenge Trading)."

### Module C: Options-Specific Analytics (The "Strategy")
*Focus: Greeks, Volatility, and Structure.*

7.  **Strategy Performance Breakdown**
    *   **Description:** ROI split by strategy type (Vertical Spread, Iron Condor, Naked Put, Covered Call).
    *   **Logic:** Enhanced `TradeGroup` logic to auto-classify complex multi-leg positions.

8.  **Performance by DTE (Days to Expiration)**
    *   **Description:** Bar chart showing PnL for 0DTE, 1-7 DTE, 7-30 DTE, 30+ DTE.
    *   **Insight:** "I am terrible at 0DTE but excellent at 30-day swings."

9.  **Greeks Exposure (Advanced)**
    *   **Description:** Estimated Portfolio Delta, Theta, and Vega.
    *   **Data Req:** Requires real-time or end-of-day options chain data.

### Module D: Risk & Portfolio Simulation (The "What If")
*Focus: Probabilistic forecasting and risk consistency.*

10. **R-Multiple Distribution**
    *   **Description:** Histogram of trades by "R" (Risk unit). Requires user to input "Initial Risk" or define a standard risk unit (e.g., 1% of account).
    *   **Insight:** "My winners are 1.2R but my losers are -3R (Risk/Reward inversion)."

11. **Monte Carlo Simulator**
    *   **Description:** Run 1,000 simulations of the next 100 trades based on historical Win Rate and Risk/Reward profile.
    *   **Insight:** "There is a 15% chance of blowing up the account with current sizing."

12. **Drawdown Analysis**
    *   **Description:** Visualization of Equity Curve from peak. Metrics: Max Drawdown Depth (%), Max Drawdown Duration (days).

---

## 4. Implementation Details & Roadmap

### Phase 1: The "Low Hanging Fruit" (Weeks 1-2)
*Relies on existing data, low computational cost.*
*   **Time-of-Day Heatmap:** Pure SQL/Javascript transformation of `timestamp`.
*   **Duration Analysis:** Simple diff between `openedAt` and `closedAt`.
*   **Streak Analysis:** Recursive pass over sorted trade list.
*   **Symbol/Tag Performance:** Already partially implemented, refine UI.

### Phase 2: Execution Engine Expansion (Weeks 3-5)
*Requires external data fetching implementation.*
*   **MAE/MFE:** Breakdown:
    1.  Create `MarketDataService` to fetch historical Minute Bars for a given Symbol + TimeRange.
    2.  Update `calculateMetricsFromTrades` to request OHLC data for closed trades.
    3.  Compute Min Low and Max High between EntryTime and ExitTime.
    4.  Store `mae` and `mfe` in `Trade` model to avoid re-fetching.

### Phase 3: Options Intelligence (Weeks 6-8)
*Complexity: High (Grouping logic).*
*   **Strategy Classifier:** Improve `TradeGroup` detection for multi-leg strategies.
*   **DTE Analysis:** Parse option symbols for expiry dates (already in regex) and bucket them.

### Phase 4: Risk Laboratory (Weeks 9+)
*UI Heavy.*
*   **Monte Carlo:** Client-side computation using current metrics.
*   **R-Multiple:** New UI input for "Planned Stop Loss" on trade detail view to calculate R-realized.

---

## 5. Technical Requirements & Dependencies

1.  **Market Data Provider:** SnapTrade (Check endpoints for historical minute bars) or Polygon.io (fallback).
2.  **Database Updates:**
    *   Add `mae`, `mfe`, `highestPrice`, `lowestPrice` to `Trade` model.
    *   Add `initialStopPrice` or `initialRiskAmt` to `Trade` model for R-calculations.
3.  **Caching:** MAE/MFE calculation is expensive. Must be computed once and persisted.

## 6. Next Steps
1.  Approve this plan.
2.  Begin Phase 1 (Time-of-Day & Duration) as they require no schema changes.
