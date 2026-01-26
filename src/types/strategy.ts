// Types for multi-leg options strategy grouping

export const StrategyType = {
  VERTICAL_SPREAD_BULL_CALL: 'VERTICAL_SPREAD_BULL_CALL',
  VERTICAL_SPREAD_BEAR_CALL: 'VERTICAL_SPREAD_BEAR_CALL',
  VERTICAL_SPREAD_BULL_PUT: 'VERTICAL_SPREAD_BULL_PUT',
  VERTICAL_SPREAD_BEAR_PUT: 'VERTICAL_SPREAD_BEAR_PUT',
  IRON_CONDOR: 'IRON_CONDOR',
  IRON_BUTTERFLY: 'IRON_BUTTERFLY',
  STRADDLE: 'STRADDLE',
  STRANGLE: 'STRANGLE',
  COVERED_CALL: 'COVERED_CALL',
  PROTECTIVE_PUT: 'PROTECTIVE_PUT',
  CUSTOM: 'CUSTOM',
} as const;

export type StrategyType = (typeof StrategyType)[keyof typeof StrategyType];

// Human-readable labels for strategy types
export const STRATEGY_LABELS: Record<StrategyType, string> = {
  VERTICAL_SPREAD_BULL_CALL: 'Bull Call Spread',
  VERTICAL_SPREAD_BEAR_CALL: 'Bear Call Spread',
  VERTICAL_SPREAD_BULL_PUT: 'Bull Put Spread',
  VERTICAL_SPREAD_BEAR_PUT: 'Bear Put Spread',
  IRON_CONDOR: 'Iron Condor',
  IRON_BUTTERFLY: 'Iron Butterfly',
  STRADDLE: 'Straddle',
  STRANGLE: 'Strangle',
  COVERED_CALL: 'Covered Call',
  PROTECTIVE_PUT: 'Protective Put',
  CUSTOM: 'Custom Strategy',
};

// Short labels for badges
export const STRATEGY_SHORT_LABELS: Record<StrategyType, string> = {
  VERTICAL_SPREAD_BULL_CALL: 'Bull Call',
  VERTICAL_SPREAD_BEAR_CALL: 'Bear Call',
  VERTICAL_SPREAD_BULL_PUT: 'Bull Put',
  VERTICAL_SPREAD_BEAR_PUT: 'Bear Put',
  IRON_CONDOR: 'Iron Condor',
  IRON_BUTTERFLY: 'Butterfly',
  STRADDLE: 'Straddle',
  STRANGLE: 'Strangle',
  COVERED_CALL: 'Covered Call',
  PROTECTIVE_PUT: 'Protective Put',
  CUSTOM: 'Custom',
};

// Color coding for strategy types (for UI badges)
export const STRATEGY_COLORS: Record<StrategyType, { bg: string; text: string; border: string }> = {
  VERTICAL_SPREAD_BULL_CALL: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  VERTICAL_SPREAD_BEAR_CALL: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  VERTICAL_SPREAD_BULL_PUT: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  VERTICAL_SPREAD_BEAR_PUT: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  IRON_CONDOR: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  IRON_BUTTERFLY: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  STRADDLE: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  STRANGLE: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  COVERED_CALL: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  PROTECTIVE_PUT: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  CUSTOM: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
};

// Leg type identifiers
export type LegType =
  | 'LONG_CALL'
  | 'SHORT_CALL'
  | 'LONG_PUT'
  | 'SHORT_PUT'
  | 'LONG_STOCK'
  | 'SHORT_STOCK';

// Individual leg within a strategy
export interface StrategyLeg {
  id: string;
  legNumber: number;
  legType: LegType;
  strikePrice: number | null;
  expirationDate: string | null;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  trade: {
    id: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    timestamp: string;
    type: string;
    optionType: string | null;
    optionAction: string | null;
  };
}

// Strategy without legs (for list views)
export interface Strategy {
  id: string;
  name: string | null;
  strategyType: StrategyType;
  underlyingSymbol: string;
  accountId: string;
  openedAt: string;
  closedAt: string | null;
  expirationDate: string | null;
  netPremium: number;
  realizedPnL: number;
  maxProfit: number | null;
  maxLoss: number | null;
  autoDetected: boolean;
  confidence: number | null;
  status: 'open' | 'closed';
  legCount: number;
  broker: string;
}

// Full strategy with legs (for detail views)
export interface StrategyWithLegs extends Omit<Strategy, 'legCount'> {
  legs: StrategyLeg[];
}

// API request types
export interface CreateStrategyRequest {
  name?: string;
  strategyType: StrategyType;
  tradeIds: string[];
}

export interface UpdateStrategyRequest {
  name?: string;
  strategyType?: StrategyType;
}

// API response types
export interface StrategiesListResponse {
  strategies: Strategy[];
  total: number;
}

export type StrategyDetailResponse = StrategyWithLegs;

export interface DetectStrategiesResponse {
  detected: number;
  strategies: Array<{
    id: string;
    strategyType: StrategyType;
    underlyingSymbol: string;
    confidence: number;
    legCount: number;
  }>;
}

// Detection candidate (internal use)
export interface StrategyCandidate {
  trades: Array<{
    id: string;
    symbol: string;
    type: string;
    optionType: string | null;
    strikePrice: number | null;
    expiryDate: Date | null;
    optionAction: string | null;
    action: string;
    quantity: number;
    price: number;
    timestamp: Date;
    accountId: string;
    contractMultiplier: number;
  }>;
  strategyType: StrategyType;
  confidence: number;
  underlyingSymbol: string;
  expirationDate: Date | null;
}

// Helper function to determine if a strategy type is a vertical spread
export function isVerticalSpread(type: StrategyType): boolean {
  return type.startsWith('VERTICAL_SPREAD_');
}

// Helper function to determine strategy direction (bullish/bearish/neutral)
export function getStrategyDirection(type: StrategyType): 'bullish' | 'bearish' | 'neutral' {
  switch (type) {
    case 'VERTICAL_SPREAD_BULL_CALL':
    case 'VERTICAL_SPREAD_BULL_PUT':
    case 'COVERED_CALL':
      return 'bullish';
    case 'VERTICAL_SPREAD_BEAR_CALL':
    case 'VERTICAL_SPREAD_BEAR_PUT':
    case 'PROTECTIVE_PUT':
      return 'bearish';
    case 'IRON_CONDOR':
    case 'IRON_BUTTERFLY':
    case 'STRADDLE':
    case 'STRANGLE':
    case 'CUSTOM':
    default:
      return 'neutral';
  }
}

// Helper to parse underlying symbol from OCC option symbol
// Format: SYMBOL + YYMMDD + C/P + Strike (8 digits)
// Example: "AAPL  240119C00150000" -> "AAPL"
export function parseUnderlyingSymbol(occSymbol: string): string {
  // Remove leading/trailing whitespace
  const trimmed = occSymbol.trim();

  // Try to match OCC format: letters followed by spaces and date
  const match = trimmed.match(/^([A-Z]+)/);
  if (match) {
    return match[1];
  }

  // Fallback: return as-is (might be a stock symbol)
  return trimmed;
}

// Helper to determine leg type from trade action
export function determineLegType(
  optionType: string | null,
  optionAction: string | null,
  action: string
): LegType {
  const isBuy = action === 'BUY' || optionAction?.includes('BUY');

  if (!optionType) {
    // Stock
    return isBuy ? 'LONG_STOCK' : 'SHORT_STOCK';
  }

  if (optionType === 'CALL') {
    return isBuy ? 'LONG_CALL' : 'SHORT_CALL';
  }

  // PUT
  return isBuy ? 'LONG_PUT' : 'SHORT_PUT';
}
