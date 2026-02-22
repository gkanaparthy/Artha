import type { ClosedPosition, Metrics } from '@/types/trading';

const DEMO_MANUAL_RISK_USD: Record<string, number> = {
  'NVDA|2026-01-05T10:30:00Z': 500,
  'AAPL|2026-01-08T09:35:00Z': 500,
  'MSFT|2026-01-10T10:00:00Z': 350,
  'TSLA|2026-01-16T13:15:00Z': 500,
  'META|2026-02-02T10:15:00Z': 450,
  'COIN|2026-03-04T09:30:00Z': 700,
};

type DemoClosedTrade = Metrics['closedTrades'][number];

const round2 = (value: number) => Math.round(value * 100) / 100;
const round1 = (value: number) => Math.round(value * 10) / 10;

function getDemoManualRiskUsd(trade: Pick<ClosedPosition, 'symbol' | 'openedAt'>): number | null {
  const key = `${trade.symbol}|${trade.openedAt}`;
  return DEMO_MANUAL_RISK_USD[key] ?? null;
}

function getDemoAutoOptionRiskUsd(
  trade: Pick<ClosedPosition, 'entryPrice' | 'quantity' | 'type' | 'side' | 'contractMultiplier'>
): number | null {
  if (!(trade.type === 'OPTION' && trade.side === 'long')) return null;
  const multiplier = trade.contractMultiplier ?? 100;
  const premiumRisk = Math.abs(trade.entryPrice * Math.abs(trade.quantity) * multiplier);
  return premiumRisk > 0 ? premiumRisk : null;
}

export function enrichDemoClosedTradeWithRisk(trade: DemoClosedTrade): DemoClosedTrade {
  const manualRisk = getDemoManualRiskUsd(trade);
  const autoOptionRisk = getDemoAutoOptionRiskUsd(trade);

  const initialRiskUsd = trade.initialRiskUsd ?? manualRisk ?? autoOptionRisk ?? null;
  const allocatedRiskUsd = trade.allocatedRiskUsd ?? initialRiskUsd;
  const rMultiple =
    trade.rMultiple ??
    (typeof allocatedRiskUsd === 'number' && allocatedRiskUsd > 0 ? trade.pnl / allocatedRiskUsd : null);

  const riskSource =
    trade.riskSource ??
    (trade.initialRiskUsd !== null && trade.initialRiskUsd !== undefined
      ? 'MANUAL'
      : manualRisk !== null
        ? 'MANUAL'
        : autoOptionRisk !== null
          ? 'AUTO_PREMIUM'
          : null);

  return {
    ...trade,
    initialRiskUsd,
    allocatedRiskUsd,
    rMultiple,
    riskSource,
  };
}

export function buildDemoMetricsWithR(metrics: Metrics): Metrics {
  const closedTrades = (metrics.closedTrades || []).map(enrichDemoClosedTradeWithRisk);
  const rTrades = closedTrades.flatMap((trade) =>
    typeof trade.rMultiple === 'number' && Number.isFinite(trade.rMultiple)
      ? [{ ...trade, rMultiple: trade.rMultiple }]
      : []
  );
  const winningRTrades = rTrades.filter((trade) => trade.rMultiple > 0);
  const losingRTrades = rTrades.filter((trade) => trade.rMultiple < 0);
  const netR = rTrades.reduce((sum, trade) => sum + trade.rMultiple, 0);
  const avgR = rTrades.length > 0 ? netR / rTrades.length : null;
  const avgWinR =
    winningRTrades.length > 0
      ? winningRTrades.reduce((sum, trade) => sum + trade.rMultiple, 0) / winningRTrades.length
      : null;
  const avgLossR =
    losingRTrades.length > 0
      ? losingRTrades.reduce((sum, trade) => sum + trade.rMultiple, 0) / losingRTrades.length
      : null;
  const maxR = rTrades.length > 0 ? Math.max(...rTrades.map((trade) => trade.rMultiple)) : null;
  const minR = rTrades.length > 0 ? Math.min(...rTrades.map((trade) => trade.rMultiple)) : null;
  const rCoverage = closedTrades.length > 0 ? (rTrades.length / closedTrades.length) * 100 : 0;

  const monthlyRMap = new Map<string, number>();
  for (const trade of rTrades) {
    const month = trade.closedAt.slice(0, 7);
    monthlyRMap.set(month, (monthlyRMap.get(month) || 0) + trade.rMultiple);
  }
  const monthlyR = Array.from(monthlyRMap.entries())
    .map(([month, r]) => ({ month, r: round2(r) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    ...metrics,
    closedTrades,
    netR: rTrades.length > 0 ? round2(netR) : null,
    avgR: avgR === null ? null : round2(avgR),
    avgWinR: avgWinR === null ? null : round2(avgWinR),
    avgLossR: avgLossR === null ? null : round2(avgLossR),
    maxR: maxR === null ? null : round2(maxR),
    minR: minR === null ? null : round2(minR),
    rCoverage: round1(rCoverage),
    rMultiple:
      rTrades.length > 0
        ? {
            coverage: round1(rCoverage),
            coveredTrades: rTrades.length,
            totalTrades: closedTrades.length,
            netR: round2(netR),
            avgR: avgR === null ? 0 : round2(avgR),
            avgWinR: avgWinR === null ? null : round2(avgWinR),
            avgLossR: avgLossR === null ? null : round2(avgLossR),
            maxR: maxR === null ? 0 : round2(maxR),
            minR: minR === null ? 0 : round2(minR),
            monthlyR,
          }
        : null,
  };
}
