# Trade Tagging System - Comprehensive Implementation Plan

## Executive Summary

This document outlines a comprehensive tagging system for Artha that addresses common trader pain points discovered through research. The system enables traders to track setups, mistakes, and emotional states while providing actionable insights into trading behavior patterns.

**Key Design Principles:**
1. **Start simple, expand gradually** - Default starter tags prevent overwhelm
2. **Automate the tedious** - Bulk operations, smart suggestions, auto-calculations
3. **Quantify emotions** - Convert feelings into dollar amounts
4. **Position-first tagging** - Tags apply to positions (grouped trades), not individual transactions
5. **Actionable insights** - Show cost-per-mistake, not just counts

---

## Part 1: Research Insights

### What Traders Struggle With

Based on Reddit threads, trading forums, and journal reviews:

| Pain Point | Impact | Our Solution |
|------------|--------|--------------|
| Too many tags from the start | Journal abandoned within weeks | Starter tag templates (3-5 tags) |
| Manual entry is tedious | Inconsistent journaling | Auto-import + bulk tagging |
| Can't see cost of mistakes | No behavioral change | Cost-per-tag analytics |
| Generic emotion tracking | Not actionable | Specific emotional tags (FOMO, revenge, etc.) |
| Tags aren't organized | Chaos as tags grow | Categories: Setup, Mistake, Emotion, Custom |
| No correlation analysis | Miss patterns | Tag performance dashboard |

### What Successful Traders Do

1. **Separate rule compliance from outcome** - A winning trade can still be a mistake if rules were broken
2. **Track emotional context** - Pre-trade mood, external factors (sleep, stress)
3. **Review weekly, not daily** - Look for patterns across 30+ trades
4. **Focus on process, not P&L** - Tag adherence to plan, not just winners/losers

---

## Part 2: Tag System Architecture

### Tag Categories

We'll organize tags into four distinct categories, each serving a specific purpose:

```
┌─────────────────────────────────────────────────────────────────┐
│                         TAG CATEGORIES                          │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│     SETUPS      │    MISTAKES     │    EMOTIONS     │  CUSTOM   │
├─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Breakout        │ Early Entry     │ FOMO            │ User      │
│ Pullback        │ Late Entry      │ Revenge Trade   │ defined   │
│ Reversal        │ Oversized       │ Fear/Hesitation │ tags      │
│ Momentum        │ No Stop Loss    │ Overconfidence  │           │
│ Mean Reversion  │ Moved Stop      │ Tilt            │           │
│ Earnings Play   │ Chased Price    │ Calm/Focused    │           │
│ Gap Fill        │ Ignored Signal  │ Anxious         │           │
│ Support/Resist  │ Broke Rules     │ Impatient       │           │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

### Emotional State vs Emotion Tags

**Recommendation: Keep them separate but connected**

| Aspect | Emotion Tags | Emotional State |
|--------|--------------|-----------------|
| **When applied** | After trade closes | Before trading session |
| **Granularity** | Per position | Per day |
| **Purpose** | Identify what went wrong | Identify risky days |
| **Examples** | FOMO, Revenge, Hesitation | Sleep score, stress level, mood |
| **Analysis** | "FOMO cost me $2,340 this month" | "I lose 40% more on low-sleep days" |

**Implementation:**
- **Emotion Tags** = Part of the tag system (applied to positions)
- **Emotional State** = Separate "Day Plan" feature (future enhancement)

This separation allows traders to:
1. See which emotions affected specific trades (tags)
2. Correlate overall mental state with daily performance (day plans)

---

## Part 3: Database Schema Changes

### Current State

```prisma
model Tag {
  id     String  @id @default(cuid())
  name   String  @unique        // Problem: globally unique, not per-user
  color  String  @default("#000000")
  trades Trade[] @relation("TagToTrade")  // Problem: tags individual trades
  @@map("tags")
}
```

### Proposed Schema

```prisma
// ============================================
// TAG CATEGORY ENUM
// ============================================
enum TagCategory {
  SETUP       // Trading setups/strategies
  MISTAKE     // Rule violations and errors
  EMOTION     // Emotional states during trade
  CUSTOM      // User-defined tags
}

// ============================================
// TAG DEFINITION (User-scoped)
// ============================================
model TagDefinition {
  id          String      @id @default(cuid())
  userId      String
  name        String
  description String?
  category    TagCategory
  color       String      @default("#6B7280")
  icon        String?     // Optional emoji or icon name
  isDefault   Boolean     @default(false)  // System-provided starter tag
  isArchived  Boolean     @default(false)  // Soft delete
  sortOrder   Int         @default(0)      // For custom ordering
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  usages      PositionTag[]

  @@unique([userId, name])  // Unique per user, not globally
  @@index([userId, category])
  @@index([userId, isArchived])
  @@map("tag_definitions")
}

// ============================================
// POSITION TAG (Many-to-many junction)
// ============================================
model PositionTag {
  id              String    @id @default(cuid())
  positionKey     String    // Composite key: "{accountId}:{symbol}:{openedAt}"
  tagDefinitionId String
  userId          String    // Denormalized for RLS
  notes           String?   // Optional note specific to this tagging
  createdAt       DateTime  @default(now())

  tagDefinition   TagDefinition @relation(fields: [tagDefinitionId], references: [id], onDelete: Cascade)
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([positionKey, tagDefinitionId])
  @@index([userId, positionKey])
  @@index([tagDefinitionId])
  @@map("position_tags")
}

// ============================================
// UPDATES TO EXISTING MODELS
// ============================================

// Add to User model:
model User {
  // ... existing fields ...
  tagDefinitions  TagDefinition[]
  positionTags    PositionTag[]
}

// DEPRECATE old Tag model after migration
// Keep Trade.tags relation temporarily for backward compatibility
```

### Why Position-Based Tagging?

| Trade-Based (Current) | Position-Based (Proposed) |
|-----------------------|---------------------------|
| Tag each BUY/SELL separately | Tag the complete position |
| Confusing for multi-leg options | One tag covers all legs |
| Duplicates tags across related trades | Single tag per position |
| Hard to analyze: "Which positions had FOMO?" | Easy: filter positions by tag |

**Position Key Format:** `{accountId}:{symbol}:{openedAtISO}`
- Example: `acc_123:AAPL:2024-01-15T09:30:00.000Z`
- Uniquely identifies a position across time
- Works for both stocks and options

### Migration Strategy

1. **Phase 1:** Create new `TagDefinition` and `PositionTag` tables
2. **Phase 2:** Migrate existing tags to new schema (create TagDefinitions for existing Tag names)
3. **Phase 3:** Convert Trade-Tag relationships to Position-Tag
4. **Phase 4:** Deprecate old Tag model
5. **Phase 5:** Remove old Tag model after verification

---

## Part 4: Default Starter Tags

New users get these pre-populated tags to prevent the "blank slate paralysis":

### Setup Tags (5 starters)
| Name | Color | Description |
|------|-------|-------------|
| Breakout | `#10B981` (green) | Price breaking through resistance/support |
| Pullback | `#3B82F6` (blue) | Entry on a retracement in trend direction |
| Reversal | `#F59E0B` (amber) | Betting on trend change |
| Momentum | `#8B5CF6` (purple) | Following strong directional move |
| Earnings | `#EC4899` (pink) | Trade around earnings announcement |

### Mistake Tags (5 starters)
| Name | Color | Description |
|------|-------|-------------|
| Early Entry | `#EF4444` (red) | Entered before confirmation |
| Late Entry | `#F97316` (orange) | Chased after move already happened |
| Oversized | `#DC2626` (red-dark) | Position too large for account |
| No Stop Loss | `#B91C1C` (red-darker) | Failed to set or honor stop |
| Broke Rules | `#7F1D1D` (red-darkest) | Violated trading plan |

### Emotion Tags (5 starters)
| Name | Color | Description |
|------|-------|-------------|
| FOMO | `#F59E0B` (amber) | Fear of missing out drove entry |
| Revenge Trade | `#EF4444` (red) | Trying to recover losses aggressively |
| Hesitation | `#6B7280` (gray) | Delayed entry/exit due to fear |
| Overconfidence | `#8B5CF6` (purple) | Took excessive risk after wins |
| Calm & Focused | `#10B981` (green) | Executed plan without emotion |

---

## Part 5: API Endpoints

### Tag Definition Management

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tags` | List all tag definitions for user |
| POST | `/api/tags` | Create new tag definition |
| PATCH | `/api/tags/[id]` | Update tag definition |
| DELETE | `/api/tags/[id]` | Archive tag definition (soft delete) |
| POST | `/api/tags/restore/[id]` | Restore archived tag |
| POST | `/api/tags/reorder` | Update sort order for tags |

### Position Tagging

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/positions/[key]/tags` | Get tags for a position |
| POST | `/api/positions/[key]/tags` | Add tag(s) to position |
| DELETE | `/api/positions/[key]/tags/[tagId]` | Remove tag from position |
| POST | `/api/positions/bulk-tag` | Add tag to multiple positions |
| DELETE | `/api/positions/bulk-untag` | Remove tag from multiple positions |

### Tag Analytics

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tags/analytics` | Tag performance summary |
| GET | `/api/tags/[id]/positions` | Positions with specific tag |
| GET | `/api/tags/cost-analysis` | Cost-per-tag breakdown |

---

## Part 6: UI Components & Pages

### 6.1 Settings Page - Tag Management

**New Page:** `/settings/tags`

```
┌─────────────────────────────────────────────────────────────────┐
│  Settings > Tags                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Setups] [Mistakes] [Emotions] [Custom] [+ New Tag]        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  SETUPS (5)                                              [Edit] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟢 Breakout      Price breaking through resistance    [⋮]  ││
│  │ 🔵 Pullback      Entry on a retracement               [⋮]  ││
│  │ 🟠 Reversal      Betting on trend change              [⋮]  ││
│  │ 🟣 Momentum      Following strong directional move    [⋮]  ││
│  │ 🩷 Earnings      Trade around earnings announcement   [⋮]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  MISTAKES (5)                                            [Edit] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔴 Early Entry   Entered before confirmation          [⋮]  ││
│  │ 🟠 Late Entry    Chased after move already happened   [⋮]  ││
│  │ ...                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Show Archived Tags]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Category tabs with counts
- Drag-and-drop reordering
- Inline edit (click to rename)
- Color picker
- Description field
- Archive/restore functionality
- Bulk import from template

### 6.2 Journal Page - Tag Column & Filter

**Add to Journal View:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Journal                              [Trades] [Strategies]     │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Symbol] [Account] [Date] [Status] [Tags ▼]          │
│                                        ┌───────────────────────┐│
│                                        │ □ All Tags           ││
│                                        │ ─────────────────────││
│                                        │ SETUPS               ││
│                                        │ ☑ Breakout           ││
│                                        │ □ Pullback           ││
│                                        │ ─────────────────────││
│                                        │ MISTAKES             ││
│                                        │ □ Early Entry        ││
│                                        │ ☑ FOMO               ││
│                                        └───────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  Symbol   │ Entry │ Exit  │ P&L    │ Tags           │ Actions  │
│  ─────────┼───────┼───────┼────────┼────────────────┼──────────│
│  AAPL     │ $185  │ $190  │ +$500  │ 🟢Breakout     │ [Tag][⋮]│
│           │       │       │        │ 🟢Calm         │          │
│  ─────────┼───────┼───────┼────────┼────────────────┼──────────│
│  TSLA     │ $240  │ $235  │ -$500  │ 🔴Early Entry  │ [Tag][⋮]│
│           │       │       │        │ 🟠FOMO         │          │
└─────────────────────────────────────────────────────────────────┘
```

**Tag Filter Behavior:**
- Multi-select checkboxes
- Filter by category
- "Has any tag" vs "Has all tags" toggle
- Clear tags filter button

### 6.3 Position Detail Sheet - Tag Assignment

**Enhanced Trade/Position Detail:**

```
┌─────────────────────────────────────────────────────────────────┐
│  AAPL Position                                           [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Entry: $185.00        Exit: $190.00        P&L: +$500 (+2.7%) │
│  Opened: Jan 15, 2024  Closed: Jan 18, 2024                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  TAGS                                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟢 Breakout  [×]    🟢 Calm & Focused  [×]                 ││
│  │                                                             ││
│  │ [+ Add Tag ▼]                                              ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ Quick Add:                                              │││
│  │  │ [Breakout] [Pullback] [Reversal] [FOMO] [Early Entry]  │││
│  │  │                                                         │││
│  │  │ All Tags:                                               │││
│  │  │ ▸ Setups (5)                                           │││
│  │  │ ▸ Mistakes (5)                                         │││
│  │  │ ▸ Emotions (5)                                         │││
│  │  │ ▸ Custom (0)                                           │││
│  │  │                                                         │││
│  │  │ [+ Create New Tag]                                     │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  NOTES                                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Clean breakout above resistance. Held through pullback.    ││
│  │ Exited at target. Good execution.                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  TRADES (2)                                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Jan 15  BUY   100 shares @ $185.00                         ││
│  │ Jan 18  SELL  100 shares @ $190.00                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Quick-add buttons for frequently used tags
- Expandable category sections
- Create new tag inline
- Tag-specific notes
- Remove tags with X button

### 6.4 Reports Page - Tag Analytics

**New Report Section:** "Tag Performance"

```
┌─────────────────────────────────────────────────────────────────┐
│  Reports > Tag Performance                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SETUP PERFORMANCE                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Setup       │ Trades │ Win Rate │ Avg P&L │ Total P&L      ││
│  │ ────────────┼────────┼──────────┼─────────┼────────────────││
│  │ 🟢 Breakout │ 45     │ 62%      │ +$124   │ +$5,580        ││
│  │ 🔵 Pullback │ 32     │ 56%      │ +$87    │ +$2,784        ││
│  │ 🟠 Reversal │ 12     │ 33%      │ -$156   │ -$1,872        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  MISTAKE COST ANALYSIS                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │  🔴 Early Entry     ████████████████████  -$3,240 (18 trades)│
│  │  🟠 FOMO            ████████████          -$1,890 (12 trades)│
│  │  🔴 Oversized       ████████              -$1,450 (5 trades) │
│  │  🟠 Late Entry      █████                 -$890 (8 trades)  ││
│  │  🔴 No Stop Loss    ████                  -$720 (3 trades)  ││
│  │                                                             ││
│  │  Total Mistake Cost This Month: -$8,190                    ││
│  │  (Without these mistakes, you'd be +$12,450 instead of     ││
│  │   +$4,260)                                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  EMOTION CORRELATION                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Emotion          │ Win Rate │ Avg Loss │ Recommendation    ││
│  │ ─────────────────┼──────────┼──────────┼──────────────────-││
│  │ 🟢 Calm/Focused  │ 68%      │ -$85     │ Keep doing this! ││
│  │ 🟠 FOMO          │ 28%      │ -$245    │ Stop! Wait 5 min ││
│  │ 🔴 Revenge Trade │ 15%      │ -$520    │ Walk away        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Insights:**
- Setup win rates and average P&L
- Cost-per-mistake in real dollars
- "What if" calculation: performance without mistakes
- Emotion → outcome correlation
- Actionable recommendations

### 6.5 Dashboard - Tag Widgets

**Add to Dashboard:**

```
┌────────────────────────────────────────┐
│  Quick Stats                           │
│  ┌────────────────────────────────────┐│
│  │ Most Profitable Setup: Breakout   ││
│  │ +$5,580 (45 trades, 62% win)      ││
│  └────────────────────────────────────┘│
│  ┌────────────────────────────────────┐│
│  │ Biggest Mistake This Month        ││
│  │ Early Entry: -$3,240 (18 trades)  ││
│  │ [View Details]                    ││
│  └────────────────────────────────────┘│
└────────────────────────────────────────┘
```

---

## Part 7: Filter Context Updates

### New Filter State

```typescript
// src/contexts/filter-context.tsx

export interface FilterState {
  // ... existing fields ...
  symbol: string;
  startDate: string;
  endDate: string;
  status: FilterStatus;
  action: FilterAction;
  accountId: string;
  assetType: FilterAssetType;

  // NEW: Tag filtering
  tagIds: string[];           // Selected tag IDs
  tagFilterMode: 'any' | 'all';  // Match any vs match all
  tagCategory: TagCategory | 'all';  // Filter by category
}

export interface FilterActions {
  // ... existing actions ...
  setTagIds: (ids: string[]) => void;
  setTagFilterMode: (mode: 'any' | 'all') => void;
  setTagCategory: (category: TagCategory | 'all') => void;
  clearTagFilters: () => void;
}
```

### localStorage Key Update

Bump version: `dashboard_filters_v4` to include tag filters

---

## Part 8: Implementation Phases

### Phase 1: Database & Types (Completed)
- [x] Create `TagDefinition` model in schema
- [x] Create `PositionTag` model in schema
- [x] Add `TagCategory` enum
- [x] Run `pnpm prisma db push`
- [x] Create `src/types/tags.ts` with TypeScript interfaces
- [x] Create seed script for default tags

### Phase 2: Tag Management API (Completed)
- [x] Create `/api/tags/route.ts` (GET, POST)
- [x] Create `/api/tags/[id]/route.ts` (PATCH, DELETE)
- [x] Create `/api/tags/restore/[id]/route.ts`
- [x] Create `/api/tags/reorder/route.ts`
- [x] Add authorization checks (userId filtering)

### Phase 3: Position Tagging API (Completed)
- [x] Create `/api/positions/[key]/tags/route.ts`
- [x] Create `/api/positions/bulk-tag/route.ts`
- [x] Create position key generation utility
- [x] Handle position key encoding/decoding (URL-safe)

### Phase 4: Settings Page UI (Completed)
- [x] Create `/settings` page layout
- [x] Create `/settings/tags` page
- [x] Build tag category tabs component
- [x] Build tag list with drag-and-drop
- [x] Build tag create/edit dialog
- [x] Build color picker component
- [x] Build archive/restore functionality

### Phase 5: Journal & Filter Integration (Completed)
- [x] Add tag column to journal table
- [x] Add tag filter to global-filter-bar
- [x] Create TagManager component (CRUD, reordering)
- [x] Create TagFilterDropdown component
- [x] Integrate TagFilterDropdown into GlobalFilterBar
- [x] Add "Trade Tags" card to SettingsPage
- [x] Update FilterContext with tag state
- [x] Build tag filter dropdown component
- [x] Update position detail sheet with tags
- [x] Build quick-add tag buttons
- [x] Build inline tag creation

### Phase 6: Tag Analytics (Completed)
- [x] Create `/api/tags/analytics/route.ts`
- [x] Build tag performance report section (Integrated in Reports & Dashboard)
- [x] Build mistake cost analysis chart ("Behavioral Alpha")
- [x] Build emotion correlation table (Integrated in Detail Table)
- [x] Add dashboard widgets

### Phase 7: Bulk Operations (Completed)
- [x] Add multi-select mode to journal
- [x] Build bulk tag assignment dialog
- [x] Implement bulk tag/untag endpoints

### Phase 8: Migration & Cleanup (Completed/Stable)
- [x] Backfill position keys for all trades
- [x] Implement dual-mode key lookup (v1 + legacy) for transition stability
- [ ] Deprecate old Tag model (Preserving for data safety for now)
- [x] Update all UI references to new TagDefinition

**Total Estimated: 16 days**

---

## Part 9: Files to Create/Modify

### New Files

```
src/types/tags.ts                           # Tag type definitions
src/app/(dashboard)/settings/page.tsx       # Settings page layout
src/app/(dashboard)/settings/tags/page.tsx  # Tag management page
src/app/api/tags/route.ts                   # Tag CRUD (list, create)
src/app/api/tags/[id]/route.ts              # Tag CRUD (update, delete)
src/app/api/tags/restore/[id]/route.ts      # Restore archived tag
src/app/api/tags/reorder/route.ts           # Update sort order
src/app/api/tags/analytics/route.ts         # Tag performance data
src/app/api/positions/[key]/tags/route.ts   # Position tag CRUD
src/app/api/positions/bulk-tag/route.ts     # Bulk tagging
src/components/tag-filter-dropdown.tsx      # Filter component
src/components/tag-manager.tsx              # Settings page component
src/components/tag-assignment.tsx           # Position detail component
src/components/tag-quick-add.tsx            # Quick add buttons
src/components/tag-analytics-chart.tsx      # Reports chart
src/lib/services/tag.service.ts             # Tag business logic
src/lib/utils/position-key.ts               # Position key utilities
```

### Modified Files

```
prisma/schema.prisma                        # Add new models
src/contexts/filter-context.tsx             # Add tag filter state
src/components/global-filter-bar.tsx        # Add tag filter dropdown
src/app/(dashboard)/journal/page.tsx        # Add tag column, filtering
src/components/trade-detail-sheet.tsx       # Add tag assignment UI
src/app/(dashboard)/reports/page.tsx        # Add tag analytics section
src/app/(dashboard)/dashboard/page.tsx      # Add tag widgets
src/components/views/journal-view.tsx       # Support tag display
```

---

## Part 10: Edge Cases & Considerations

### Position Key Challenges

1. **Options with same underlying** - Include full OCC symbol in key
2. **Rolled positions** - Create new position key for each roll
3. **Partial closes** - Position key stays same until fully closed
4. **Cross-day positions** - Use first trade timestamp

### Tag Limits

- Max 50 tags per user (prevent abuse)
- Max 10 tags per position (prevent spam)
- Tag name max 30 characters
- Description max 200 characters

### Performance

- Index `PositionTag` by `userId` and `positionKey`
- Cache tag definitions (rarely change)
- Lazy load tag analytics (expensive query)

### Demo Mode

- Demo users get read-only access to default tags
- Cannot create/modify tags in demo
- Show sample tagged positions

---

## Part 11: Future Enhancements (Not in Scope)

1. **Day Plans** - Pre-market emotional state logging
2. **Tag Templates** - Import community-shared tag sets
3. **AI Tag Suggestions** - Analyze trade patterns, suggest tags
4. **Tag Goals** - "Reduce FOMO trades by 50%"
5. **Trade Replay** - Relive tagged trades with price action
6. **Mentor Sharing** - Share tagged trades for review
7. **Mobile Quick-Tag** - Tag trades on the go
8. **Tag Notifications** - Alert when entering trades in "danger" emotions

---

## Summary

This tagging system addresses the core problems traders face:

1. **Overwhelm** → Starter tags + categories
2. **Tedium** → Bulk operations + quick-add
3. **No insights** → Cost-per-mistake + analytics
4. **Generic emotions** → Specific emotional tags
5. **Abandoned journals** → Simple, fast, automated

The position-based approach (vs trade-based) simplifies the mental model and makes analysis more meaningful. The category system keeps tags organized as the collection grows.

**Next Step:** Begin Phase 1 - Database schema changes
