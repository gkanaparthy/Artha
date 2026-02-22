import { DashboardView } from "@/components/views/dashboard-view";
import { DEMO_METRICS, DEMO_POSITIONS } from "@/lib/demo-data";
import type { DisplayPosition } from "@/types/trading";

const toClosedPosition = (trade: (typeof DEMO_METRICS.closedTrades)[number]): DisplayPosition => ({
  symbol: trade.symbol,
  quantity: trade.quantity,
  entryPrice: trade.entryPrice,
  exitPrice: trade.exitPrice,
  pnl: trade.pnl,
  openedAt: trade.openedAt,
  closedAt: trade.closedAt,
  broker: trade.broker,
  accountId: trade.accountId,
  status: "closed",
  type: trade.type,
  side: trade.side,
  contractMultiplier: trade.contractMultiplier,
  optionType: trade.optionType,
  strikePrice: trade.strikePrice,
  expiryDate: trade.expiryDate,
  tags: trade.tags,
});

const toOpenPosition = (position: NonNullable<(typeof DEMO_METRICS.openPositions)>[number]): DisplayPosition => ({
  symbol: position.symbol,
  quantity: position.quantity,
  entryPrice: position.entryPrice,
  exitPrice: null,
  pnl: null,
  openedAt: position.openedAt,
  closedAt: null,
  broker: position.broker,
  accountId: position.accountId,
  status: "open",
  tradeId: position.tradeId,
  type: position.type,
  side: position.side,
  contractMultiplier: position.contractMultiplier,
  optionType: position.optionType,
  strikePrice: position.strikePrice,
  expiryDate: position.expiryDate,
  tags: position.tags,
});

const getClosedPositionKey = (position: DisplayPosition) =>
  `${position.status}|${position.accountId}|${position.symbol}|${position.openedAt}|${position.closedAt ?? ""}`;

const mergedClosedPositions = (() => {
  const existing = new Set(
    DEMO_POSITIONS.filter((p) => p.status === "closed").map(getClosedPositionKey)
  );
  return DEMO_METRICS.closedTrades
    .map(toClosedPosition)
    .filter((position) => !existing.has(getClosedPositionKey(position)));
})();

const mergedOpenPositions = (() => {
  const existing = new Set(
    DEMO_POSITIONS.filter((p) => p.status === "open" && p.tradeId).map((p) => p.tradeId)
  );
  return (DEMO_METRICS.openPositions ?? [])
    .map(toOpenPosition)
    .filter((position) => !position.tradeId || !existing.has(position.tradeId));
})();

const DEMO_DASHBOARD_POSITIONS: DisplayPosition[] = [
  ...DEMO_POSITIONS,
  ...mergedClosedPositions,
  ...mergedOpenPositions,
];

export default function DemoDashboardPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Artha Demo - Trading Journal Preview",
            "description": "Explore the Artha trading journal with sample data. See how your trades are tracked and analyzed.",
            "publisher": {
              "@type": "Organization",
              "name": "Artha"
            }
          })
        }}
      />
      <DashboardView
        initialMetrics={DEMO_METRICS}
        initialPositions={DEMO_DASHBOARD_POSITIONS}
        isDemo={true}
      />
    </>
  );
}
