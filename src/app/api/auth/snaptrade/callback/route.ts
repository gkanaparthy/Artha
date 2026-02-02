import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * SnapTrade OAuth callback handler
 * After user completes broker OAuth (Robinhood, E*Trade, etc.),
 * SnapTrade redirects back here with the connection result.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            console.error('[SnapTrade Callback] No session');
            return NextResponse.redirect(new URL('/login?error=session_required', req.url));
        }

        const searchParams = req.nextUrl.searchParams;
        const success = searchParams.get('success');
        const brokerageAuthorizationId = searchParams.get('brokerageAuthorizationId');
        const error = searchParams.get('error');

        console.log('[SnapTrade Callback] Result:', { success, brokerageAuthorizationId, error });

        if (error) {
            console.error('[SnapTrade Callback] Error from SnapTrade:', error);
            return NextResponse.redirect(
                new URL(`/settings?broker_error=${encodeURIComponent(error)}`, req.url)
            );
        }

        if (success === 'true' && brokerageAuthorizationId) {
            console.log('[SnapTrade Callback] Broker connected successfully');

            const { snapTradeService } = await import('@/lib/services/snaptrade.service');

            // 1. Discover accounts fast
            await snapTradeService.syncAccounts(session.user.id);

            // 2. Start deep sync in background
            const syncPromise = snapTradeService.syncTrades(session.user.id);

            // Check for reconnect
            const existingAccount = await prisma.brokerAccount.findFirst({
                where: {
                    userId: session.user.id,
                    authorizationId: brokerageAuthorizationId
                }
            });
            const isReconnect = !!existingAccount;

            // Wait max 2s for initial progress
            const syncStarted = await Promise.race([
                syncPromise.then(() => true),
                new Promise(resolve => setTimeout(() => resolve(false), 2000))
            ]);

            const params = new URLSearchParams();
            if (isReconnect) {
                params.set('broker_reconnected', 'true');
                if (!syncStarted) params.set('broker_reconnected_sync_pending', 'true');
            } else {
                params.set('broker_connected', 'true');
                if (!syncStarted) params.set('broker_connected_sync_pending', 'true');
            }

            return NextResponse.redirect(new URL(`/settings?${params.toString()}`, req.url));
        }

        return NextResponse.redirect(new URL('/settings', req.url));

    } catch (error) {
        console.error('[SnapTrade Callback] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, req.url));
    }
}
