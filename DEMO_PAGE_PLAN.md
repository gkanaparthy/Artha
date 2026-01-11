# Demo Page Implementation Plan (Expanded)

## Objective
Create a full-featured "Demo Mode" suite that includes Dashboard, Journal, and Reports pages. This allows visitors to interact with the entire application using simulated data without authentication.

## 1. Mock Data Specification
Create `src/lib/demo-data.ts` to export realistic datasets.

**Data Artifacts:**
1. `DEMO_METRICS` (Metrics object for Dashboard & Reports)
2. `DEMO_TRADES` (Array of Trade objects for Journal)
3. `DEMO_POSITIONS` (Array of DisplayPosition objects for Dashboard Table)

**Data Structure (Excerpt):**
```typescript
import { Metrics, Trade, DisplayPosition } from "@/types/trading";

export const DEMO_TRADES: Trade[] = [
    {
        id: "t-1",
        symbol: "NVDA",
        action: "BUY",
        quantity: 100,
        price: 450.00,
        timestamp: "2024-03-10T10:00:00Z",
        type: "STOCK",
        fees: 1.50,
        accountId: "demo-1",
        account: { brokerName: "Demo Broker" },
        tags: []
    },
    // ... 50+ trades spanning 3 months for charts
];

export const DEMO_METRICS: Metrics = {
    // ... populated aggregations based on DEMO_TRADES
    monthlyData: [
        { month: "2024-01", pnl: 4500.00 },
        { month: "2024-02", pnl: -1200.00 },
        { month: "2024-03", pnl: 9150.50 },
    ],
    cumulativePnL: [
        { date: "2024-01-01", pnl: 450, cumulative: 450, symbol: "NVDA" },
        // ... daily points
    ],
    // ... other metrics
};
```

## 2. Architecture: "View Pattern" Refactoring
To avoid code duplication between Real pages and Demo pages, we will extract the UI logic into reusable "View" components.

### Strategy
1. **Rename** `dashboard/page.tsx` logic -> `src/components/views/dashboard-view.tsx`
2. **Rename** `journal/page.tsx` logic -> `src/components/views/journal-view.tsx`
3. **Rename** `reports/page.tsx` logic -> `src/components/views/reports-view.tsx`

**Props Interface for Views:**
```typescript
interface ViewProps {
    initialData?: any; // Metrics used to bypass fetching
    isDemo?: boolean;  // To disable delete/sync actions
}
```

**Real Page (`app/(dashboard)/journal/page.tsx`):**
```tsx
export default function JournalPage() {
    // Fetches real data
    return <JournalView />;
}
```

**Demo Page (`app/demo/journal/page.tsx`):**
```tsx
import { DEMO_TRADES } from "@/lib/demo-data";
export default function DemoJournalPage() {
    // Passes mock data
    return <JournalView initialTrades={DEMO_TRADES} isDemo={true} />;
}
```

## 3. New Route Structure

### `/demo` (Dashboard)
- **Component**: `src/app/demo/page.tsx`
- **Logic**: Imports `DashboardView`, passes `DEMO_METRICS` & `DEMO_POSITIONS`.

### `/demo/journal`
- **Component**: `src/app/demo/journal/page.tsx`
- **Logic**: Imports `JournalView`, passes `DEMO_TRADES`.

### `/demo/reports`
- **Component**: `src/app/demo/reports/page.tsx`
- **Logic**: Imports `ReportsView`, passes `DEMO_METRICS`.

### `/demo/layout.tsx`
- Wraps all demo pages.
- Uses `<FilterProvider>`.
- Renders `<DemoSidebar>` (visual clone of AppSidebar).
  - Dashboard Link -> `/demo`
  - Journal Link -> `/demo/journal`
  - Reports Link -> `/demo/reports`
- Renders `<DemoHeader>` (visual clone of Header with "Guest User").

## 4. Component Updates needed

1. **`src/components/positions-table.tsx`**: Update to accept `initialData`.
2. **`src/navigation.tsx` (if exists)**: Ensure sidebar links are parameterizable or create `DemoSidebar`.
3. **`src/app/page.tsx`**: Add "Demo" link to Navbar.
4. **`src/middleware.ts`**: Allow `/demo*` routes public access.

## 5. Implementation Roadmap
1. **Data**: Create `src/lib/demo-data.ts` with rich JSON data.
2. **Refactor**: Extract `DashboardView`, `JournalView`, `ReportsView` components.
3. **Components**: Create `DemoSidebar`, `DemoHeader`.
4. **Pages**: Scaffold `src/app/demo` folder and pages.
5. **Config**: Update middleware and landing page.
6. **Verify**: Test navigation within Demo environment and ensure no "Unauthorized" errors.
