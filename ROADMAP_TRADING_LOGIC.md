# Future Roadmap: Advanced Trade Logic & Data Integrity

This document outlines the plan for handling complex trading scenarios to ensure long-term data accuracy and a premium user experience in Artha.

## 1. Corporate Actions & Adjustments
### Stock Splits (In Progress)
- [x] Basic FIFO adjustment for `SPLIT` actions.
- [ ] Improve split detection for brokers that report splits as combined "Journal" entries instead of explicit `SPLIT` actions.
- [ ] Historical data back-indexing: Recalculate all historical lots when a split is detected to ensure "Year-to-Year" comparisons are on a split-adjusted basis.

### Symbol Changes & Mergers
- **Scenario**: `FB` becomes `META`, or `SNDK` is acquired by `WDC`.
- **Plan**: 
    - Implement a `SymbolMap` table in the database to link old tickers to new tickers.
    - Update `getCanonicalKey()` in `metrics/route.ts` to check the `SymbolMap` before grouping trades.
    - Ensure FIFO queues merge seamlessly across name changes.

## 2. Option Lifecycle Management
### Exercise & Assignment Logic
- **Scenario**: Being "Put" 100 shares of SPY after a short put expires in-the-money.
- **Plan**:
    - Detect `ASSIGNMENT` and `EXERCISES` actions.
    - **Premium Rolling**: Automatically subtract the option premium from the stock's entry cost basis (Cost Basis = Strike Price - Put Premium).
    - Link the original option trade to the resulting stock position for a "Combined Trade" view.

### Option Expiration Cleanup
- [x] Detect `OPTIONEXPIRATION` actions.
- [ ] Ensure expired-worthless options accurately reflect a 100% loss/gain without requiring a manual "Sell" entry.

## 3. Data Integrity & Deduplication
### Robust Deduplication (V2)
- **Problem**: Brokers sometimes report the same trade multiple times with slightly different timestamps or IDs (e.g., Order ID vs. Execution ID).
- **Plan**:
    - Implement "Fuzzy Deduplication": Flags trades as duplicates if they share the same Account, Symbol, Action, Qty, and Price within a 5-minute window.
    - Add a "Deleted" status to the `Trade` model instead of hard-deleting, allowing users to restore "false positives."

### Initial Portfolio Balancing
- **Problem**: Opening positions purchased before the first SnapTrade sync show up as "Short" when eventually sold.
- **Plan**:
    - Allow users to manually input "Opening Lots" for existing holdings.
    - These lots will act as the "base" for the FIFO queue before any synced trades are processed.

## 4. Performance Metrics Enhancements
### Dividend Handling (DRIP)
- **Plan**: 
    - Treat `DIVIDEND_REINVEST` as a `BUY` at the market price to ensure it contributes to the total cost basis.
    - Track "True Yield" (Dividends / Net Investment).

### Wash Sale Tracking
- **Plan**:
    - Highlight trades that trigger a wash sale (Sell at loss -> Buy back within 30 days).
    - Provide a "Tax Adjusted P&L" view alongside the standard "Performance P&L."

---

## Implementation Priority
1. **Low**: Symbol Mapping (as needed for historical cleanup).
2. **Medium**: Option Assignment Premium Rolling.
3. **High**: Fuzzy Deduplication & Initial Portfolio Initialization.
