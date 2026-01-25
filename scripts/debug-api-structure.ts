import { PrismaClient } from '@prisma/client';
import { snapTrade } from '../src/lib/snaptrade';
import { safeDecrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function debugApiStructure() {
  try {
    // Get a user with multiple accounts from same broker if possible
    const user = await prisma.user.findFirst({
      where: {
        snapTradeUserId: { not: null },
        snapTradeUserSecret: { not: null }
      },
      include: {
        brokerAccounts: true
      }
    });

    if (!user || !user.snapTradeUserId || !user.snapTradeUserSecret) {
      console.log('No user found with SnapTrade credentials');
      return;
    }

    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
    if (!decryptedSecret) {
      console.log('Failed to decrypt secret');
      return;
    }

    console.log('User:', user.name);
    console.log('Local accounts:', user.brokerAccounts.length);
    console.log('');

    // Fetch accounts
    const accounts = await snapTrade.accountInformation.listUserAccounts({
      userId: user.snapTradeUserId,
      userSecret: decryptedSecret,
    });

    console.log('==========================================');
    console.log('ACCOUNTS API RESPONSE');
    console.log('==========================================');
    console.log('Total accounts:', accounts.data?.length);
    console.log('');

    for (const acc of accounts.data || []) {
      console.log('Account Object:');
      console.log(JSON.stringify(acc, null, 2));
      console.log('---');
    }

    // Fetch authorizations
    const authorizations = await snapTrade.connections.listBrokerageAuthorizations({
      userId: user.snapTradeUserId,
      userSecret: decryptedSecret,
    });

    console.log('');
    console.log('==========================================');
    console.log('AUTHORIZATIONS API RESPONSE');
    console.log('==========================================');
    console.log('Total authorizations:', authorizations.data?.length);
    console.log('');

    for (const auth of authorizations.data || []) {
      console.log('Authorization Object:');
      console.log(JSON.stringify(auth, null, 2));
      console.log('---');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

debugApiStructure();
