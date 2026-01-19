import { NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';

export async function POST() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.error('[SnapTrade Register] No session or user ID');
            return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 });
        }

        console.log('[SnapTrade Register] Registering user:', session.user.id);
        const result = await snapTradeService.registerUser(session.user.id);
        console.log('[SnapTrade Register] Success:', result.userId);
        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('[SnapTrade Register] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        console.error('[SnapTrade Register] Error details:', { message, stack });
        return NextResponse.json({
            error: `Registration failed: ${message}. Please try again or contact support.`
        }, { status: 500 });
    }
}
