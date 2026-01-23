import { PrismaClient } from '@prisma/client';
import { snapTrade } from '../src/lib/snaptrade';
import { safeDecrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function checkDisabledConnections() {
  try {
    console.log('==========================================');
    console.log('Checking for Disabled SnapTrade Connections');
    console.log('==========================================\n');

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

    console.log(`Found ${users.length} users with SnapTrade accounts\n`);

    let totalAccounts = 0;
    let disabledAccounts = 0;
    const disabledConnectionDetails: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      brokerName: string;
      accountId: string;
      authorizationId: string;
    }> = [];

    for (const user of users) {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`SnapTrade User ID: ${user.snapTradeUserId}`);

      if (!user.snapTradeUserSecret) {
        console.log('  ⚠️  No secret available, skipping\n');
        continue;
      }

      if (!user.snapTradeUserId) {
        console.log('  ⚠️  No SnapTrade User ID available, skipping\n');
        continue;
      }

      const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
      if (!decryptedSecret) {
        console.log('  ⚠️  Failed to decrypt secret, skipping\n');
        continue;
      }

      try {
        // Get brokerage authorizations (connections)
        const authorizations = await snapTrade.connections.listBrokerageAuthorizations({
          userId: user.snapTradeUserId,
          userSecret: decryptedSecret
        });

        const authList = authorizations.data || [];
        totalAccounts += authList.length;

        console.log(`  Connections: ${authList.length}`);

        for (const auth of authList) {
          const isDisabled = auth.disabled === true;
          const status = isDisabled ? '❌ DISABLED' : '✓ Active';

          console.log(`    - ${auth.brokerage?.name || 'Unknown'}: ${status}`);
          console.log(`      Authorization ID: ${auth.id}`);

          if (isDisabled) {
            disabledAccounts++;
            disabledConnectionDetails.push({
              userId: user.id,
              userName: user.name || 'Unknown',
              userEmail: user.email || 'Unknown',
              brokerName: auth.brokerage?.name || 'Unknown',
              accountId: auth.id || 'Unknown',
              authorizationId: auth.id || 'Unknown'
            });
          }
        }
        console.log('');
      } catch (err: any) {
        console.error(`  ❌ Error checking connections: ${err.message}\n`);
      }
    }

    console.log('==========================================');
    console.log('Summary');
    console.log('==========================================');
    console.log(`Total users: ${users.length}`);
    console.log(`Total connections: ${totalAccounts}`);
    console.log(`Disabled connections: ${disabledAccounts}`);
    console.log(`Active connections: ${totalAccounts - disabledAccounts}`);
    console.log('');

    if (disabledAccounts > 0) {
      console.log('==========================================');
      console.log('Disabled Connection Details');
      console.log('==========================================');
      disabledConnectionDetails.forEach((conn, idx) => {
        console.log(`${idx + 1}. ${conn.userName} (${conn.userEmail})`);
        console.log(`   Broker: ${conn.brokerName}`);
        console.log(`   Authorization ID: ${conn.authorizationId}`);
        console.log('');
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDisabledConnections();
