// Shared trading types used across the application

export interface ClosedPosition {
  symbol: string;
  pnl: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  closedAt: string;
  openedAt: string;
  broker: string;
  accountId: string;
  type: string;
  tags?: { id: string; name: string; color: string; category: string; icon: string | null }[];
}

export interface OpenPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  openedAt: string;
  broker: string;
  accountId: string;
  currentValue: number;
  tradeId: string;
  type: string;
  tags?: { id: string; name: string; color: string; category: string; icon: string | null }[];
}

export interface DisplayPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  openedAt: string;
  closedAt: string | null;
  broker: string;
  accountId: string;
  status: "open" | "closed";
  tradeId?: string;
  type: string;
  // Live data from broker (for open positions)
  livePrice?: number | null;
  unrealizedPnl?: number | null;
  marketValue?: number | null;
  tags?: { id: string; name: string; color: string; category: string; icon: string | null }[];
}

export interface Trade {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  timestamp: string;
  type: string;
  fees: number;
  accountId: string;
  positionKey: string | null;
  account: {
    brokerName: string | null;
  };
  tags: { id: string; name: string; color: string; category: string; icon: string | null }[];
}

export interface Metrics {
  netPnL: number;
  winRate: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
  avgWinPct: number;
  avgLossPct: number;
  profitFactor: number | null;
  winningTrades: number;
  losingTrades: number;
  largestWin: number;
  largestLoss: number;
  avgTrade: number;
  openPositionsCount: number;
  closedTrades: ClosedPosition[];
  openPositions?: OpenPosition[];
  cumulativePnL?: { date: string; pnl: number; cumulative: number; symbol: string }[];
  monthlyData?: { month: string; pnl: number }[];
  symbolData?: { symbol: string; pnl: number; trades: number; winRate: number }[];
}

export interface TradeInput {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  timestamp: Date;
  fees: number;
  accountId: string;
  account?: { brokerName: string | null };
  type?: string;
  universalSymbolId?: string | null;
  optionType?: string | null;
  strikePrice?: number | null;
  expiryDate?: Date | null;
  contractMultiplier?: number;
  snapTradeTradeId?: string | null;
  positionKey?: string | null;
}

export interface Lot {
  tradeId: string;
  date: Date;
  price: number;
  quantity: number;
  broker: string;
  accountId: string;
  originalQuantity: number;
  multiplier: number;
  type: string;
  positionKey: string | null;
}

export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  symbol?: string;
  accountId?: string;
  assetType?: string;
  tagIds?: string[];
  tagFilterMode?: 'any' | 'all';
}

// These are "Calculated" types used in backend logic (Date objects)
// The existing export interface ClosedPosition (lines 3-15) uses string dates for frontend JSON
// We will define a separate helper type or just ignore the mismatch if we map at the end.
// Actually, `src/lib/analytics/fifo.ts` uses internal types. 
// Let's export them here as "ClosedTrade" matching `metrics/route.ts` original logic
export interface ClosedTrade {
  symbol: string;
  pnl: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  closedAt: Date;
  openedAt: Date;
  broker: string;
  accountId: string;
  type: string;
  multiplier: number;
  tags?: { id: string; name: string; color: string; category: string; icon: string | null }[];
}

// Rename the frontend one to ClosedPositionJSON or similar? 
// Or just reuse OpenPosition but change Date -> Date | string?
// For now, let's keep the existing ones but maybe alias them or add the backend ones.

export interface OpenPositionInternal {
  symbol: string;
  quantity: number;
  entryPrice: number;
  openedAt: Date;
  broker: string;
  accountId: string;
  currentValue: number;
  tradeId: string;
  type: string;
  tags?: { id: string; name: string; color: string; category: string; icon: string | null }[];
}
