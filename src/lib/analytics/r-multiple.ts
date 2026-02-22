import type { ClosedTrade } from '@/types/trading';

export type RiskSource = 'MANUAL' | 'TRADE_GROUP' | 'AUTO_PREMIUM' | null;

type TradeForRisk = Pick<
  ClosedTrade,
  'type' | 'side' | 'entryPrice' | 'quantity' | 'multiplier' | 'positionKey' | 'pnl'
>;

export interface TradeRiskComputation {
  initialRiskUsd: number | null;
  allocatedRiskUsd: number | null;
  rMultiple: number | null;
  riskSource: RiskSource;
}

const KNOWN_FUTURES_MULTIPLIERS: Record<string, number> = {
  ES: 50,
  MES: 5,
  NQ: 20,
  MNQ: 2,
  CL: 1000,
  MCL: 100,
  GC: 100,
  MGC: 10,
  SI: 5000,
  HG: 25000,
};

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase().replace(/^\/+/, '');
}

function getKnownFuturesRoot(symbol: string): string | null {
  const trimmed = normalizeSymbol(symbol);
  const candidates = Object.keys(KNOWN_FUTURES_MULTIPLIERS).sort((a, b) => b.length - a.length);
  for (const root of candidates) {
    if (trimmed.startsWith(root)) return root;
  }
  return null;
}

function looksLikeFuturesContractSymbol(symbol: string, root: string): boolean {
  const trimmed = normalizeSymbol(symbol);
  if (!trimmed.startsWith(root)) return false;

  const suffix = trimmed.slice(root.length);
  if (!suffix) return true;

  // Futures examples:
  // ESM4, ESU24, NQH2026, CLM26.NYM
  return /^[FGHJKMNQUVXZ]\d{1,4}(?:[._-][A-Z0-9]+)?$/.test(suffix);
}

export function getFuturesMultiplierWarning(trade: {
  symbol: string;
  type: string;
  multiplier?: number | null;
}): string | null {
  const root = getKnownFuturesRoot(trade.symbol);
  if (!root) return null;

  const expected = KNOWN_FUTURES_MULTIPLIERS[root];
  if (!expected) return null;

  const normalizedType = trade.type.trim().toUpperCase();
  const isFuturesType = normalizedType === 'FUTURES' || normalizedType === 'FUTURE';

  // Only infer from symbol pattern when type is not explicitly FUTURES.
  if (!isFuturesType && !looksLikeFuturesContractSymbol(trade.symbol, root)) {
    return null;
  }

  const multiplier = trade.multiplier ?? 1;

  if (multiplier === 1 && expected > 1) {
    return `Multiplier looks incorrect for ${root} (expected ${expected}, got 1). R calculations may be inaccurate.`;
  }
  return null;
}

export function isLongOptionTrade(trade: Pick<ClosedTrade, 'type' | 'side'>): boolean {
  return trade.type === 'OPTION' && trade.side === 'long';
}

export function buildPositionClosedUnits(
  allClosedTrades: TradeForRisk[],
  positionRiskMap: Map<string, number>
): Map<string, number> {
  const positionUnits = new Map<string, number>();

  for (const trade of allClosedTrades) {
    if (!trade.positionKey) continue;
    if (!positionRiskMap.has(trade.positionKey)) continue;

    const multiplier = trade.multiplier ?? 1;
    const units = Math.abs(trade.quantity * multiplier);
    if (units <= 0) continue;

    positionUnits.set(
      trade.positionKey,
      (positionUnits.get(trade.positionKey) || 0) + units
    );
  }

  return positionUnits;
}

export function computeTradeRisk(
  trade: TradeForRisk,
  positionRiskMap: Map<string, number>,
  positionUnits: Map<string, number>,
  tradeGroupRiskMap: Map<string, number> = new Map()
): TradeRiskComputation {
  const resolvePlannedRisk = (): { riskUsd: number; source: Exclude<RiskSource, null> } | null => {
    if (trade.positionKey && positionRiskMap.has(trade.positionKey)) {
      const risk = positionRiskMap.get(trade.positionKey) ?? 0;
      if (risk > 0) return { riskUsd: risk, source: 'MANUAL' };
    }
    if (trade.positionKey && tradeGroupRiskMap.has(trade.positionKey)) {
      const risk = tradeGroupRiskMap.get(trade.positionKey) ?? 0;
      if (risk > 0) return { riskUsd: risk, source: 'TRADE_GROUP' };
    }
    return null;
  };

  const plannedRisk = resolvePlannedRisk();
  if (plannedRisk && trade.positionKey) {
    const initialRiskUsd = plannedRisk.riskUsd;
    const multiplier = trade.multiplier ?? 1;
    const tradeUnits = Math.abs(trade.quantity * multiplier);
    const totalUnits = positionUnits.get(trade.positionKey) || 0;
    const allocatedRiskUsd =
      totalUnits > 0 ? initialRiskUsd * (tradeUnits / totalUnits) : initialRiskUsd;
    const rMultiple = allocatedRiskUsd > 0 ? trade.pnl / allocatedRiskUsd : null;

    return {
      initialRiskUsd,
      allocatedRiskUsd,
      rMultiple,
      riskSource: plannedRisk.source,
    };
  }

  if (isLongOptionTrade(trade)) {
    const inferredRiskUsd = Math.abs(trade.entryPrice * trade.quantity * (trade.multiplier ?? 1));
    if (inferredRiskUsd > 0) {
      return {
        initialRiskUsd: inferredRiskUsd,
        allocatedRiskUsd: inferredRiskUsd,
        rMultiple: trade.pnl / inferredRiskUsd,
        riskSource: 'AUTO_PREMIUM',
      };
    }
  }

  return {
    initialRiskUsd: null,
    allocatedRiskUsd: null,
    rMultiple: null,
    riskSource: null,
  };
}
