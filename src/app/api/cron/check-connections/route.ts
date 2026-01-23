import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { snapTrade } from '@/lib/snaptrade';
import { safeDecrypt } from '@/lib/encryption';

/**
 * Cron job to check all broker connections for disabled status
 * Runs every 6 hours to keep connection health status up to date
 *
 * Protected by CRON_SECRET - only callable by Vercel Cron or with valid secret
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('[CheckConnections] CRON_SECRET not configured');
      return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
    }

    // Check Bearer token
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('[CheckConnections] Invalid authorization');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CheckConnections] Starting connection health check');
    const startTime = Date.now();

    // Get all users with SnapTrade credentials
    const users = await prisma.user.findMany({
      where: {
        snapTradeUserId: { not: null },
        snapTradeUserSecret: { not: null }
      },
      include: {
        brokerAccounts: true
      }
    });

    console.log(`[CheckConnections] Found ${users.length} users with SnapTrade accounts`);

    let totalAccounts = 0;
    let disabledAccounts = 0;
    let newlyDisabled = 0;
    let newlyEnabled = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        if (!user.snapTradeUserSecret) {
          console.warn(`[CheckConnections] User ${user.id} has no secret`);
          continue;
        }

        const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
        if (!decryptedSecret) {
          console.error(`[CheckConnections] Failed to decrypt secret for user ${user.id}`);
          errors.push(`User ${user.email}: decryption failed`);
          continue;
        }

        if (!user.snapTradeUserId) {
          console.warn(`[CheckConnections] User ${user.id} has no snapTradeUserId`);
          continue;
        }

        const authorizations = await snapTrade.connections.listBrokerageAuthorizations({
          userId: user.snapTradeUserId,
          userSecret: decryptedSecret
        });

        const authList = authorizations.data || [];
        totalAccounts += authList.length;

        console.log(`[CheckConnections] User ${user.email}: ${authList.length} connections`);

        for (const auth of authList) {
          const isDisabled = auth.disabled === true;
          const brokerName = auth.brokerage?.name || 'Unknown';

          // Find matching local account
          // First try by authorizationId (for accounts that have been checked before)
          let localAccount = user.brokerAccounts.find(
            acc => acc.authorizationId === auth.id
          );

          // If not found by authorizationId, try to find by matching snapTradeAccountId
          // SnapTrade authorizations don't directly expose account IDs in a way we can match,
          // so we need to match based on broker name and creation timing
          // For the initial population, we'll match the first unmatched account from this broker
          if (!localAccount) {
            // Find an account from this broker that doesn't have an authorizationId yet
            localAccount = user.brokerAccounts.find(
              acc => !acc.authorizationId && acc.brokerName === brokerName
            );

            if (localAccount) {
              console.log(`[CheckConnections] Matched account ${localAccount.id} to authorization ${auth.id} by broker name`);
            } else {
              console.log(`[CheckConnections] No local account found for authorization ${auth.id} (${brokerName}), skipping`);
              continue;
            }
          }

          // Check if status changed
          const wasDisabled = localAccount.disabled;
          const statusChanged = wasDisabled !== isDisabled;

          if (statusChanged) {
            if (isDisabled) {
              newlyDisabled++;
              console.warn(
                `[CheckConnections] Connection disabled: ${brokerName} for user ${user.email}`
              );
            } else {
              newlyEnabled++;
              console.log(
                `[CheckConnections] Connection restored: ${brokerName} for user ${user.email}`
              );
            }
          }

          if (isDisabled) {
            disabledAccounts++;
          }

          // Update local account status
          await prisma.brokerAccount.update({
            where: { id: localAccount.id },
            data: {
              disabled: isDisabled,
              disabledAt: isDisabled ? (wasDisabled ? localAccount.disabledAt : new Date()) : null,
              disabledReason: isDisabled ? 'Connection broken - requires re-authentication' : null,
              lastCheckedAt: new Date(),
              authorizationId: auth.id, // Ensure we have the authorization ID
              brokerName: brokerName // Update broker name in case it changed
            }
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[CheckConnections] Error checking user ${user.email}:`, errorMsg);
        errors.push(`User ${user.email}: ${errorMsg}`);
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        totalUsers: users.length,
        totalAccounts,
        disabledAccounts,
        activeAccounts: totalAccounts - disabledAccounts,
        newlyDisabled,
        newlyEnabled
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('[CheckConnections] Completed:', JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CheckConnections] Fatal error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
