/**
 * Strategy P&L Calculation Service
 *
 * Calculates realized P&L, max profit, and max loss for multi-leg options strategies.
 */

import { prisma } from '@/lib/prisma';
import { StrategyType, isVerticalSpread } from '@/types/strategy';

// P&L calculation result
export interface StrategyPnL {
  realizedPnL: number;
  maxProfit: number | null;
  maxLoss: number | null;
}

// Leg P&L breakdown
export interface LegPnL {
  legId: string;
  legType: string;
  entryValue: number;
  exitValue: number | null;
  realizedPnL: number;
  isOpen: boolean;
}

/**
 * Calculate realized P&L for a single leg
 * For options: (exitPrice - entryPrice) * quantity * 100 for longs
 *             (entryPrice - exitPrice) * quantity * 100 for shorts
 */
export function calculateLegRealizedPnL(
  leg: { legType: string; entryPrice: number; exitPrice: number | null; quantity: number },
  multiplier: number = 100
): number {
  if (leg.exitPrice === null || leg.exitPrice === undefined) {
    return 0; // Open position - no realized P&L
  }

  const isLong = leg.legType.includes('LONG');

  if (isLong) {
    // Long position: profit when exit > entry
    return (leg.exitPrice - leg.entryPrice) * leg.quantity * multiplier;
  } else {
    // Short position: profit when entry > exit
    return (leg.entryPrice - leg.exitPrice) * leg.quantity * multiplier;
  }
}

/**
 * Calculate total realized P&L for a strategy
 * Sum of all leg P&Ls
 */
export function calculateStrategyRealizedPnL(
  legs: Array<{ legType: string; entryPrice: number; exitPrice: number | null; quantity: number }>,
  multiplier: number = 100
): number {
  return legs.reduce((total, leg) => {
    return total + calculateLegRealizedPnL(leg, multiplier);
  }, 0);
}

/**
 * Calculate max profit and max loss for vertical spreads
 *
 * For debit spreads (Bull Call, Bear Put):
 *   Max Profit = Strike Width - Net Debit
 *   Max Loss = Net Debit
 *
 * For credit spreads (Bear Call, Bull Put):
 *   Max Profit = Net Credit
 *   Max Loss = Strike Width - Net Credit
 */
export function calculateVerticalSpreadPnL(
  strategyType: StrategyType,
  legs: Array<{ strikePrice: number | null; quantity: number }>,
  netPremium: number
): { maxProfit: number; maxLoss: number } | null {
  // Need exactly 2 legs with strike prices
  if (legs.length !== 2) return null;

  const [leg1, leg2] = legs;
  if (leg1.strikePrice === null || leg2.strikePrice === null) {
    return null;
  }

  // Get strike prices and calculate width
  const lowStrike = Math.min(leg1.strikePrice, leg2.strikePrice);
  const highStrike = Math.max(leg1.strikePrice, leg2.strikePrice);

  // Use minimum quantity for uneven legs
  const quantity = Math.min(Math.abs(leg1.quantity), Math.abs(leg2.quantity));

  // Strike width value (per spread)
  const strikeWidth = (highStrike - lowStrike) * quantity * 100;

  // Determine if debit or credit spread
  // netPremium > 0 means received credit, < 0 means paid debit
  const isDebitSpread =
    strategyType === StrategyType.VERTICAL_SPREAD_BULL_CALL ||
    strategyType === StrategyType.VERTICAL_SPREAD_BEAR_PUT;

  if (isDebitSpread) {
    // Debit spreads: paid premium upfront
    // netPremium should be negative (we paid)
    const netDebit = Math.abs(netPremium);
    return {
      maxProfit: strikeWidth - netDebit,
      maxLoss: netDebit,
    };
  } else {
    // Credit spreads: received premium upfront
    // netPremium should be positive (we received)
    const netCredit = Math.abs(netPremium);
    return {
      maxProfit: netCredit,
      maxLoss: strikeWidth - netCredit,
    };
  }
}

/**
 * Calculate all P&L metrics for a strategy
 */
export function calculateStrategyPnL(strategy: {
  strategyType: StrategyType;
  netPremium: number;
  legs: Array<{
    legType: string;
    strikePrice: number | null;
    quantity: number;
    entryPrice: number;
    exitPrice: number | null;
  }>;
}): StrategyPnL {
  // Calculate realized P&L from all legs
  const realizedPnL = calculateStrategyRealizedPnL(strategy.legs);

  // Calculate max profit/loss based on strategy type
  let maxProfit: number | null = null;
  let maxLoss: number | null = null;

  if (isVerticalSpread(strategy.strategyType)) {
    const pnl = calculateVerticalSpreadPnL(
      strategy.strategyType,
      strategy.legs,
      strategy.netPremium
    );
    if (pnl) {
      maxProfit = pnl.maxProfit;
      maxLoss = pnl.maxLoss;
    }
  }
  // For non-vertical spreads (Iron Condor, Straddle, etc.), max profit/loss
  // calculations are more complex and not implemented in this phase

  return {
    realizedPnL,
    maxProfit,
    maxLoss,
  };
}

/**
 * Get detailed P&L breakdown for each leg
 */
export function getLegPnLBreakdown(
  legs: Array<{
    id: string;
    legType: string;
    entryPrice: number;
    exitPrice: number | null;
    quantity: number;
  }>,
  multiplier: number = 100
): LegPnL[] {
  return legs.map((leg) => {
    const entryValue = leg.entryPrice * leg.quantity * multiplier;
    const exitValue =
      leg.exitPrice !== null ? leg.exitPrice * leg.quantity * multiplier : null;
    const realizedPnL = calculateLegRealizedPnL(leg, multiplier);

    return {
      legId: leg.id,
      legType: leg.legType,
      entryValue,
      exitValue,
      realizedPnL,
      isOpen: leg.exitPrice === null,
    };
  });
}

/**
 * Update P&L for a strategy in the database
 */
export async function updateStrategyPnL(
  strategyId: string,
  userId: string
): Promise<{ success: boolean; strategy?: StrategyPnL; error?: string }> {
  try {
    // Fetch strategy with legs
    const strategy = await prisma.tradeGroup.findFirst({
      where: {
        id: strategyId,
        userId,
      },
      include: {
        legs: true,
      },
    });

    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    // Calculate P&L
    const pnl = calculateStrategyPnL({
      strategyType: strategy.strategyType as StrategyType,
      netPremium: strategy.netPremium,
      legs: strategy.legs.map((leg) => ({
        legType: leg.legType,
        strikePrice: leg.strikePrice,
        quantity: leg.quantity,
        entryPrice: leg.entryPrice,
        exitPrice: leg.exitPrice,
      })),
    });

    // Update in database
    await prisma.tradeGroup.update({
      where: { id: strategyId },
      data: {
        realizedPnL: pnl.realizedPnL,
        maxProfit: pnl.maxProfit,
        maxLoss: pnl.maxLoss,
      },
    });

    return { success: true, strategy: pnl };
  } catch (error) {
    console.error('Error updating strategy P&L:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Recalculate P&L for all strategies belonging to a user
 * Useful after syncing new trades that might close positions
 */
export async function recalculateAllUserStrategiesPnL(
  userId: string
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  const strategies = await prisma.tradeGroup.findMany({
    where: { userId },
    select: { id: true },
  });

  for (const strategy of strategies) {
    const result = await updateStrategyPnL(strategy.id, userId);
    if (result.success) {
      updated++;
    } else {
      errors++;
    }
  }

  return { updated, errors };
}
