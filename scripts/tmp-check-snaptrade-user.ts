import { prisma } from '../src/lib/prisma';
import { safeDecrypt } from '../src/lib/encryption';
import { snapTrade } from '../src/lib/snaptrade';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node --import tsx scripts/tmp-check-snaptrade-user.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      onboardingCompleted: true,
      snapTradeUserId: true,
      snapTradeUserSecret: true,
      brokerAccounts: {
        select: {
          id: true,
          brokerName: true,
          disabled: true,
          lastSyncedAt: true,
          syncStatus: true,
          syncStartedAt: true,
          syncCompletedAt: true,
          syncError: true,
          syncTradeCount: true,
          snapTradeAccountId: true,
        },
      },
    },
  });

  if (!user) {
    console.log('user_not_found');
    return;
  }

  console.log('user', JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    onboardingCompleted: user.onboardingCompleted,
    hasSnapTradeUserId: !!user.snapTradeUserId,
    hasSnapTradeSecret: !!user.snapTradeUserSecret,
    brokerAccountsInDb: user.brokerAccounts.length,
  }, null, 2));

  if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
    console.log('snaptrade_missing_credentials');
    return;
  }

  const userSecret = safeDecrypt(user.snapTradeUserSecret);
  if (!userSecret) {
    console.log('snaptrade_secret_decrypt_failed');
    return;
  }

  try {
    const [accountsRes, authsRes] = await Promise.all([
      snapTrade.accountInformation.listUserAccounts({
        userId: user.snapTradeUserId,
        userSecret,
      }),
      snapTrade.connections.listBrokerageAuthorizations({
        userId: user.snapTradeUserId,
        userSecret,
      }),
    ]);

    const accounts = accountsRes.data || [];
    const auths = authsRes.data || [];

    console.log('snaptrade_accounts_count', accounts.length);
    console.log('snaptrade_authorizations_count', auths.length);
    console.log('snaptrade_accounts', JSON.stringify(accounts, null, 2));
    console.log('snaptrade_authorizations', JSON.stringify(auths, null, 2));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.log('snaptrade_api_error', message);
  }

  const tradesCount = await prisma.trade.count({
    where: { account: { userId: user.id } },
  });
  console.log('db_total_trades', tradesCount);

  if (user.brokerAccounts.length > 0) {
    console.log('db_broker_accounts', JSON.stringify(user.brokerAccounts, null, 2));
  }
}

main()
  .catch((e) => {
    console.error('fatal_error', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
