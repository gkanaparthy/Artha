import { Snaptrade } from 'snaptrade-typescript-sdk';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Decrypt function (simplified - we'll get the raw encrypted value and decrypt it)
function safeDecrypt(encrypted) {
  const crypto = await import('crypto');
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY, 'hex');

  try {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

async function debugSnapTrade() {
  try {
    console.log('Initializing SnapTrade client...');
    const snapTrade = new Snaptrade({
      clientId: process.env.SNAPTRADE_CLIENT_ID,
      consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
    });

    console.log('Fetching user from database...');
    const user = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Gautham',
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:', user.name);
    console.log('SnapTrade User ID:', user.snapTradeUserId);
    console.log('');

    // We need to decrypt the secret - but for now, let's just try to import it
    const { safeDecrypt } = await import('./src/lib/encryption.ts');
    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);

    if (!decryptedSecret) {
      console.log('ERROR: Could not decrypt SnapTrade secret');
      return;
    }

    console.log('Successfully decrypted credentials');
    console.log('');

    // Fetch accounts
    console.log('Fetching accounts from SnapTrade API...');
    const accounts = await snapTrade.accountInformation.listUserAccounts({
      userId: user.snapTradeUserId,
      userSecret: decryptedSecret,
    });

    console.log('Found', accounts.data?.length || 0, 'accounts');
    console.log('');

    // Get today and recent dates
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const startDate = weekAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log('Fetching activities from', startDate, 'to', endDate);
    console.log('');

    for (const acc of accounts.data || []) {
      console.log('==========================================');
      console.log('Account:', acc.institution_name);
      console.log('Account ID:', acc.id);
      console.log('==========================================');

      try {
        const activities = await snapTrade.accountInformation.getAccountActivities({
          accountId: acc.id,
          userId: user.snapTradeUserId,
          userSecret: decryptedSecret,
          startDate: startDate,
          endDate: endDate,
        });

        const activityList = activities.data?.data || [];
        console.log('Total activities returned:', activityList.length);

        if (activityList.length > 0) {
          console.log('');
          console.log('Recent activities:');
          activityList.forEach((activity, idx) => {
            const tradeDate = activity.trade_date || activity.settlement_date || 'Unknown';
            const symbol = activity.symbol?.symbol || activity.option_symbol?.ticker || 'UNKNOWN';
            const snapTradeId = activity.id;

            console.log(`${idx + 1}. ${tradeDate} | ${activity.type} | ${symbol} | Qty: ${activity.units || 0} | Price: $${activity.price || 0} | ID: ${snapTradeId}`);

            // Highlight RKT and NBIS
            if (symbol === 'RKT' || symbol === 'NBIS') {
              console.log('   ⭐ FOUND TARGET SYMBOL: ' + symbol);
            }
          });

          // Check for RKT or NBIS specifically
          const rktActivities = activityList.filter(a =>
            (a.symbol?.symbol === 'RKT' || a.option_symbol?.ticker === 'RKT')
          );
          const nbisActivities = activityList.filter(a =>
            (a.symbol?.symbol === 'NBIS' || a.option_symbol?.ticker === 'NBIS')
          );

          console.log('');
          console.log('RKT trades:', rktActivities.length);
          console.log('NBIS trades:', nbisActivities.length);
        } else {
          console.log('No activities in this date range');
        }
        console.log('');
      } catch (err) {
        console.error('Error fetching activities:', err.message);
        if (err.response) {
          console.error('Response status:', err.response.status);
          console.error('Response data:', JSON.stringify(err.response.data, null, 2));
        }
        console.log('');
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

debugSnapTrade();
