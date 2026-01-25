import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { detectStrategies } from '@/lib/services/strategy-detection.service';

export const dynamic = 'force-dynamic';

// POST /api/strategies/detect - Trigger auto-detection of strategies
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run detection
    const result = await detectStrategies(session.user.id);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Strategy detection error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
