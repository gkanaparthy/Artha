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
  account: {
    brokerName: string | null;
  };
  tags: { id: string; name: string; color: string }[];
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
