import { prisma } from '../src/lib/prisma';
import { snapTradeService } from '../src/lib/services/snaptrade.service';

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node --import tsx scripts/tmp-check-onboarding-sync.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      onboardingCompleted: true,
      trialEndsAt: true,
      snapTradeUserId: true,
      snapTradeUserSecret: true,
      brokerAccounts: {
        select: {
          id: true,
          brokerName: true,
          disabled: true,
          lastSyncedAt: true,
          syncStatus: true,
          syncTradeCount: true,
          syncError: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    console.log('user_not_found');
    return;
  }

  const tradesBefore = await prisma.trade.count({
    where: { account: { userId: user.id } },
  });

  console.log('user', JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    onboardingCompleted: user.onboardingCompleted,
    trialEndsAt: user.trialEndsAt,
    hasSnapTradeUserId: !!user.snapTradeUserId,
    hasSnapTradeSecret: !!user.snapTradeUserSecret,
    brokerAccountsInDb: user.brokerAccounts.length,
    tradesBefore,
  }, null, 2));

  console.log('db_broker_accounts_before', JSON.stringify(user.brokerAccounts, null, 2));

  const syncAccountsResult = await snapTradeService.syncAccounts(user.id);
  console.log('sync_accounts_result', JSON.stringify(syncAccountsResult, null, 2));

  const brokerAccountsAfter = await prisma.brokerAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      brokerName: true,
      disabled: true,
      lastSyncedAt: true,
      syncStatus: true,
      syncTradeCount: true,
      syncError: true,
      createdAt: true,
    },
  });

  const tradesAfterAccountsSync = await prisma.trade.count({
    where: { account: { userId: user.id } },
  });

  console.log('db_broker_accounts_after_syncAccounts', JSON.stringify(brokerAccountsAfter, null, 2));
  console.log('db_total_trades_after_syncAccounts', tradesAfterAccountsSync);

  if (brokerAccountsAfter.some((a) => !a.disabled)) {
    const syncTradesResult = await snapTradeService.syncTrades(user.id);
    console.log('sync_trades_result', JSON.stringify(syncTradesResult, null, 2));

    const tradesAfter = await prisma.trade.count({
      where: { account: { userId: user.id } },
    });
    console.log('db_total_trades_after_syncTrades', tradesAfter);
  } else {
    console.log('skip_sync_trades_no_active_accounts');
  }
}

main()
  .catch((e) => {
    console.error('fatal_error', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
