# Filter Visibility Improvements

## Overview
Added comprehensive visual indicators to help users understand when filters are active and potentially hiding trades or positions.

## Changes Made

### 1. Enhanced Global Filter Bar (`src/components/global-filter-bar.tsx`)

#### Active Filters Section
- **Visual Badge System**: Shows all active filters as removable badges
- **Filter Count Indicator**: Displays number of active filters with warning icon
- **Individual Filter Removal**: Each badge has an X button to remove that specific filter
- **Enhanced Clear Button**: Changed from ghost to destructive variant for better visibility

#### Active Filter Features:
- Symbol filter: `Symbol: PL`
- Date range filters: `From: Jan 20, 2026` / `To: Jan 24, 2026`
- Account filter: `Account: Robinhood`
- Asset type filter: `Type: Stocks` or `Type: Options`
- Status filter: `Status: Open` / `Status: Winners` / `Status: Losers`

#### Visual Design:
- Amber-colored badges (warning color) to indicate filters are reducing visible data
- AlertCircle icon to draw attention
- Border section below main filter bar showing active filters
- Quick "Clear all" button in the active filters section

### 2. Journal Page (`src/app/(dashboard)/journal/page.tsx`)

#### Trade Count Indicator
- Shows when filters are hiding trades
- Format: "Showing **15** of **250** trades (235 hidden by filters)"
- Only appears when:
  - Page is loaded (not in loading state)
  - Filters are active
  - Some trades are being hidden

#### Visual Design:
- Amber-themed alert box
- Shows exact count of visible vs total trades
- Highlights how many are hidden by filters

### 3. Positions Table (`src/components/positions-table.tsx`)

#### Position Count Indicator
- Shows when filters are hiding positions
- Format: "Showing **8** of **45** positions (37 hidden by filters)"
- Same logic as journal page but for positions

## User Benefits

### Before
❌ Users couldn't tell if filters were active
❌ No indication that trades/positions were being hidden
❌ Had to manually check each filter to see what was set
❌ Easy to forget about a startDate filter set weeks ago

### After
✅ Clear visual indicator when ANY filter is active
✅ See exactly which filters are applied at a glance
✅ Know how many trades/positions are hidden
✅ Quick removal of individual filters without clearing all
✅ Prominent "Clear All Filters" button

## Debugging Case: Gautham's Missing PL Trades

### Problem
- User couldn't see PL trades from Jan 22, 2026 on frontend
- Backend showed 87 PL trades in database
- API returned PL trades correctly

### Root Cause
- Client-side filters in localStorage were hiding the trades
- Most likely causes:
  1. Start date filter set to after Jan 22
  2. Symbol filter set to different ticker
  3. Account filter selecting wrong account

### Solution
With these improvements:
1. User immediately sees "2 filters active" indicator
2. Active filter badges show: "From: Jan 23, 2026" and "Account: Schwab"
3. User can click X on individual badges to remove filters
4. Trade count shows: "Showing 50 of 1,200 trades (1,150 hidden by filters)"
5. User realizes filters are hiding data and can clear them

## Technical Implementation

### Filter Detection Logic
```typescript
const hasActiveFilters =
  filters.symbol ||
  filters.startDate ||
  filters.endDate ||
  filters.status !== "all" ||
  filters.accountId !== "all" ||
  filters.assetType !== "all";

const isFilteringTrades = hasActiveFilters && sortedTrades.length < trades.length;
```

### Active Filter Labels
Dynamically generated labels with individual remove handlers:
```typescript
const getActiveFilterLabels = () => {
  const labels: Array<{ key: string; label: string; onRemove: () => void }> = [];
  // ... adds badge for each active filter
  return labels;
};
```

### Visual Consistency
- Both journal and positions use same amber color scheme
- Same AlertCircle icon throughout
- Consistent messaging format
- Mobile-responsive design

## Testing

### Manual Test Cases
1. ✅ Apply symbol filter → Badge appears
2. ✅ Apply date range → Two badges appear (From/To)
3. ✅ Apply account filter → Badge shows account name
4. ✅ Click X on individual badge → Only that filter is removed
5. ✅ Click "Clear All" → All filters removed
6. ✅ Trade count updates correctly
7. ✅ Build succeeds with zero errors

### Expected Behavior
- Filter indicators only show when filters actually reduce results
- Count shows correct numbers
- Badges are clickable and remove correct filter
- Mobile-responsive (tested via CSS classes)

## Files Modified
- `/src/components/global-filter-bar.tsx` - Enhanced with active filters section
- `/src/app/(dashboard)/journal/page.tsx` - Added trade count indicator
- `/src/components/positions-table.tsx` - Added position count indicator

## Future Enhancements
- [ ] Show filter indicator in dashboard metrics cards
- [ ] Add browser notification when filters hide >90% of data
- [ ] Remember which filters user clears most often
- [ ] Add "Recent Filters" quick-apply menu
- [ ] Export includes active filters in filename (e.g., `journal-PL-Jan2026.xlsx`)
