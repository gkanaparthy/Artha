import { NextRequest, NextResponse } from 'next/server';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.error('[SnapTrade Login] No session or user ID');
            return NextResponse.json({ error: 'Unauthorized - please sign in' }, { status: 401 });
        }

        const body = await req.json();
        const { redirectUri } = body;

        console.log('[SnapTrade Login] Generating connection link for user:', session.user.id);
        const redirectURI = await snapTradeService.generateConnectionLink(session.user.id, redirectUri);
        console.log('[SnapTrade Login] Success, redirect URI generated');
        return NextResponse.json({ redirectURI });
    } catch (error: unknown) {
        console.error('[SnapTrade Login] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        console.error('[SnapTrade Login] Error details:', { message, stack });
        return NextResponse.json({
            error: `Failed to generate connection link: ${message}. Please try again or contact support.`
        }, { status: 500 });
    }
}
