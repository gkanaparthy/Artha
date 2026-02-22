import { DashboardView } from "@/components/views/dashboard-view";
import { DEMO_METRICS, DEMO_POSITIONS } from "@/lib/demo-data";
import { buildDemoMetricsWithR } from "@/lib/demo-r-multiple";
import type { DisplayPosition } from "@/types/trading";

const DEMO_METRICS_WITH_R = buildDemoMetricsWithR(DEMO_METRICS);

const toClosedPosition = (trade: (typeof DEMO_METRICS_WITH_R.closedTrades)[number]): DisplayPosition => {
  return {
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
    positionKey: trade.positionKey ?? null,
    rMultiple: trade.rMultiple ?? null,
    initialRiskUsd: trade.initialRiskUsd ?? null,
    allocatedRiskUsd: trade.allocatedRiskUsd ?? null,
    riskSource: trade.riskSource ?? null,
    tags: trade.tags,
  };
};

const toOpenPosition = (position: NonNullable<(typeof DEMO_METRICS_WITH_R.openPositions)>[number]): DisplayPosition => ({
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
  positionKey: position.positionKey ?? null,
  tags: position.tags,
});

const getClosedPositionKey = (position: Pick<DisplayPosition, "accountId" | "symbol" | "openedAt" | "closedAt">) =>
  `closed|${position.accountId}|${position.symbol}|${position.openedAt}|${position.closedAt ?? ""}`;

const enrichedClosedPositions = DEMO_METRICS_WITH_R.closedTrades.map(toClosedPosition);
const enrichedClosedByKey = new Map(
  enrichedClosedPositions.map((position) => [getClosedPositionKey(position), position])
);

const demoBasePositions = DEMO_POSITIONS.map((position) => {
  if (position.status !== "closed") return position;
  const enriched = enrichedClosedByKey.get(getClosedPositionKey(position));
  if (!enriched) return position;

  return {
    ...position,
    rMultiple: enriched.rMultiple,
    initialRiskUsd: enriched.initialRiskUsd,
    allocatedRiskUsd: enriched.allocatedRiskUsd,
    riskSource: enriched.riskSource,
  };
});

const mergedClosedPositions = (() => {
  const existing = new Set(
    demoBasePositions.filter((p) => p.status === "closed").map(getClosedPositionKey)
  );
  return enrichedClosedPositions
    .filter((position) => !existing.has(getClosedPositionKey(position)));
})();

const mergedOpenPositions = (() => {
  const existing = new Set(
    demoBasePositions.filter((p) => p.status === "open" && p.tradeId).map((p) => p.tradeId)
  );
  return (DEMO_METRICS_WITH_R.openPositions ?? [])
    .map(toOpenPosition)
    .filter((position) => !position.tradeId || !existing.has(position.tradeId));
})();

const DEMO_DASHBOARD_POSITIONS: DisplayPosition[] = [
  ...demoBasePositions,
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
        initialMetrics={DEMO_METRICS_WITH_R}
        initialPositions={DEMO_DASHBOARD_POSITIONS}
        isDemo={true}
      />
    </>
  );
}
