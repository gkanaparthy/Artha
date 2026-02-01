import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { StrategyType, determineLegType, parseUnderlyingSymbol, isVerticalSpread } from '@/types/strategy';
import { calculateVerticalSpreadPnL } from '@/lib/services/strategy-pnl.service';

export const dynamic = 'force-dynamic';

// GET /api/strategies - List all strategies for the user
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'open' | 'closed' | 'all'
    const underlying = searchParams.get('underlying');
    const strategyType = searchParams.get('type');
    const accountId = searchParams.get('accountId');

    // Build where clause
    const whereClause: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (status === 'open') {
      whereClause.closedAt = null;
    } else if (status === 'closed') {
      whereClause.closedAt = { not: null };
    }

    if (underlying) {
      whereClause.underlyingSymbol = {
        contains: underlying,
        mode: 'insensitive',
      };
    }

    if (strategyType) {
      whereClause.strategyType = strategyType;
    }

    if (accountId && accountId !== 'all') {
      const accountIds = accountId.split(',').filter(Boolean);
      if (accountIds.length > 0) {
        whereClause.accountId = { in: accountIds };
      }
    }

    const strategies = await prisma.tradeGroup.findMany({
      where: whereClause,
      orderBy: { openedAt: 'desc' },
      include: {
        account: {
          select: { brokerName: true },
        },
        legs: {
          select: { id: true },
        },
      },
    });

    // Transform to API response format
    const result = strategies.map((s) => ({
      id: s.id,
      name: s.name,
      strategyType: s.strategyType as StrategyType,
      underlyingSymbol: s.underlyingSymbol,
      accountId: s.accountId,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
      expirationDate: s.expirationDate?.toISOString() ?? null,
      netPremium: s.netPremium,
      realizedPnL: s.realizedPnL,
      maxProfit: s.maxProfit,
      maxLoss: s.maxLoss,
      autoDetected: s.autoDetected,
      confidence: s.confidence,
      status: s.closedAt ? ('closed' as const) : ('open' as const),
      legCount: s.legs.length,
      broker: s.account.brokerName ?? 'Unknown',
    }));

    return NextResponse.json({
      strategies: result,
      total: result.length,
    });
  } catch (error: unknown) {
    console.error('Get strategies error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/strategies - Create a new strategy group manually
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, strategyType, tradeIds } = body;

    // Validate required fields
    if (!strategyType || !tradeIds || !Array.isArray(tradeIds) || tradeIds.length < 2) {
      return NextResponse.json(
        { error: 'strategyType and at least 2 tradeIds are required' },
        { status: 400 }
      );
    }

    // Validate strategy type
    if (!Object.values(StrategyType).includes(strategyType)) {
      return NextResponse.json({ error: 'Invalid strategy type' }, { status: 400 });
    }

    // Fetch the trades and verify ownership
    const trades = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds },
        account: { userId: session.user.id },
      },
      include: {
        account: { select: { brokerName: true } },
        groupLegs: { select: { groupId: true } },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (trades.length !== tradeIds.length) {
      return NextResponse.json(
        { error: 'One or more trades not found or unauthorized' },
        { status: 404 }
      );
    }

    // Check if any trade is already in a group
    const alreadyGrouped = trades.filter((t) => t.groupLegs.length > 0);
    if (alreadyGrouped.length > 0) {
      return NextResponse.json(
        {
          error: 'One or more trades are already in a strategy group',
          tradeIds: alreadyGrouped.map((t) => t.id),
        },
        { status: 400 }
      );
    }

    // Verify all trades are from the same account
    const accountIds = new Set(trades.map((t) => t.accountId));
    if (accountIds.size > 1) {
      return NextResponse.json(
        { error: 'All trades must be from the same brokerage account' },
        { status: 400 }
      );
    }

    const accountId = trades[0].accountId;

    // Determine underlying symbol (parse from first option trade or use stock symbol)
    const optionTrade = trades.find((t) => t.type === 'OPTION');
    const underlyingSymbol = optionTrade
      ? parseUnderlyingSymbol(optionTrade.symbol)
      : trades[0].symbol;

    // Calculate net premium (sum of entry costs)
    let netPremium = 0;
    for (const trade of trades) {
      const isBuy = trade.action.includes('BUY');
      const multiplier = trade.contractMultiplier || (trade.type === 'OPTION' ? 100 : 1);
      const cost = trade.price * Math.abs(trade.quantity) * multiplier;
      netPremium += isBuy ? -cost : cost; // Buying is negative, selling is positive
    }

    // Determine expiration date (use earliest if multiple)
    const expirationDates = trades
      .filter((t) => t.expiryDate)
      .map((t) => t.expiryDate as Date)
      .sort((a, b) => a.getTime() - b.getTime());
    const expirationDate = expirationDates.length > 0 ? expirationDates[0] : null;

    // Calculate max profit/loss for vertical spreads
    let maxProfit: number | null = null;
    let maxLoss: number | null = null;

    if (isVerticalSpread(strategyType as StrategyType)) {
      const legs = trades.map((t) => ({
        strikePrice: t.strikePrice,
        quantity: Math.abs(t.quantity),
      }));
      const pnl = calculateVerticalSpreadPnL(strategyType as StrategyType, legs, netPremium);
      if (pnl) {
        maxProfit = pnl.maxProfit;
        maxLoss = pnl.maxLoss;
      }
    }

    // Create strategy group with legs in a transaction
    const strategy = await prisma.$transaction(async (tx) => {
      // Create the group
      const group = await tx.tradeGroup.create({
        data: {
          userId: session.user.id,
          name: name || null,
          strategyType: strategyType,
          underlyingSymbol,
          accountId,
          openedAt: trades[0].timestamp,
          expirationDate,
          netPremium: Math.round(netPremium * 100) / 100,
          realizedPnL: 0, // Newly created strategies have no realized P&L
          maxProfit,
          maxLoss,
          autoDetected: false,
          confidence: null,
        },
      });

      // Create legs
      const legs = await Promise.all(
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

      return { ...group, legs };
    });

    return NextResponse.json(
      {
        id: strategy.id,
        name: strategy.name,
        strategyType: strategy.strategyType,
        underlyingSymbol: strategy.underlyingSymbol,
        legCount: strategy.legs.length,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Create strategy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
