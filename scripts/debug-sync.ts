import { PrismaClient } from '@prisma/client';
import { snapTrade } from '../src/lib/snaptrade';
import { safeDecrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function debugSync() {
  try {
    console.log('===========================================');
    console.log('SnapTrade Debug - Testing API Directly');
    console.log('===========================================\n');

    // Find Gautham
    const user = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Gautham',
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      console.log('ERROR: User not found');
      return;
    }

    console.log('User:', user.name);
    console.log('Email:', user.email);
    console.log('SnapTrade User ID:', user.snapTradeUserId);
    console.log('Has Secret:', !!user.snapTradeUserSecret);
    console.log('');

    if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
      console.log('ERROR: User not registered with SnapTrade');
      return;
    }

    // Decrypt secret
    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
    if (!decryptedSecret) {
      console.log('ERROR: Failed to decrypt SnapTrade secret');
      return;
    }

    console.log('✓ Successfully decrypted SnapTrade credentials\n');

    // Fetch accounts
    console.log('Fetching accounts from SnapTrade...');
    const accounts = await snapTrade.accountInformation.listUserAccounts({
      userId: user.snapTradeUserId,
      userSecret: decryptedSecret,
    });

    console.log('Found', accounts.data?.length || 0, 'accounts\n');

    // Date range: last 7 days
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const startDate = weekAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log('Date Range:', startDate, 'to', endDate);
    console.log('Current Server Time:', new Date().toISOString());
    console.log('');

    let totalActivities = 0;
    let rktCount = 0;
    let nbisCount = 0;

    for (const acc of accounts.data || []) {
      console.log('===========================================');
      console.log('Account:', acc.institution_name || 'Unknown');
      console.log('ID:', acc.id);
      console.log('===========================================');

      try {
        const activities = await snapTrade.accountInformation.getAccountActivities({
          accountId: acc.id,
          userId: user.snapTradeUserId!,
          userSecret: decryptedSecret,
          startDate: startDate,
          endDate: endDate,
        });

        const activityList = activities.data?.data || [];
        totalActivities += activityList.length;

        console.log('Activities returned:', activityList.length);

        if (activityList.length > 0) {
          console.log('\nRecent activities:');
          console.log('------------------------------------------');

          activityList.slice(0, 15).forEach((activity: any, idx: number) => {
            const tradeDate = activity.trade_date || activity.settlement_date || 'Unknown';
            const symbol = activity.symbol?.symbol || activity.option_symbol?.ticker || 'UNKNOWN';
            const type = activity.type || 'UNKNOWN';
            const units = activity.units || 0;
            const price = activity.price || 0;

            console.log(`${idx + 1}. ${tradeDate} | ${type} | ${symbol} | Qty: ${units} | Price: $${price}`);

            // Check for RKT/NBIS
            if (symbol === 'RKT') {
              console.log('   🎯 FOUND RKT TRADE!');
              rktCount++;
            }
            if (symbol === 'NBIS') {
              console.log('   🎯 FOUND NBIS TRADE!');
              nbisCount++;
            }
          });

          if (activityList.length > 15) {
            console.log(`... and ${activityList.length - 15} more activities`);
          }
        }

        console.log('');
      } catch (err: any) {
        console.error('❌ Error fetching activities for this account');
        console.error('Error:', err.message);
        if (err.response) {
          console.error('Status:', err.response.status);
          console.error('Data:', JSON.stringify(err.response.data, null, 2));
        }
        console.log('');
      }
    }

    console.log('===========================================');
    console.log('Summary');
    console.log('===========================================');
    console.log('Total activities found:', totalActivities);
    console.log('RKT trades found:', rktCount);
    console.log('NBIS trades found:', nbisCount);
    console.log('');

    if (rktCount === 0 && nbisCount === 0) {
      console.log('⚠️  NO RKT OR NBIS TRADES FOUND IN LAST 7 DAYS');
      console.log('');
      console.log('Possible reasons:');
      console.log('1. Trades were made today but SnapTrade hasn\'t processed them yet (T+0 delay)');
      console.log('2. Trades are still pending settlement and not visible via API');
      console.log('3. Trades were made in a different account not connected');
      console.log('4. The broker hasn\'t reported the trades to SnapTrade yet');
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

debugSync();
