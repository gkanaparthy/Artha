import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { StrategyType } from '@/types/strategy';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/strategies/[id] - Get a single strategy with all legs
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const strategy = await prisma.tradeGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        account: {
          select: { brokerName: true },
        },
        legs: {
          orderBy: { legNumber: 'asc' },
          include: {
            trade: {
              select: {
                id: true,
                symbol: true,
                action: true,
                quantity: true,
                price: true,
                timestamp: true,
                type: true,
                optionType: true,
                optionAction: true,
                strikePrice: true,
                expiryDate: true,
                contractMultiplier: true,
                fees: true,
              },
            },
          },
        },
      },
    });

    if (!strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Transform to API response format
    const result = {
      id: strategy.id,
      name: strategy.name,
      strategyType: strategy.strategyType as StrategyType,
      underlyingSymbol: strategy.underlyingSymbol,
      accountId: strategy.accountId,
      openedAt: strategy.openedAt.toISOString(),
      closedAt: strategy.closedAt?.toISOString() ?? null,
      expirationDate: strategy.expirationDate?.toISOString() ?? null,
      netPremium: strategy.netPremium,
      realizedPnL: strategy.realizedPnL,
      maxProfit: strategy.maxProfit,
      maxLoss: strategy.maxLoss,
      autoDetected: strategy.autoDetected,
      confidence: strategy.confidence,
      status: strategy.closedAt ? ('closed' as const) : ('open' as const),
      broker: strategy.account.brokerName ?? 'Unknown',
      legs: strategy.legs.map((leg) => ({
        id: leg.id,
        legNumber: leg.legNumber,
        legType: leg.legType,
        strikePrice: leg.strikePrice,
        expirationDate: leg.expirationDate?.toISOString() ?? null,
        quantity: leg.quantity,
        entryPrice: leg.entryPrice,
        exitPrice: leg.exitPrice,
        trade: {
          id: leg.trade.id,
          symbol: leg.trade.symbol,
          action: leg.trade.action,
          quantity: leg.trade.quantity,
          price: leg.trade.price,
          timestamp: leg.trade.timestamp.toISOString(),
          type: leg.trade.type,
          optionType: leg.trade.optionType,
          optionAction: leg.trade.optionAction,
        },
      })),
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Get strategy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/strategies/[id] - Update strategy (rename, change type)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, strategyType } = body;

    // Verify ownership
    const existing = await prisma.tradeGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Validate strategy type if provided
    if (strategyType && !Object.values(StrategyType).includes(strategyType)) {
      return NextResponse.json({ error: 'Invalid strategy type' }, { status: 400 });
    }

    // Update the strategy
    const updated = await prisma.tradeGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name || null }),
        ...(strategyType && { strategyType }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      strategyType: updated.strategyType,
    });
  } catch (error: unknown) {
    console.error('Update strategy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/strategies/[id] - Ungroup trades (deletes strategy, keeps trades)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.tradeGroup.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 });
    }

    // Delete the strategy (legs are cascade deleted, but trades are preserved)
    await prisma.tradeGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete strategy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
