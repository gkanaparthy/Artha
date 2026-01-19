import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

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

        // Get query parameters from SnapTrade
        const searchParams = req.nextUrl.searchParams;
        const success = searchParams.get('success');
        const brokerageAuthorizationId = searchParams.get('brokerageAuthorizationId');
        const error = searchParams.get('error');

        console.log('[SnapTrade Callback] User:', session.user.id);
        console.log('[SnapTrade Callback] Success:', success);
        console.log('[SnapTrade Callback] Brokerage Auth ID:', brokerageAuthorizationId);
        console.log('[SnapTrade Callback] Error:', error);

        if (error) {
            console.error('[SnapTrade Callback] Error from SnapTrade:', error);
            return NextResponse.redirect(
                new URL(`/settings?broker_error=${encodeURIComponent(error)}`, req.url)
            );
        }

        if (success === 'true' && brokerageAuthorizationId) {
            console.log('[SnapTrade Callback] Broker connected successfully');

            // Trigger an immediate sync to fetch the broker account details
            try {
                await fetch(new URL('/api/trades/sync', req.url).toString(), {
                    method: 'POST',
                    headers: {
                        'Cookie': req.headers.get('cookie') || '',
                    },
                });
                console.log('[SnapTrade Callback] Sync triggered');
            } catch (syncError) {
                console.error('[SnapTrade Callback] Sync failed:', syncError);
                // Don't fail the whole callback if sync fails
            }

            return NextResponse.redirect(
                new URL('/settings?broker_connected=true', req.url)
            );
        }

        // Unknown state - redirect to settings
        console.warn('[SnapTrade Callback] Unknown callback state');
        return NextResponse.redirect(new URL('/settings', req.url));

    } catch (error) {
        console.error('[SnapTrade Callback] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.redirect(
            new URL(`/settings?error=${encodeURIComponent(message)}`, req.url)
        );
    }
}
