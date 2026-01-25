import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateStrategyPnL } from '@/lib/services/strategy-pnl.service';

export const dynamic = 'force-dynamic';

// POST /api/strategies/[id]/pnl - Recalculate P&L for a strategy
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const result = await updateStrategyPnL(id, session.user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to recalculate P&L' },
        { status: result.error === 'Strategy not found' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pnl: result.strategy,
    });
  } catch (error: unknown) {
    console.error('Recalculate P&L error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
