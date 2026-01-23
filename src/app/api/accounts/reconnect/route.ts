import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { snapTrade } from '@/lib/snaptrade';
import { safeDecrypt } from '@/lib/encryption';
import { applyRateLimit } from '@/lib/ratelimit';

/**
 * Generate a reconnect URL for a disabled broker connection
 *
 * This endpoint uses SnapTrade's reconnect parameter to preserve historical data
 * while re-establishing the OAuth connection with the broker.
 *
 * CRITICAL: User must log in to the SAME brokerage account to preserve trade history
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per minute for reconnect (similar to sync)
    const rateLimitResponse = await applyRateLimit(request, 'sync');
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Missing accountId' }, { status: 400 });
    }

    // Get the broker account with user information
    const account = await prisma.brokerAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id
      },
      include: { user: true }
    });

    if (!account) {
      console.error(`[Reconnect] Account not found: ${accountId}`);
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify the account is actually disabled
    if (!account.disabled) {
      console.warn(`[Reconnect] Account ${accountId} is not disabled`);
      return NextResponse.json({
        error: 'This account is already connected and active.'
      }, { status: 400 });
    }

    // Verify we have an authorization ID
    if (!account.authorizationId) {
      console.error(`[Reconnect] Account ${accountId} has no authorizationId`);
      return NextResponse.json({
        error: 'Cannot reconnect this account. Please disconnect and connect again manually.',
        details: 'Missing authorization ID'
      }, { status: 400 });
    }

    const user = account.user;

    // Verify user has SnapTrade credentials
    if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
      console.error(`[Reconnect] User ${user.id} not registered with SnapTrade`);
      return NextResponse.json({
        error: 'User not registered with SnapTrade'
      }, { status: 400 });
    }

    // Decrypt the user secret
    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
    if (!decryptedSecret) {
      console.error(`[Reconnect] Failed to decrypt secret for user ${user.id}`);
      return NextResponse.json({
        error: 'Failed to decrypt credentials. Please try again.'
      }, { status: 500 });
    }

    // Generate reconnect URL using SnapTrade's reconnect parameter
    console.log(`[Reconnect] Generating reconnect URL for account ${accountId} (${account.brokerName})`);
    console.log(`[Reconnect] Authorization ID: ${account.authorizationId}`);

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL}/api/auth/snaptrade/callback`;

    const result = await snapTrade.authentication.loginSnapTradeUser({
      userId: user.snapTradeUserId,
      userSecret: decryptedSecret,
      reconnect: account.authorizationId, // THIS IS THE KEY PARAMETER FOR RECONNECT
      immediateRedirect: true,
      customRedirect: callbackUrl
    });

    console.log(`[Reconnect] Successfully generated reconnect URL for ${account.brokerName}`);

    return NextResponse.json({
      success: true,
      redirectURI: (result.data as { redirectURI: string }).redirectURI,
      authorizationId: account.authorizationId,
      brokerName: account.brokerName,
      message: `Please log in to your ${account.brokerName} account to restore the connection.`
    });

  } catch (error) {
    console.error('[Reconnect] Error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Check for specific SnapTrade errors
    if (message.includes('authorization') || message.includes('not found')) {
      return NextResponse.json({
        error: 'This connection cannot be reconnected. Please disconnect and connect again.',
        details: message
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to generate reconnection link. Please try again.',
      details: message
    }, { status: 500 });
  }
}
