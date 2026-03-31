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
        const searchParams = req.nextUrl.searchParams;
        const isPopupFlow = searchParams.get('popup') === 'true';
        const requestedMode = searchParams.get('mode');

        if (!session?.user?.id) {
            console.error('[SnapTrade Callback] No session');
            return NextResponse.redirect(new URL('/login?error=session_required', req.url));
        }

        const success = searchParams.get('success');
        const brokerageAuthorizationId = searchParams.get('brokerageAuthorizationId');
        const error = searchParams.get('error');

        console.log('[SnapTrade Callback] Result:', { success, brokerageAuthorizationId, error });

        const buildPopupRedirect = (status: 'SUCCESS' | 'ERROR', params: Record<string, string>) => {
            const popupUrl = new URL('/auth/callback', req.url);
            popupUrl.searchParams.set('status', status);
            popupUrl.searchParams.set('mode', params.mode || requestedMode || 'connect');

            if (params.target) {
                popupUrl.searchParams.set('target', params.target);
            }

            if (params.error) {
                popupUrl.searchParams.set('error', params.error);
            }

            return NextResponse.redirect(popupUrl);
        };

        if (error) {
            console.error('[SnapTrade Callback] Error from SnapTrade:', error);
            if (isPopupFlow) {
                return buildPopupRedirect('ERROR', {
                    mode: requestedMode || 'connect',
                    error,
                    target: `/settings?broker_error=${encodeURIComponent(error)}`,
                });
            }
            return NextResponse.redirect(
                new URL(`/settings?broker_error=${encodeURIComponent(error)}`, req.url)
            );
        }

        if (success === 'true' && brokerageAuthorizationId) {
            console.log('[SnapTrade Callback] Broker connected successfully');

            // Check for reconnect FIRST (before syncAccounts, which may race)
            const existingAccount = await prisma.brokerAccount.findFirst({
                where: {
                    userId: session.user.id,
                    authorizationId: brokerageAuthorizationId
                }
            });
            const isReconnect = !!existingAccount;

            // If this is a reconnect, force-update the account to enabled immediately.
            // syncAccounts may race with SnapTrade's backend still processing the
            // re-auth, so we do this explicitly to avoid the "still disconnected" bug.
            if (isReconnect && existingAccount.disabled) {
                console.log(`[SnapTrade Callback] Reconnect detected — re-enabling account ${existingAccount.id} (${existingAccount.brokerName})`);
                await prisma.brokerAccount.update({
                    where: { id: existingAccount.id },
                    data: {
                        disabled: false,
                        disabledAt: null,
                        disabledReason: null,
                        lastCheckedAt: new Date(),
                    }
                });
            }

            const { snapTradeService } = await import('@/lib/services/snaptrade.service');

            // Small delay to let SnapTrade fully process the OAuth reconnection
            // before we query their API for account status
            if (isReconnect) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // 1. Discover accounts (this also updates disabled status from SnapTrade)
            await snapTradeService.syncAccounts(session.user.id);

            // 2. Start deep sync in background
            const syncPromise = snapTradeService.syncTrades(session.user.id);

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

            if (isPopupFlow) {
                return buildPopupRedirect('SUCCESS', {
                    mode: isReconnect ? 'reconnect' : (requestedMode || 'connect'),
                    target: `/settings?${params.toString()}`,
                });
            }

            return NextResponse.redirect(new URL(`/settings?${params.toString()}`, req.url));
        }

        if (isPopupFlow) {
            return buildPopupRedirect('ERROR', {
                mode: requestedMode || 'connect',
                error: 'Connection was not completed.',
                target: '/settings',
            });
        }

        return NextResponse.redirect(new URL('/settings', req.url));

    } catch (error) {
        console.error('[SnapTrade Callback] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (req.nextUrl.searchParams.get('popup') === 'true') {
            const popupUrl = new URL('/auth/callback', req.url);
            popupUrl.searchParams.set('status', 'ERROR');
            popupUrl.searchParams.set('mode', req.nextUrl.searchParams.get('mode') || 'connect');
            popupUrl.searchParams.set('error', message);
            popupUrl.searchParams.set('target', '/settings');
            return NextResponse.redirect(popupUrl);
        }
        return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, req.url));
    }
}
