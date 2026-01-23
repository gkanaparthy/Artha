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

        // Fetch both accounts and authorizations to properly link them
        const [accounts, authorizations] = await Promise.all([
          snapTrade.accountInformation.listUserAccounts({
            userId: user.snapTradeUserId,
            userSecret: decryptedSecret,
          }),
          snapTrade.connections.listBrokerageAuthorizations({
            userId: user.snapTradeUserId,
            userSecret: decryptedSecret
          })
        ]);

        const accountsList = accounts.data || [];
        const authList = authorizations.data || [];

        console.log(`[CheckConnections] User ${user.email}: ${accountsList.length} accounts, ${authList.length} authorizations`);

        // Track local accounts that were matched to SnapTrade accounts
        const matchedLocalAccountIds = new Set<string>();

        // Loop through SnapTrade accounts and match them to local accounts
        for (const acc of accountsList) {
          // Find the authorization for this account using brokerage_authorization field
          const authId = (acc as any).brokerage_authorization;
          const matchingAuth = authList.find(a => a.id === authId);
          const isDisabled = matchingAuth?.disabled === true;
          const brokerName = acc.institution_name || 'Unknown';

          totalAccounts++;

          // Find matching local account by snapTradeAccountId
          const localAccount = user.brokerAccounts.find(
            a => a.snapTradeAccountId === acc.id
          );

          if (localAccount) {
            matchedLocalAccountIds.add(localAccount.id);

            // Check if status changed
            const wasDisabled = localAccount.disabled;
            const statusChanged = wasDisabled !== isDisabled;

            if (statusChanged) {
              if (isDisabled) {
                newlyDisabled++;
                console.warn(`[CheckConnections] Connection disabled: ${brokerName} (${acc.number}) for ${user.email}`);
              } else {
                newlyEnabled++;
                console.log(`[CheckConnections] Connection restored: ${brokerName} (${acc.number}) for ${user.email}`);
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
                authorizationId: authId,
                brokerName: brokerName
              }
            });
          } else {
            console.warn(`[CheckConnections] SnapTrade account ${acc.id} not found in local DB for user ${user.email}`);
          }
        }

        // Handle local accounts that were NOT in the SnapTrade accounts list
        // This means the account was deleted from SnapTrade
        const missingAccounts = user.brokerAccounts.filter(
          acc => !matchedLocalAccountIds.has(acc.id) && !acc.disabled
        );

        for (const acc of missingAccounts) {
          console.warn(`[CheckConnections] Account ${acc.id} (${acc.brokerName}) missing from SnapTrade, marking as disabled`);
          await prisma.brokerAccount.update({
            where: { id: acc.id },
            data: {
              disabled: true,
              disabledAt: new Date(),
              disabledReason: 'Connection removed or missing from provider',
              lastCheckedAt: new Date()
            }
          });
          newlyDisabled++;
          disabledAccounts++;
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
