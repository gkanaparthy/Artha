import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { snapTradeService } from '@/lib/services/snaptrade.service';
import { sendSyncCompleteEmail } from '@/lib/email';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/webhooks/snaptrade
 *
 * Handles SnapTrade webhook events.
 * Primary: ACCOUNT_TRANSACTIONS_INITIAL_UPDATE — fires when SnapTrade finishes
 * pulling initial transaction data after a new broker connection (1-60s typical).
 *
 * Also handles: ACCOUNT_TRANSACTIONS_UPDATED (incremental updates).
 *
 * Signature verification via HMAC-SHA256 if SNAPTRADE_WEBHOOK_SECRET is set.
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();

    // Verify HMAC signature if secret is configured
    const secret = process.env.SNAPTRADE_WEBHOOK_SECRET;
    if (secret) {
        const signature =
            request.headers.get('Signature') ||
            request.headers.get('signature') ||
            request.headers.get('x-signature') ||
            request.headers.get('x-hub-signature-256');

        if (!signature) {
            console.warn('[SnapTrade Webhook] Missing signature header. Headers:',
                JSON.stringify(Object.fromEntries(request.headers.entries())));
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const expectedSig = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        const providedSig = signature.replace('sha256=', '');

        console.log(`[SnapTrade Webhook] Signature verification attempt:
          Secret ends with: ...${secret.slice(-4)}
          Expected: ${expectedSig}
          Provided: ${providedSig}`);

        try {
            const expectedSigBuffer = Buffer.from(expectedSig);
            const providedSigBuffer = Buffer.from(providedSig);

            if (expectedSigBuffer.length !== providedSigBuffer.length ||
                !crypto.timingSafeEqual(expectedSigBuffer, providedSigBuffer)) {
                console.warn('[SnapTrade Webhook] Signature mismatch');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
            }
        } catch (err) {
            console.error('[SnapTrade Webhook] Signature verification error:', err);
            return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
        }
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = payload.type || payload.event;
    const snapTradeUserId = payload.userId || payload.user_id;
    const snapTradeAccountId = payload.accountId || payload.account_id;

    console.log(`[SnapTrade Webhook] Event: ${eventType}, User: ${snapTradeUserId}, Account: ${snapTradeAccountId}`);

    // Only handle transaction events
    if (eventType !== 'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE' && eventType !== 'ACCOUNT_TRANSACTIONS_UPDATED') {
        console.log(`[SnapTrade Webhook] Ignoring event type: ${eventType}`);
        return NextResponse.json({ received: true });
    }

    // Look up user by snapTradeUserId
    const user = await prisma.user.findFirst({
        where: { snapTradeUserId },
        select: { id: true, email: true },
    });

    if (!user) {
        console.warn(`[SnapTrade Webhook] User not found for snapTradeUserId: ${snapTradeUserId}`);
        return NextResponse.json({ received: true });
    }

    // Find the specific account if provided, otherwise sync all
    let targetAccounts;
    if (snapTradeAccountId) {
        targetAccounts = await prisma.brokerAccount.findMany({
            where: { userId: user.id, snapTradeAccountId },
        });
    } else {
        targetAccounts = await prisma.brokerAccount.findMany({
            where: { userId: user.id, disabled: false },
        });
    }

    if (targetAccounts.length === 0) {
        console.warn(`[SnapTrade Webhook] No matching accounts found`);
        return NextResponse.json({ received: true });
    }

    // Concurrency guard: skip if any target account is already IN_PROGRESS
    const inProgressAccount = targetAccounts.find(a => a.syncStatus === 'IN_PROGRESS');
    if (inProgressAccount) {
        console.log(`[SnapTrade Webhook] Account ${inProgressAccount.id} already IN_PROGRESS, skipping`);
        return NextResponse.json({ received: true, skipped: 'already_syncing' });
    }

    // Set accounts to IN_PROGRESS
    for (const acc of targetAccounts) {
        await prisma.brokerAccount.update({
            where: { id: acc.id },
            data: { syncStatus: 'IN_PROGRESS' },
        });
    }

    try {
        const result = await snapTradeService.syncTrades(user.id);

        // Update sync status on all target accounts
        const tradeCount = result.synced;
        for (const acc of targetAccounts) {
            const isFailed = result.failedAccounts.includes(acc.brokerName || acc.snapTradeAccountId);
            await prisma.brokerAccount.update({
                where: { id: acc.id },
                data: {
                    syncStatus: isFailed ? 'FAILED' : 'COMPLETED',
                    syncCompletedAt: new Date(),
                    syncTradeCount: tradeCount,
                    syncError: isFailed ? `Sync failed for ${acc.brokerName}` : null,
                },
            });
        }

        console.log(`[SnapTrade Webhook] Sync completed for user ${user.id}: ${tradeCount} trades`);

        // Send email if trades were found and this is initial sync
        if (tradeCount > 0 && user.email && eventType === 'ACCOUNT_TRANSACTIONS_INITIAL_UPDATE') {
            sendSyncCompleteEmail(user.email, tradeCount, result.accounts)
                .catch(err => console.error('[SnapTrade Webhook] Email failed:', err));
        }

        return NextResponse.json({ received: true, synced: tradeCount });
    } catch (error) {
        console.error(`[SnapTrade Webhook] Sync failed for user ${user.id}:`, error);

        // Mark accounts as FAILED
        for (const acc of targetAccounts) {
            await prisma.brokerAccount.update({
                where: { id: acc.id },
                data: {
                    syncStatus: 'FAILED',
                    syncError: error instanceof Error ? error.message : 'Webhook sync failed',
                },
            });
        }

        return NextResponse.json({ received: true, error: 'sync_failed' });
    }
}
