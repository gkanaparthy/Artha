/**
 * Strategy Detection Service
 *
 * Automatically detects multi-leg options strategies from ungrouped trades.
 * Phase 1: Only detects vertical spreads (2-leg strategies).
 */

import { prisma } from '@/lib/prisma';
import {
  StrategyType,
  StrategyCandidate,
  determineLegType,
  parseUnderlyingSymbol,
} from '@/types/strategy';
import { calculateVerticalSpreadPnL } from './strategy-pnl.service';

// Time window for grouping trades (5 minutes)
const GROUPING_WINDOW_MS = 5 * 60 * 1000;

// Minimum confidence threshold for auto-detection
const MIN_CONFIDENCE = 0.5;

interface TradeForDetection {
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
}

/**
 * Detect and create strategy groups for a user's ungrouped option trades
 */
export async function detectStrategies(userId: string): Promise<{
  detected: number;
  strategies: Array<{
    id: string;
    strategyType: StrategyType;
    underlyingSymbol: string;
    confidence: number;
    legCount: number;
  }>;
}> {
  // 1. Fetch all ungrouped option trades for the user
  const ungroupedTrades = await getUngroupedOptionTrades(userId);

  if (ungroupedTrades.length < 2) {
    return { detected: 0, strategies: [] };
  }

  // 2. Group by account (strategies must be in same account)
  const byAccount = groupByAccount(ungroupedTrades);

  // 3. Detect strategy candidates
  const candidates: StrategyCandidate[] = [];

  for (const [, accountTrades] of byAccount) {
    // Group by underlying symbol
    const byUnderlying = groupByUnderlying(accountTrades);

    for (const [, symbolTrades] of byUnderlying) {
      // Group by time window
      const timeGroups = groupByTimeWindow(symbolTrades);

      for (const group of timeGroups) {
        // Try to detect vertical spread pattern
        const candidate = detectVerticalSpread(group);
        if (candidate && candidate.confidence >= MIN_CONFIDENCE) {
          candidates.push(candidate);
        }
      }
    }
  }

  if (candidates.length === 0) {
    return { detected: 0, strategies: [] };
  }

  // 4. Create strategy groups in database
  const createdStrategies: Array<{
    id: string;
    strategyType: StrategyType;
    underlyingSymbol: string;
    confidence: number;
    legCount: number;
  }> = [];

  for (const candidate of candidates) {
    try {
      const strategy = await createStrategyFromCandidate(userId, candidate);
      createdStrategies.push({
        id: strategy.id,
        strategyType: candidate.strategyType,
        underlyingSymbol: candidate.underlyingSymbol,
        confidence: candidate.confidence,
        legCount: candidate.trades.length,
      });
    } catch (error) {
      console.error('Failed to create strategy:', error);
      // Continue with other candidates
    }
  }

  return {
    detected: createdStrategies.length,
    strategies: createdStrategies,
  };
}

/**
 * Fetch option trades that are not part of any strategy group
 */
async function getUngroupedOptionTrades(userId: string): Promise<TradeForDetection[]> {
  const trades = await prisma.trade.findMany({
    where: {
      account: { userId },
      type: 'OPTION',
      // Exclude trades that are already in a group
      groupLegs: { none: {} },
    },
    select: {
      id: true,
      symbol: true,
      type: true,
      optionType: true,
      strikePrice: true,
      expiryDate: true,
      optionAction: true,
      action: true,
      quantity: true,
      price: true,
      timestamp: true,
      accountId: true,
      contractMultiplier: true,
    },
    orderBy: { timestamp: 'asc' },
  });

  return trades as TradeForDetection[];
}

/**
 * Group trades by brokerage account
 */
function groupByAccount(trades: TradeForDetection[]): Map<string, TradeForDetection[]> {
  const byAccount = new Map<string, TradeForDetection[]>();

  for (const trade of trades) {
    const existing = byAccount.get(trade.accountId) || [];
    existing.push(trade);
    byAccount.set(trade.accountId, existing);
  }

  return byAccount;
}

/**
 * Group trades by underlying symbol
 */
function groupByUnderlying(trades: TradeForDetection[]): Map<string, TradeForDetection[]> {
  const byUnderlying = new Map<string, TradeForDetection[]>();

  for (const trade of trades) {
    const underlying = parseUnderlyingSymbol(trade.symbol);
    const existing = byUnderlying.get(underlying) || [];
    existing.push(trade);
    byUnderlying.set(underlying, existing);
  }

  return byUnderlying;
}

/**
 * Group trades by time window (trades executed close together)
 */
function groupByTimeWindow(trades: TradeForDetection[]): TradeForDetection[][] {
  const sorted = [...trades].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const groups: TradeForDetection[][] = [];
  let currentGroup: TradeForDetection[] = [];

  for (const trade of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(trade);
    } else {
      const lastTime = currentGroup[currentGroup.length - 1].timestamp.getTime();
      const currentTime = trade.timestamp.getTime();

      if (currentTime - lastTime <= GROUPING_WINDOW_MS) {
        currentGroup.push(trade);
      } else {
        if (currentGroup.length >= 2) {
          groups.push(currentGroup);
        }
        currentGroup = [trade];
      }
    }
  }

  if (currentGroup.length >= 2) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Detect vertical spread pattern from a group of trades
 */
function detectVerticalSpread(trades: TradeForDetection[]): StrategyCandidate | null {
  // Vertical spread requires exactly 2 legs
  if (trades.length !== 2) {
    return null;
  }

  const [leg1, leg2] = trades;

  // Both must be options
  if (leg1.type !== 'OPTION' || leg2.type !== 'OPTION') {
    return null;
  }

  // Both must be same option type (both calls or both puts)
  if (leg1.optionType !== leg2.optionType) {
    return null;
  }

  // Must have same expiration date
  if (!sameExpiration(leg1, leg2)) {
    return null;
  }

  // Must have different strike prices
  if (leg1.strikePrice === leg2.strikePrice) {
    return null;
  }

  // One must be a buy, one must be a sell
  const leg1IsBuy = isBuyAction(leg1);
  const leg2IsBuy = isBuyAction(leg2);

  if (leg1IsBuy === leg2IsBuy) {
    return null;
  }

  // Determine spread type (leg2IsBuy is the inverse of leg1IsBuy at this point)
  const strategyType = determineSpreadType(leg1, leg2, leg1IsBuy);
  if (!strategyType) {
    return null;
  }

  // Calculate confidence score
  const confidence = calculateConfidence(leg1, leg2);

  // Parse underlying symbol
  const underlyingSymbol = parseUnderlyingSymbol(leg1.symbol);

  return {
    trades: [leg1, leg2],
    strategyType,
    confidence,
    underlyingSymbol,
    expirationDate: leg1.expiryDate,
  };
}

/**
 * Check if two trades have the same expiration date
 */
function sameExpiration(leg1: TradeForDetection, leg2: TradeForDetection): boolean {
  if (!leg1.expiryDate || !leg2.expiryDate) {
    return false;
  }

  // Compare dates (ignoring time)
  const date1 = new Date(leg1.expiryDate).toDateString();
  const date2 = new Date(leg2.expiryDate).toDateString();

  return date1 === date2;
}

/**
 * Check if a trade is a buy action
 */
function isBuyAction(trade: TradeForDetection): boolean {
  const action = trade.optionAction || trade.action;
  return action.toUpperCase().includes('BUY');
}

/**
 * Determine the specific type of vertical spread
 */
function determineSpreadType(
  leg1: TradeForDetection,
  leg2: TradeForDetection,
  leg1IsBuy: boolean
): StrategyType | null {
  const isCall = leg1.optionType === 'CALL';

  // Determine which leg is the long (bought) and which is short (sold)
  // Note: leg2IsBuy is the inverse of leg1IsBuy in a valid vertical spread
  const longLeg = leg1IsBuy ? leg1 : leg2;
  const shortLeg = leg1IsBuy ? leg2 : leg1;

  // Ensure both have strike prices
  if (longLeg.strikePrice === null || shortLeg.strikePrice === null) {
    return null;
  }

  const longStrike = longLeg.strikePrice;
  const shortStrike = shortLeg.strikePrice;

  if (isCall) {
    // Call spreads
    if (longStrike < shortStrike) {
      // Buy lower strike, sell higher strike = Bull Call Spread (debit)
      return StrategyType.VERTICAL_SPREAD_BULL_CALL;
    } else {
      // Sell lower strike, buy higher strike = Bear Call Spread (credit)
      return StrategyType.VERTICAL_SPREAD_BEAR_CALL;
    }
  } else {
    // Put spreads
    if (longStrike > shortStrike) {
      // Buy higher strike, sell lower strike = Bear Put Spread (debit)
      return StrategyType.VERTICAL_SPREAD_BEAR_PUT;
    } else {
      // Sell higher strike, buy lower strike = Bull Put Spread (credit)
      return StrategyType.VERTICAL_SPREAD_BULL_PUT;
    }
  }
}

/**
 * Calculate confidence score for the detection
 */
function calculateConfidence(leg1: TradeForDetection, leg2: TradeForDetection): number {
  let confidence = 0;

  // Exact quantity match: +0.3
  if (Math.abs(leg1.quantity) === Math.abs(leg2.quantity)) {
    confidence += 0.3;
  }

  // Same expiration (already checked, but contributes to confidence): +0.3
  if (sameExpiration(leg1, leg2)) {
    confidence += 0.3;
  }

  // Time window - closer trades get higher confidence
  const timeDiff = Math.abs(leg1.timestamp.getTime() - leg2.timestamp.getTime());
  if (timeDiff < 60 * 1000) {
    // Less than 1 minute
    confidence += 0.2;
  } else if (timeDiff < 5 * 60 * 1000) {
    // Less than 5 minutes
    confidence += 0.1;
  }

  // Standard lot sizes (1, 5, 10): +0.2
  const qty1 = Math.abs(leg1.quantity);
  const qty2 = Math.abs(leg2.quantity);
  if ([1, 5, 10].includes(qty1) && [1, 5, 10].includes(qty2)) {
    confidence += 0.2;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Create a strategy group from a detected candidate
 */
async function createStrategyFromCandidate(
  userId: string,
  candidate: StrategyCandidate
): Promise<{ id: string }> {
  const trades = candidate.trades;
  const accountId = trades[0].accountId;

  // Calculate net premium
  let netPremium = 0;
  for (const trade of trades) {
    const isBuy = isBuyAction(trade);
    const multiplier = trade.contractMultiplier || 100;
    const cost = trade.price * Math.abs(trade.quantity) * multiplier;
    netPremium += isBuy ? -cost : cost;
  }

  // Calculate max profit/loss for vertical spreads
  const legs = trades.map((trade) => ({
    strikePrice: trade.strikePrice,
    quantity: Math.abs(trade.quantity),
  }));
  const pnl = calculateVerticalSpreadPnL(candidate.strategyType, legs, netPremium);

  // Create strategy group with legs
  const strategy = await prisma.$transaction(async (tx) => {
    const group = await tx.tradeGroup.create({
      data: {
        userId,
        name: null, // Auto-detected strategies don't have names
        strategyType: candidate.strategyType,
        underlyingSymbol: candidate.underlyingSymbol,
        accountId,
        openedAt: trades[0].timestamp,
        expirationDate: candidate.expirationDate,
        netPremium: Math.round(netPremium * 100) / 100,
        realizedPnL: 0, // Newly created strategies have no realized P&L
        maxProfit: pnl?.maxProfit ?? null,
        maxLoss: pnl?.maxLoss ?? null,
        autoDetected: true,
        confidence: candidate.confidence,
      },
    });

    // Create legs
    await Promise.all(
      trades.map((trade, index) => {
        const legType = determineLegType(trade.optionType, trade.optionAction, trade.action);
        return tx.tradeGroupLeg.create({
          data: {
            groupId: group.id,
            tradeId: trade.id,
            legNumber: index + 1,
            legType,
            strikePrice: trade.strikePrice,
            expirationDate: trade.expiryDate,
            quantity: Math.abs(trade.quantity),
            entryPrice: trade.price,
            exitPrice: null,
          },
        });
      })
    );

    return group;
  });

  return { id: strategy.id };
}
