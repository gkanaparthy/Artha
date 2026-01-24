# Filter Visibility - Visual Guide

## What You'll See Now

### 1. Active Filters Indicator (Below Filter Bar)

When filters are active, you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  2 filters active                          Clear all ✕    │
│                                                               │
│ [Symbol: PL ✕] [From: Jan 20, 2026 ✕]                       │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Shows count of active filters
- Lists each filter as a clickable badge
- Click ✕ on individual badge to remove just that filter
- Click "Clear all" button to remove all filters at once

### 2. Trade/Position Count Indicator

When filters are hiding data, you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️  Showing 15 of 250 trades (235 hidden by filters)        │
└─────────────────────────────────────────────────────────────┘
```

**Key Information:**
- **15** = Trades currently visible
- **250** = Total trades in database
- **235 hidden** = Number of trades filtered out

### 3. Clear Filters Button (Enhanced)

The "Clear All Filters" button is now:
- ❌ **Red/Destructive** color (was gray)
- More prominent and easier to spot
- Located at top-right of filter bar

## Real-World Example: Finding Missing PL Trades

### Scenario
You traded PL on Jan 22, but don't see it in the journal.

### Before (Old UI)
```
Filter bar shows: [Symbol: ___] [From: Jan 23] [To: Jan 24]
Trade list shows: (empty or other trades)

❓ Why can't I see PL trades?
❓ Are filters active?
❓ Is the sync broken?
```

**Result:** User thinks sync is broken or data is missing ❌

### After (New UI)
```
⚠️  3 filters active                              Clear all ✕
[Symbol: AAPL ✕] [From: Jan 23, 2026 ✕] [Account: Robinhood ✕]

⚠️  Showing 5 of 1,200 trades (1,195 hidden by filters)
```

**Immediately Clear:**
1. ✅ Filters are active (3 of them!)
2. ✅ 1,195 trades are hidden
3. ✅ Can see exact filters: Symbol, Date range, Account
4. ✅ PL trades from Jan 22 are hidden because "From: Jan 23"

**Quick Fix:**
- Click ✕ on "From: Jan 23, 2026" badge
- OR click "Clear all ✕"
- PL trades immediately appear!

## Common Filter Scenarios

### 1. Date Range Too Narrow
```
⚠️  2 filters active
[From: Jan 24, 2026 ✕] [To: Jan 24, 2026 ✕]

⚠️  Showing 3 of 1,200 trades (1,197 hidden by filters)
```
**Problem:** Only showing today's trades
**Solution:** Click ✕ on date badges to expand range

### 2. Wrong Account Selected
```
⚠️  1 filter active
[Account: Schwab ✕]

⚠️  Showing 450 of 1,200 trades (750 hidden by filters)
```
**Problem:** Only showing Schwab account trades
**Solution:** Click ✕ on account badge to see all accounts

### 3. Symbol Filter Active
```
⚠️  1 filter active
[Symbol: AAPL ✕]

⚠️  Showing 12 of 1,200 trades (1,188 hidden by filters)
```
**Problem:** Only showing AAPL trades
**Solution:** Click ✕ on symbol badge to see all symbols

### 4. Multiple Filters Stacking
```
⚠️  5 filters active                              Clear all ✕
[Symbol: PL ✕] [From: Jan 01 ✕] [To: Jan 15 ✕]
[Account: Robinhood ✕] [Type: Stocks ✕]

⚠️  Showing 2 of 1,200 trades (1,198 hidden by filters)
```
**Problem:** Too many filters = almost no results
**Solution:** Click "Clear all ✕" to reset everything

## Mobile View

On mobile, filters expand when you tap the filter icon:

```
┌──────────────────────────────┐
│ [Symbol: ___] [⚡ Filters]   │ ← Tap here
└──────────────────────────────┘

         ↓ Expands to:

┌──────────────────────────────┐
│ [Symbol: ___] [⚡ Filters]   │
├──────────────────────────────┤
│ Account: [All Accounts ▼]    │
│ Type: [All Types ▼]          │
│ From: [Jan 20, 2026]         │
│ To: [Jan 24, 2026]           │
│ [Clear]                      │
└──────────────────────────────┘

         ↓ Active filters show below:

┌──────────────────────────────┐
│ ⚠️  3 filters active          │
│ [From: Jan 20 ✕]             │
│ [To: Jan 24 ✕]               │
│ [Type: Stocks ✕]             │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ⚠️  Showing 25 of 1,200       │
│    trades                     │
│    (1,175 hidden by filters)  │
└──────────────────────────────┘
```

## Color Coding

- **🟡 Amber/Yellow** = Warning that filters are active
- **❌ Red** = Clear/Remove action buttons
- **⚠️ Icon** = Alert user to check filters
- **Bold numbers** = Important counts (visible vs total)

## Browser Console Commands

To manually check/clear filters:

```javascript
// Check what filters are active
JSON.parse(localStorage.getItem('dashboard_filters_v3'))

// Clear all filters
localStorage.removeItem('dashboard_filters_v3');
location.reload();

// Set specific filter
const filters = JSON.parse(localStorage.getItem('dashboard_filters_v3'));
filters.symbol = 'PL';
localStorage.setItem('dashboard_filters_v3', JSON.stringify(filters));
location.reload();
```

## Debugging Checklist

If you can't find trades/positions:

1. ✅ Check for amber warning box showing active filters
2. ✅ Read the active filter badges - do they match what you want?
3. ✅ Look at trade count - are many hidden?
4. ✅ Try "Clear all" to reset and start fresh
5. ✅ If still missing, check date range (default is "To: Today")
6. ✅ Try expanding date range to include older trades

## Pro Tips

### Tip 1: Default End Date
The default end date is set to TODAY. If you're looking for future trades (like next week's options expiry), you need to clear the end date or extend it.

### Tip 2: Symbol Partial Match
Symbol filter uses "contains" matching:
- "PL" will match: PL, APLD, AAPL
- To see only PL, the list will show all matches

### Tip 3: Filter Persistence
Filters are saved in browser localStorage and persist across:
- ✅ Page refreshes
- ✅ Browser restarts
- ✅ Different pages (journal/dashboard/positions)
- ❌ Different browsers
- ❌ Incognito/private mode

### Tip 4: Quick Filter Removal
Instead of clearing all filters, remove just the problematic ones:
1. See "From: Jan 24" badge
2. Click ✕ on it
3. Keep other filters active
4. Incrementally adjust until you see your data
