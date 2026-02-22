import { PrismaClient } from '@prisma/client';
import { snapTrade } from './src/lib/snaptrade';
import { safeDecrypt } from './src/lib/encryption';

const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.findFirst({
    where: { name: { contains: 'Gautham', mode: 'insensitive' } }
  });

  if (!user || !user.snapTradeUserId || !user.snapTradeUserSecret) {
    console.log('ERROR: User not found or not registered with SnapTrade');
    process.exit(1);
  }

  const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);

  if (!decryptedSecret) {
    console.log('ERROR: Failed to decrypt user secret');
    process.exit(1);
  }

  const accounts = await snapTrade.accountInformation.listUserAccounts({
    userId: user.snapTradeUserId,
    userSecret: decryptedSecret,
  });

  console.log('Checking all accounts for RKT trades from Jan 20, 2026...');
  console.log('Current time:', new Date().toISOString());
  console.log('');

  const jan20Start = '2026-01-20';
  const jan21End = '2026-01-21';

  let totalRktTrades = 0;

  for (const acc of accounts.data || []) {
    console.log('==========================================');
    console.log('Account:', acc.institution_name, '(' + acc.id + ')');
    console.log('==========================================');

    try {
      const activities = await snapTrade.accountInformation.getAccountActivities({
        accountId: acc.id,
        userId: user.snapTradeUserId,
        userSecret: decryptedSecret,
        startDate: jan20Start,
        endDate: jan21End,
      });

      const activityList = activities.data?.data || [];
      console.log('Total activities:', activityList.length);

      const rktTrades = activityList.filter((a: any) =>
        a.symbol?.symbol === 'RKT' || a.option_symbol?.ticker === 'RKT'
      );

      if (rktTrades.length > 0) {
        console.log('✓ FOUND', rktTrades.length, 'RKT trade(s):');
        rktTrades.forEach((t: any) => {
          console.log('  Date:', t.trade_date || t.settlement_date);
          console.log('  Type:', t.type);
          console.log('  Quantity:', t.units);
          console.log('  Price: $' + t.price);
          console.log('  ID:', t.id);
          console.log('');
        });
        totalRktTrades += rktTrades.length;
      } else {
        console.log('No RKT trades found in this account');
      }
    } catch (err: any) {
      console.error('Error:', err.message);
    }
    console.log('');
  }

  console.log('==========================================');
  console.log('SUMMARY');
  console.log('==========================================');
  console.log('Total RKT trades found from Jan 20:', totalRktTrades);

  if (totalRktTrades === 0) {
    console.log('');
    console.log('⚠️  NO RKT TRADES FROM JAN 20 FOUND IN SNAPTRADE API');
    console.log('');
    console.log('Possible reasons:');
    console.log('1. Broker hasn\'t reported the trade to SnapTrade yet (can take 24-48 hours)');
    console.log('2. Trade is still pending/unsettled and not visible via API');
    console.log('3. Trade was made in a different account not connected to SnapTrade');
    console.log('4. SnapTrade has a processing delay for this broker');
    console.log('');
    console.log('Recommendation: Try syncing again in a few hours or tomorrow.');
  }

  await prisma.$disconnect();
})();
