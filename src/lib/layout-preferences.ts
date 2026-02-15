export const DASHBOARD_PRIMARY_TILE_IDS = [
  'netPnl',
  'winRate',
  'largestWin',
  'largestLoss',
] as const;

export const DASHBOARD_SECONDARY_TILE_IDS = [
  'unrealizedPnl',
  'totalTrades',
  'avgWin',
  'avgLoss',
  'avgTrade',
] as const;

export const REPORTS_SUMMARY_TILE_IDS = [
  'netPnl',
  'winRate',
  'profitFactor',
  'riskReward',
] as const;

export const REPORTS_SECONDARY_TILE_IDS = [
  'maxWinStreak',
  'maxLossStreak',
  'maxDrawdown',
  'avgHolding',
] as const;

export interface LayoutPreferences {
  dashboardPrimaryOrder: string[];
  dashboardSecondaryOrder: string[];
  reportsSummaryOrder: string[];
  reportsSecondaryOrder: string[];
}

export const DEFAULT_LAYOUT_PREFERENCES: LayoutPreferences = {
  dashboardPrimaryOrder: [...DASHBOARD_PRIMARY_TILE_IDS],
  dashboardSecondaryOrder: [...DASHBOARD_SECONDARY_TILE_IDS],
  reportsSummaryOrder: [...REPORTS_SUMMARY_TILE_IDS],
  reportsSecondaryOrder: [...REPORTS_SECONDARY_TILE_IDS],
};

export function sanitizeOrder(input: unknown, allowed: readonly string[]): string[] {
  const raw = Array.isArray(input) ? input : [];
  const uniqueAllowed = Array.from(new Set(raw)).filter(
    (value): value is string => typeof value === 'string' && allowed.includes(value)
  );
  const missing = allowed.filter((id) => !uniqueAllowed.includes(id));
  return [...uniqueAllowed, ...missing];
}

export function sanitizeLayoutPreferences(input: unknown): LayoutPreferences {
  const prefs =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return {
    dashboardPrimaryOrder: sanitizeOrder(
      prefs.dashboardPrimaryOrder,
      DASHBOARD_PRIMARY_TILE_IDS
    ),
    dashboardSecondaryOrder: sanitizeOrder(
      prefs.dashboardSecondaryOrder,
      DASHBOARD_SECONDARY_TILE_IDS
    ),
    reportsSummaryOrder: sanitizeOrder(
      prefs.reportsSummaryOrder,
      REPORTS_SUMMARY_TILE_IDS
    ),
    reportsSecondaryOrder: sanitizeOrder(
      prefs.reportsSecondaryOrder,
      REPORTS_SECONDARY_TILE_IDS
    ),
  };
}

export function mergeLayoutPreferences(
  base: LayoutPreferences,
  patch: unknown
): LayoutPreferences {
  const updates =
    patch && typeof patch === 'object' && !Array.isArray(patch)
      ? (patch as Record<string, unknown>)
      : {};

  return {
    dashboardPrimaryOrder:
      updates.dashboardPrimaryOrder !== undefined
        ? sanitizeOrder(updates.dashboardPrimaryOrder, DASHBOARD_PRIMARY_TILE_IDS)
        : base.dashboardPrimaryOrder,
    dashboardSecondaryOrder:
      updates.dashboardSecondaryOrder !== undefined
        ? sanitizeOrder(updates.dashboardSecondaryOrder, DASHBOARD_SECONDARY_TILE_IDS)
        : base.dashboardSecondaryOrder,
    reportsSummaryOrder:
      updates.reportsSummaryOrder !== undefined
        ? sanitizeOrder(updates.reportsSummaryOrder, REPORTS_SUMMARY_TILE_IDS)
        : base.reportsSummaryOrder,
    reportsSecondaryOrder:
      updates.reportsSecondaryOrder !== undefined
        ? sanitizeOrder(updates.reportsSecondaryOrder, REPORTS_SECONDARY_TILE_IDS)
        : base.reportsSecondaryOrder,
  };
}

export function moveItemById(order: string[], draggedId: string, targetId: string): string[] {
  const fromIndex = order.indexOf(draggedId);
  const toIndex = order.indexOf(targetId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return order;

  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
