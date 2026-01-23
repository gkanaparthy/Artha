const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSnapTradeSync() {
  try {
    // Get Gautham's user info
    const user = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Gautham',
          mode: 'insensitive'
        }
      },
      include: {
        brokerAccounts: true
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:', user.name);
    console.log('SnapTrade User ID:', user.snapTradeUserId);
    console.log('Has encrypted secret:', !!user.snapTradeUserSecret);
    console.log('');

    // Import the SnapTrade service
    const { snapTrade } = require('./src/lib/snaptrade');
    const { safeDecrypt } = require('./src/lib/encryption');

    if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
      console.log('ERROR: User not registered with SnapTrade');
      return;
    }

    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
    if (!decryptedSecret) {
      console.log('ERROR: Failed to decrypt SnapTrade secret');
      return;
    }

    console.log('Successfully decrypted SnapTrade credentials');
    console.log('');

    // Test: Fetch accounts
    console.log('Fetching accounts from SnapTrade...');
    const accounts = await snapTrade.accountInformation.listUserAccounts({
      userId: user.snapTradeUserId,
      userSecret: decryptedSecret,
    });

    console.log('Found', accounts.data?.length || 0, 'accounts');
    console.log('');

    // For each account, fetch recent activities
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 7); // Last 7 days

    console.log('Fetching activities from', startDate.toISOString().split('T')[0], 'to', today.toISOString().split('T')[0]);
    console.log('');

    for (const acc of accounts.data || []) {
      console.log('======================================');
      console.log('Account:', acc.institution_name, '(' + acc.id + ')');
      console.log('======================================');

      try {
        const activities = await snapTrade.accountInformation.getAccountActivities({
          accountId: acc.id,
          userId: user.snapTradeUserId,
          userSecret: decryptedSecret,
          startDate: startDate.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        });

        const activityList = activities.data?.data || [];
        console.log('Total activities returned:', activityList.length);
        console.log('');

        if (activityList.length > 0) {
          console.log('Recent activities:');
          activityList.slice(0, 10).forEach((activity, idx) => {
            const tradeDate = activity.trade_date || activity.settlement_date || 'Unknown';
            const symbol = activity.symbol?.symbol || activity.option_symbol?.ticker || 'UNKNOWN';
            console.log(`  ${idx + 1}. Date: ${tradeDate} | Type: ${activity.type} | Symbol: ${symbol} | Qty: ${activity.units || 0} | Price: $${activity.price || 0}`);

            // Check if this would be skipped
            if (!activity.type) {
              console.log('     ⚠️  WARNING: No type - would be skipped');
            }

            const action = activity.type?.toUpperCase();
            const validActions = ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'];
            if (action && !validActions.includes(action)) {
              console.log(`     ⚠️  WARNING: Type "${action}" not in valid actions - would be skipped`);
            }
          });
        } else {
          console.log('No activities found for this account in the last 7 days');
        }
        console.log('');
      } catch (err) {
        console.error('Error fetching activities for account:', err.message);
        console.log('');
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testSnapTradeSync();
