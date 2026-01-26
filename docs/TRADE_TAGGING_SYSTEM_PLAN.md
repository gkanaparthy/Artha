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

### Phase 8: Migration & Cleanup (Completed)
- [x] Backfill position keys for all trades
- [x] Implement dual-mode key lookup (v1 + legacy) for transition stability
- [x] Deprecate old Tag model (Preserving for data safety for now)
- [x] Update all UI references to new TagDefinition
- [x] Update documentation with new architecture

**Status: COMPLETE**

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

## Part 11: Test Cases & Verification

### 11.1 Unit Tests - Tag Definition Service

#### Tag Creation Tests

```typescript
describe('TagDefinition Service', () => {
  describe('createTag', () => {
    it('should create a tag with valid data', async () => {
      const tag = await createTag({
        userId: 'user_123',
        name: 'Breakout',
        category: 'SETUP',
        color: '#10B981',
        description: 'Price breaking resistance'
      });
      expect(tag.id).toBeDefined();
      expect(tag.name).toBe('Breakout');
      expect(tag.category).toBe('SETUP');
    });

    it('should reject duplicate tag names for same user', async () => {
      await createTag({ userId: 'user_123', name: 'FOMO', category: 'EMOTION' });
      await expect(
        createTag({ userId: 'user_123', name: 'FOMO', category: 'EMOTION' })
      ).rejects.toThrow('Tag name already exists');
    });

    it('should allow same tag name for different users', async () => {
      await createTag({ userId: 'user_123', name: 'Breakout', category: 'SETUP' });
      const tag2 = await createTag({ userId: 'user_456', name: 'Breakout', category: 'SETUP' });
      expect(tag2.id).toBeDefined();
    });

    it('should reject tag names exceeding 30 characters', async () => {
      await expect(
        createTag({ userId: 'user_123', name: 'A'.repeat(31), category: 'CUSTOM' })
      ).rejects.toThrow('Tag name must be 30 characters or less');
    });

    it('should reject empty tag names', async () => {
      await expect(
        createTag({ userId: 'user_123', name: '', category: 'CUSTOM' })
      ).rejects.toThrow('Tag name is required');
    });

    it('should reject tag names with only whitespace', async () => {
      await expect(
        createTag({ userId: 'user_123', name: '   ', category: 'CUSTOM' })
      ).rejects.toThrow('Tag name is required');
    });

    it('should trim whitespace from tag names', async () => {
      const tag = await createTag({ userId: 'user_123', name: '  Breakout  ', category: 'SETUP' });
      expect(tag.name).toBe('Breakout');
    });

    it('should enforce max 50 tags per user', async () => {
      for (let i = 0; i < 50; i++) {
        await createTag({ userId: 'user_123', name: `Tag${i}`, category: 'CUSTOM' });
      }
      await expect(
        createTag({ userId: 'user_123', name: 'Tag50', category: 'CUSTOM' })
      ).rejects.toThrow('Maximum 50 tags allowed');
    });

    it('should validate color format as hex', async () => {
      await expect(
        createTag({ userId: 'user_123', name: 'Test', category: 'CUSTOM', color: 'red' })
      ).rejects.toThrow('Invalid color format');
    });
  });

  describe('updateTag', () => {
    it('should update tag name', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Old', category: 'CUSTOM' });
      const updated = await updateTag(tag.id, 'user_123', { name: 'New' });
      expect(updated.name).toBe('New');
    });

    it('should not update tag owned by different user', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Test', category: 'CUSTOM' });
      await expect(
        updateTag(tag.id, 'user_456', { name: 'Hacked' })
      ).rejects.toThrow('Tag not found');
    });

    it('should not allow updating default tags', async () => {
      const defaultTag = await getDefaultTags('user_123').find(t => t.name === 'Breakout');
      await expect(
        updateTag(defaultTag.id, 'user_123', { name: 'Renamed' })
      ).rejects.toThrow('Cannot modify default tags');
    });
  });

  describe('archiveTag', () => {
    it('should soft delete tag', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'ToArchive', category: 'CUSTOM' });
      await archiveTag(tag.id, 'user_123');
      const archived = await getTag(tag.id, 'user_123');
      expect(archived.isArchived).toBe(true);
    });

    it('should preserve position tags when archiving', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Used', category: 'SETUP' });
      await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');
      await archiveTag(tag.id, 'user_123');

      const positionTags = await getPositionTags('acc:AAPL:2024-01-15', 'user_123');
      expect(positionTags.some(t => t.tagDefinitionId === tag.id)).toBe(true);
    });

    it('should hide archived tags from tag list by default', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Hidden', category: 'CUSTOM' });
      await archiveTag(tag.id, 'user_123');

      const tags = await listTags('user_123');
      expect(tags.some(t => t.id === tag.id)).toBe(false);
    });

    it('should show archived tags when explicitly requested', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Hidden', category: 'CUSTOM' });
      await archiveTag(tag.id, 'user_123');

      const tags = await listTags('user_123', { includeArchived: true });
      expect(tags.some(t => t.id === tag.id)).toBe(true);
    });
  });

  describe('restoreTag', () => {
    it('should restore archived tag', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Restore', category: 'CUSTOM' });
      await archiveTag(tag.id, 'user_123');
      await restoreTag(tag.id, 'user_123');

      const restored = await getTag(tag.id, 'user_123');
      expect(restored.isArchived).toBe(false);
    });
  });
});
```

### 11.2 Unit Tests - Position Tagging Service

```typescript
describe('PositionTag Service', () => {
  describe('addTagToPosition', () => {
    it('should add tag to position', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Test', category: 'SETUP' });
      const result = await addTagToPosition('acc:AAPL:2024-01-15T09:30:00Z', tag.id, 'user_123');
      expect(result.positionKey).toBe('acc:AAPL:2024-01-15T09:30:00Z');
    });

    it('should not add same tag twice', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Test', category: 'SETUP' });
      await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');
      await expect(
        addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123')
      ).rejects.toThrow('Tag already applied');
    });

    it('should enforce max 10 tags per position', async () => {
      for (let i = 0; i < 10; i++) {
        const tag = await createTag({ userId: 'user_123', name: `Tag${i}`, category: 'CUSTOM' });
        await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');
      }
      const tag11 = await createTag({ userId: 'user_123', name: 'Tag10', category: 'CUSTOM' });
      await expect(
        addTagToPosition('acc:AAPL:2024-01-15', tag11.id, 'user_123')
      ).rejects.toThrow('Maximum 10 tags per position');
    });

    it('should not allow tagging with another user\'s tag', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Private', category: 'SETUP' });
      await expect(
        addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_456')
      ).rejects.toThrow('Tag not found');
    });

    it('should allow adding note with tag', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Test', category: 'SETUP' });
      const result = await addTagToPosition(
        'acc:AAPL:2024-01-15',
        tag.id,
        'user_123',
        { notes: 'Perfect setup execution' }
      );
      expect(result.notes).toBe('Perfect setup execution');
    });

    it('should not allow adding archived tag', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Archived', category: 'SETUP' });
      await archiveTag(tag.id, 'user_123');
      await expect(
        addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123')
      ).rejects.toThrow('Cannot add archived tag');
    });
  });

  describe('removeTagFromPosition', () => {
    it('should remove tag from position', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Remove', category: 'SETUP' });
      await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');
      await removeTagFromPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');

      const tags = await getPositionTags('acc:AAPL:2024-01-15', 'user_123');
      expect(tags.length).toBe(0);
    });

    it('should not remove tag for different user', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Keep', category: 'SETUP' });
      await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');
      await expect(
        removeTagFromPosition('acc:AAPL:2024-01-15', tag.id, 'user_456')
      ).rejects.toThrow('Position tag not found');
    });
  });

  describe('bulkTagPositions', () => {
    it('should add tag to multiple positions', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Bulk', category: 'SETUP' });
      const positions = ['acc:AAPL:2024-01-15', 'acc:TSLA:2024-01-16', 'acc:GOOGL:2024-01-17'];

      const result = await bulkTagPositions(positions, tag.id, 'user_123');
      expect(result.tagged).toBe(3);
      expect(result.skipped).toBe(0);
    });

    it('should skip positions that already have the tag', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Bulk', category: 'SETUP' });
      await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');

      const positions = ['acc:AAPL:2024-01-15', 'acc:TSLA:2024-01-16'];
      const result = await bulkTagPositions(positions, tag.id, 'user_123');
      expect(result.tagged).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should enforce max 100 positions per bulk operation', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Bulk', category: 'SETUP' });
      const positions = Array.from({ length: 101 }, (_, i) => `acc:SYM${i}:2024-01-15`);

      await expect(
        bulkTagPositions(positions, tag.id, 'user_123')
      ).rejects.toThrow('Maximum 100 positions per bulk operation');
    });
  });
});
```

### 11.3 Unit Tests - Position Key Generation

```typescript
describe('Position Key Utilities', () => {
  describe('generatePositionKey', () => {
    it('should generate key for stock position', () => {
      const key = generatePositionKey({
        accountId: 'acc_123',
        symbol: 'AAPL',
        openedAt: '2024-01-15T09:30:00.000Z'
      });
      expect(key).toBe('acc_123:AAPL:2024-01-15T09:30:00.000Z');
    });

    it('should generate key for option position with full OCC symbol', () => {
      const key = generatePositionKey({
        accountId: 'acc_123',
        symbol: 'AAPL  240119C00150000',
        openedAt: '2024-01-15T09:30:00.000Z'
      });
      expect(key).toBe('acc_123:AAPL  240119C00150000:2024-01-15T09:30:00.000Z');
    });

    it('should handle special characters in symbol', () => {
      const key = generatePositionKey({
        accountId: 'acc_123',
        symbol: 'BRK.B',
        openedAt: '2024-01-15T09:30:00.000Z'
      });
      expect(key).toBe('acc_123:BRK.B:2024-01-15T09:30:00.000Z');
    });
  });

  describe('parsePositionKey', () => {
    it('should parse valid position key', () => {
      const parsed = parsePositionKey('acc_123:AAPL:2024-01-15T09:30:00.000Z');
      expect(parsed.accountId).toBe('acc_123');
      expect(parsed.symbol).toBe('AAPL');
      expect(parsed.openedAt).toBe('2024-01-15T09:30:00.000Z');
    });

    it('should handle OCC symbols with colons replaced', () => {
      const key = 'acc_123:AAPL  240119C00150000:2024-01-15T09:30:00.000Z';
      const parsed = parsePositionKey(key);
      expect(parsed.symbol).toBe('AAPL  240119C00150000');
    });

    it('should throw on invalid key format', () => {
      expect(() => parsePositionKey('invalid')).toThrow('Invalid position key format');
      expect(() => parsePositionKey('only:two')).toThrow('Invalid position key format');
    });
  });

  describe('encodePositionKeyForUrl', () => {
    it('should URL-encode position key', () => {
      const encoded = encodePositionKeyForUrl('acc_123:AAPL  240119C00150000:2024-01-15T09:30:00.000Z');
      expect(encoded).not.toContain(' ');
      expect(encoded).not.toContain(':');
    });

    it('should be reversible', () => {
      const original = 'acc_123:AAPL  240119C00150000:2024-01-15T09:30:00.000Z';
      const encoded = encodePositionKeyForUrl(original);
      const decoded = decodePositionKeyFromUrl(encoded);
      expect(decoded).toBe(original);
    });
  });
});
```

### 11.4 Unit Tests - Tag Analytics

```typescript
describe('Tag Analytics Service', () => {
  describe('getTagPerformance', () => {
    beforeEach(async () => {
      // Setup: Create tags and positions with P&L
      await seedTestData();
    });

    it('should calculate win rate for setup tag', async () => {
      const analytics = await getTagPerformance('user_123', 'tag_breakout');
      expect(analytics.totalTrades).toBeGreaterThan(0);
      expect(analytics.winRate).toBeGreaterThanOrEqual(0);
      expect(analytics.winRate).toBeLessThanOrEqual(100);
    });

    it('should calculate average P&L per trade', async () => {
      const analytics = await getTagPerformance('user_123', 'tag_breakout');
      expect(typeof analytics.avgPnL).toBe('number');
    });

    it('should calculate total P&L', async () => {
      const analytics = await getTagPerformance('user_123', 'tag_breakout');
      expect(typeof analytics.totalPnL).toBe('number');
    });

    it('should return zero stats for unused tag', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Unused', category: 'CUSTOM' });
      const analytics = await getTagPerformance('user_123', tag.id);
      expect(analytics.totalTrades).toBe(0);
      expect(analytics.winRate).toBe(0);
      expect(analytics.totalPnL).toBe(0);
    });

    it('should filter by date range', async () => {
      const analytics = await getTagPerformance('user_123', 'tag_breakout', {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });
      expect(analytics.totalTrades).toBeLessThanOrEqual(
        (await getTagPerformance('user_123', 'tag_breakout')).totalTrades
      );
    });
  });

  describe('getMistakeCostAnalysis', () => {
    it('should calculate total cost per mistake tag', async () => {
      const analysis = await getMistakeCostAnalysis('user_123');
      expect(Array.isArray(analysis)).toBe(true);
      analysis.forEach(item => {
        expect(item.tagName).toBeDefined();
        expect(item.totalCost).toBeLessThanOrEqual(0); // Mistakes should be negative
        expect(item.tradeCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should sort by most costly mistake first', async () => {
      const analysis = await getMistakeCostAnalysis('user_123');
      for (let i = 1; i < analysis.length; i++) {
        expect(analysis[i - 1].totalCost).toBeLessThanOrEqual(analysis[i].totalCost);
      }
    });

    it('should calculate "without mistakes" projection', async () => {
      const analysis = await getMistakeCostAnalysis('user_123');
      const totalMistakeCost = analysis.reduce((sum, m) => sum + m.totalCost, 0);
      const actualPnL = await getTotalPnL('user_123');
      const projectedPnL = actualPnL - totalMistakeCost;
      expect(projectedPnL).toBeGreaterThan(actualPnL);
    });
  });

  describe('getEmotionCorrelation', () => {
    it('should correlate emotions with win rate', async () => {
      const correlation = await getEmotionCorrelation('user_123');
      expect(Array.isArray(correlation)).toBe(true);
      correlation.forEach(item => {
        expect(item.emotion).toBeDefined();
        expect(item.winRate).toBeGreaterThanOrEqual(0);
        expect(item.winRate).toBeLessThanOrEqual(100);
        expect(item.avgLoss).toBeLessThanOrEqual(0);
      });
    });

    it('should identify "Calm & Focused" as best performer', async () => {
      const correlation = await getEmotionCorrelation('user_123');
      const calm = correlation.find(e => e.emotion === 'Calm & Focused');
      const fomo = correlation.find(e => e.emotion === 'FOMO');
      if (calm && fomo) {
        expect(calm.winRate).toBeGreaterThan(fomo.winRate);
      }
    });
  });
});
```

### 11.5 API Integration Tests

```typescript
describe('Tag API Endpoints', () => {
  describe('GET /api/tags', () => {
    it('should return 401 without auth', async () => {
      const res = await fetch('/api/tags');
      expect(res.status).toBe(401);
    });

    it('should return user tags', async () => {
      const res = await authenticatedFetch('/api/tags');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.tags)).toBe(true);
    });

    it('should filter by category', async () => {
      const res = await authenticatedFetch('/api/tags?category=MISTAKE');
      const data = await res.json();
      data.tags.forEach(tag => {
        expect(tag.category).toBe('MISTAKE');
      });
    });

    it('should not return other users tags', async () => {
      const res = await authenticatedFetch('/api/tags', { userId: 'user_456' });
      const data = await res.json();
      data.tags.forEach(tag => {
        expect(tag.userId).toBe('user_456');
      });
    });
  });

  describe('POST /api/tags', () => {
    it('should create tag', async () => {
      const res = await authenticatedFetch('/api/tags', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Tag',
          category: 'CUSTOM',
          color: '#FF0000'
        })
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('New Tag');
    });

    it('should return 400 for missing name', async () => {
      const res = await authenticatedFetch('/api/tags', {
        method: 'POST',
        body: JSON.stringify({ category: 'CUSTOM' })
      });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid category', async () => {
      const res = await authenticatedFetch('/api/tags', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', category: 'INVALID' })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/positions/:key/tags', () => {
    it('should add tag to position', async () => {
      const tag = await createTestTag();
      const res = await authenticatedFetch('/api/positions/acc:AAPL:2024-01-15/tags', {
        method: 'POST',
        body: JSON.stringify({ tagId: tag.id })
      });
      expect(res.status).toBe(201);
    });

    it('should handle URL-encoded position key', async () => {
      const tag = await createTestTag();
      const encodedKey = encodeURIComponent('acc:AAPL  240119C00150000:2024-01-15');
      const res = await authenticatedFetch(`/api/positions/${encodedKey}/tags`, {
        method: 'POST',
        body: JSON.stringify({ tagId: tag.id })
      });
      expect(res.status).toBe(201);
    });

    it('should return 404 for non-existent tag', async () => {
      const res = await authenticatedFetch('/api/positions/acc:AAPL:2024-01-15/tags', {
        method: 'POST',
        body: JSON.stringify({ tagId: 'non_existent_tag' })
      });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/tags/analytics', () => {
    it('should return tag performance summary', async () => {
      const res = await authenticatedFetch('/api/tags/analytics');
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.setupPerformance).toBeDefined();
      expect(data.mistakeCosts).toBeDefined();
      expect(data.emotionCorrelation).toBeDefined();
    });

    it('should filter by date range', async () => {
      const res = await authenticatedFetch('/api/tags/analytics?startDate=2024-01-01&endDate=2024-01-31');
      expect(res.status).toBe(200);
    });
  });
});
```

### 11.6 UI Component Tests

```typescript
describe('Tag Components', () => {
  describe('TagFilterDropdown', () => {
    it('should render all categories', () => {
      render(<TagFilterDropdown tags={mockTags} onSelect={jest.fn()} />);
      expect(screen.getByText('Setups')).toBeInTheDocument();
      expect(screen.getByText('Mistakes')).toBeInTheDocument();
      expect(screen.getByText('Emotions')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('should call onSelect when tag clicked', () => {
      const onSelect = jest.fn();
      render(<TagFilterDropdown tags={mockTags} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('Breakout'));
      expect(onSelect).toHaveBeenCalledWith(['tag_breakout']);
    });

    it('should allow multi-select', () => {
      const onSelect = jest.fn();
      render(<TagFilterDropdown tags={mockTags} onSelect={onSelect} selectedIds={['tag_breakout']} />);
      fireEvent.click(screen.getByText('FOMO'));
      expect(onSelect).toHaveBeenCalledWith(['tag_breakout', 'tag_fomo']);
    });

    it('should show selected count badge', () => {
      render(<TagFilterDropdown tags={mockTags} selectedIds={['tag_1', 'tag_2']} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('TagAssignment', () => {
    it('should show current tags', () => {
      render(<TagAssignment positionKey="acc:AAPL:2024" currentTags={[mockTag]} />);
      expect(screen.getByText('Breakout')).toBeInTheDocument();
    });

    it('should show quick-add buttons', () => {
      render(<TagAssignment positionKey="acc:AAPL:2024" availableTags={mockTags} />);
      expect(screen.getByText('+ Add Tag')).toBeInTheDocument();
    });

    it('should call onAdd when tag selected', async () => {
      const onAdd = jest.fn();
      render(<TagAssignment positionKey="acc:AAPL:2024" availableTags={mockTags} onAdd={onAdd} />);
      fireEvent.click(screen.getByText('+ Add Tag'));
      fireEvent.click(screen.getByText('FOMO'));
      expect(onAdd).toHaveBeenCalledWith('acc:AAPL:2024', 'tag_fomo');
    });

    it('should call onRemove when X clicked', () => {
      const onRemove = jest.fn();
      render(<TagAssignment positionKey="acc:AAPL:2024" currentTags={[mockTag]} onRemove={onRemove} />);
      fireEvent.click(screen.getByLabelText('Remove Breakout'));
      expect(onRemove).toHaveBeenCalledWith('acc:AAPL:2024', 'tag_breakout');
    });

    it('should not show add button when max tags reached', () => {
      const tenTags = Array.from({ length: 10 }, (_, i) => ({ id: `tag_${i}`, name: `Tag${i}` }));
      render(<TagAssignment positionKey="acc:AAPL:2024" currentTags={tenTags} />);
      expect(screen.queryByText('+ Add Tag')).not.toBeInTheDocument();
      expect(screen.getByText('Max tags reached')).toBeInTheDocument();
    });
  });

  describe('TagManager (Settings)', () => {
    it('should render category tabs', () => {
      render(<TagManager />);
      expect(screen.getByRole('tab', { name: 'Setups' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Mistakes' })).toBeInTheDocument();
    });

    it('should show tag count per category', () => {
      render(<TagManager tags={mockTags} />);
      expect(screen.getByText('Setups (5)')).toBeInTheDocument();
    });

    it('should allow creating new tag', async () => {
      const onCreate = jest.fn();
      render(<TagManager onCreate={onCreate} />);
      fireEvent.click(screen.getByText('+ New Tag'));
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Tag' } });
      fireEvent.click(screen.getByText('Create'));
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Tag' }));
    });

    it('should allow drag-and-drop reordering', () => {
      // Drag-and-drop test implementation
    });
  });
});
```

### 11.7 Edge Case Tests

```typescript
describe('Edge Cases', () => {
  describe('Concurrent Operations', () => {
    it('should handle concurrent tag additions gracefully', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'Race', category: 'SETUP' });

      // Simulate race condition
      const promises = [
        addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123'),
        addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123')
      ];

      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled');
      expect(successes.length).toBe(1); // Only one should succeed
    });
  });

  describe('Position Key Edge Cases', () => {
    it('should handle positions opened at exact midnight', () => {
      const key = generatePositionKey({
        accountId: 'acc_123',
        symbol: 'AAPL',
        openedAt: '2024-01-15T00:00:00.000Z'
      });
      expect(parsePositionKey(key).openedAt).toBe('2024-01-15T00:00:00.000Z');
    });

    it('should handle symbols with numbers', () => {
      const key = generatePositionKey({
        accountId: 'acc_123',
        symbol: '3M',
        openedAt: '2024-01-15T09:30:00.000Z'
      });
      expect(parsePositionKey(key).symbol).toBe('3M');
    });

    it('should handle very long OCC symbols', () => {
      const symbol = 'SPXW  260105P06920000'; // SPX weeklies
      const key = generatePositionKey({
        accountId: 'acc_123',
        symbol,
        openedAt: '2024-01-15T09:30:00.000Z'
      });
      expect(parsePositionKey(key).symbol).toBe(symbol);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity when deleting user', async () => {
      const tag = await createTag({ userId: 'user_to_delete', name: 'Test', category: 'CUSTOM' });
      await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_to_delete');

      await deleteUser('user_to_delete'); // Cascade delete

      const orphanTags = await prisma.tagDefinition.findMany({
        where: { userId: 'user_to_delete' }
      });
      expect(orphanTags.length).toBe(0);

      const orphanPositionTags = await prisma.positionTag.findMany({
        where: { userId: 'user_to_delete' }
      });
      expect(orphanPositionTags.length).toBe(0);
    });

    it('should handle tag deletion with existing position tags', async () => {
      const tag = await createTag({ userId: 'user_123', name: 'ToDelete', category: 'CUSTOM' });
      await addTagToPosition('acc:AAPL:2024-01-15', tag.id, 'user_123');

      // Should archive, not hard delete
      await archiveTag(tag.id, 'user_123');

      const positionTags = await getPositionTags('acc:AAPL:2024-01-15', 'user_123');
      // Position tag should still exist, referencing archived tag
      expect(positionTags.some(t => t.tagDefinitionId === tag.id)).toBe(true);
    });
  });

  describe('Large Data Sets', () => {
    it('should handle analytics with 10,000+ positions', async () => {
      // Seed large dataset
      await seedLargeDataset('user_123', 10000);

      const startTime = Date.now();
      const analytics = await getTagPerformance('user_123', 'tag_breakout');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in < 5s
      expect(analytics.totalTrades).toBeGreaterThan(0);
    });

    it('should paginate tag list for user with 50 tags', async () => {
      for (let i = 0; i < 50; i++) {
        await createTag({ userId: 'user_123', name: `Tag${i}`, category: 'CUSTOM' });
      }

      const page1 = await listTags('user_123', { page: 1, limit: 20 });
      const page2 = await listTags('user_123', { page: 2, limit: 20 });

      expect(page1.tags.length).toBe(20);
      expect(page2.tags.length).toBe(20);
      expect(page1.tags[0].id).not.toBe(page2.tags[0].id);
    });
  });

  describe('Demo Mode', () => {
    it('should not allow tag creation in demo mode', async () => {
      await expect(
        createTag({ userId: 'demo_user', name: 'Test', category: 'CUSTOM' })
      ).rejects.toThrow('Cannot create tags in demo mode');
    });

    it('should not allow tag assignment in demo mode', async () => {
      await expect(
        addTagToPosition('demo_acc:AAPL:2024-01-15', 'tag_123', 'demo_user')
      ).rejects.toThrow('Cannot modify tags in demo mode');
    });

    it('should show sample tags in demo mode', async () => {
      const tags = await listTags('demo_user');
      expect(tags.some(t => t.isDefault)).toBe(true);
    });
  });

  describe('Migration Edge Cases', () => {
    it('should handle existing trade-tag relations during migration', async () => {
      // Simulate pre-migration state
      await prisma.tag.create({ data: { name: 'OldTag', color: '#000' } });
      await prisma.trade.update({
        where: { id: 'trade_123' },
        data: { tags: { connect: { name: 'OldTag' } } }
      });

      // Run migration
      await migrateTagsToPositionBased();

      // Verify new structure
      const position = await getPositionForTrade('trade_123');
      const positionTags = await getPositionTags(position.key, position.userId);
      expect(positionTags.some(t => t.tagDefinition.name === 'OldTag')).toBe(true);
    });
  });
});
```

### 11.8 Manual Test Scenarios

#### Scenario 1: New User Onboarding
1. Create new account
2. Navigate to Journal page
3. Verify 15 default tags visible (5 per category)
4. Click on a position
5. Verify quick-add buttons show default tags
6. Add "Breakout" tag
7. Verify tag appears on position in list

#### Scenario 2: Custom Tag Creation
1. Go to Settings > Tags
2. Click "Custom" tab
3. Click "+ New Tag"
4. Enter name "My Strategy"
5. Pick color
6. Enter description
7. Save
8. Verify tag appears in Custom section
9. Go to Journal
10. Verify new tag available in quick-add

#### Scenario 3: Tag Filtering
1. Add different tags to 5 positions
2. Open tag filter dropdown
3. Select "FOMO"
4. Verify only FOMO-tagged positions visible
5. Add "Early Entry" to filter (multi-select)
6. Toggle "Match All" vs "Match Any"
7. Verify correct filtering behavior
8. Clear filters
9. Verify all positions visible

#### Scenario 4: Bulk Tagging
1. Enable multi-select mode in Journal
2. Select 3 positions
3. Click "Add Tag"
4. Select "Breakout"
5. Verify all 3 positions now have Breakout tag
6. Select same 3 positions
7. Click "Remove Tag"
8. Select "Breakout"
9. Verify tag removed from all 3

#### Scenario 5: Tag Analytics Review
1. Tag 20+ positions with various tags
2. Go to Reports > Tag Performance
3. Verify Setup table shows win rates
4. Verify Mistake costs are calculated
5. Verify "Without mistakes" projection is shown
6. Filter by date range
7. Verify numbers update

#### Scenario 6: Archive and Restore
1. Create custom tag "Temporary"
2. Tag a position with it
3. Go to Settings > Tags
4. Archive "Temporary" tag
5. Verify tag hidden from list
6. Go to Journal
7. Verify tag still shows on position (greyed out)
8. Verify tag not available in quick-add
9. Go back to Settings
10. Show archived tags
11. Restore "Temporary"
12. Verify tag back in list and quick-add

---

## Part 12: Future Enhancements (Not in Scope)

1. **Day Plans** - Pre-market emotional state logging
2. **Tag Templates** - Import community-shared tag sets
3. **AI Tag Suggestions** - Analyze trade patterns, suggest tags
4. **Tag Goals** - "Reduce FOMO trades by 50%"
5. **Trade Replay** - Relive tagged trades with price action
6. **Mentor Sharing** - Share tagged trades for review
7. **Mobile Quick-Tag** - Tag trades on the go
8. **Tag Notifications** - Alert when entering trades in "danger" emotions

---

## Part 13: Technical Maintenance & Safeguards

The implementation of this system highlighted several critical technical requirements for long-term stability and developer vigilance.

### 13.1 Code Replacement Safety (Vigilance)
**🚨 CRITICAL:** When editing core logic files (like `SnapTradeService.ts`), NEVER use placeholders like `// ... logic` or `// (previous code)`.
- **Reason:** The `replace_file_content` tool performs a literal replacement. Using placeholders effectively deletes the omitted code, breaking critical features like trade deduplication or symbol parsing.
- **Safeguard:** Always provide the full, expanded code block for all functionality within the target range.

### 13.2 Position Key Consistency
All trades must be grouped into position segments using the centralized `TradeGroupingService`.
- **Mechanism:** The service uses a net-quantity tracker (including short positions and option expirations) to identify when a position is "Flat" (0 quantity).
- **Mandatory Hook:** Every trade ingestion path (Live Sync, Manual Data Import, etc.) MUST call `tradeGroupingService.recalculatePositionKeys(accountId, symbol)` immediately after saving trades.
- **Key Format:** Use the `v1` versioned key: `v1|accountId|symbol|openedAtTimestamp`.

### 13.3 Performance Architecture
As users accumulate thousands of trades, O(N²) operations will crash the browser/server.
- **Rule:** Never perform `.filter()` or `.find()` inside a loop over trades.
- **Solution:** Pre-group data into a `Map` or `Set` before the main processing loop.
- **Caching:** Cache `TagDefinition` lookups in UI components (see `tag-assignment.tsx`) to avoid redundant API calls.

### 13.4 Migration Discipline
Any change to the position-key format or tagging logic must be accompanied by a migration script (`scripts/migrate-*.ts`).
- **Policy:** Never leave orphaned tags. If logic changes, backfill ALL historical trade keys before declaring the feature "updated".

---

## Summary

This tagging system addresses the core problems traders face:

1. **Overwhelm** → Starter tags + categories
2. **Tedium** → Bulk operations + quick-add
3. **No insights** → Cost-per-mistake + analytics
4. **Generic emotions** → Specific emotional tags
5. **Abandoned journals** → Simple, fast, automated

The position-based approach (vs trade-based) simplifies the mental model and makes analysis more meaningful. The category system keeps tags organized as the collection grows.

**Final Status:** All implementation phases completed. System is robust and self-healing via recurring position key recalculation.
