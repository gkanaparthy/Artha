// Test script to manually call SnapTrade API for Suman's accounts
// This will show us what SnapTrade is actually returning

import { snapTrade } from '@/lib/snaptrade';
import { PrismaClient } from '@prisma/client';
import { safeDecrypt } from '@/lib/encryption';

const prisma = new PrismaClient();

async function testSnapTradeAPI() {
    try {
        const user = await prisma.user.findFirst({
            where: { email: 'spulusu@gmail.com' },
            include: { brokerAccounts: true }
        });

        if (!user || !user.snapTradeUserId || !user.snapTradeUserSecret) {
            console.log('User or credentials not found');
            return;
        }

        const userSecret = safeDecrypt(user.snapTradeUserSecret);
        if (!userSecret) {
            console.log('Failed to decrypt secret');
            return;
        }

        console.log('=== TESTING SNAPTRADE API ===\n');
        console.log('User:', user.email);
        console.log('SnapTrade User ID:', user.snapTradeUserId);
        console.log(`Accounts: ${user.brokerAccounts.length}\n`);

        // Test each account
        for (const account of user.brokerAccounts) {
            console.log(`\n=== ${account.brokerName} (${account.snapTradeAccountId}) ===`);

            try {
                // Fetch activities for Friday specifically
                const friday = '2026-01-17';
                const saturday = '2026-01-18';

                console.log(`Fetching activities from ${friday} to ${saturday}...`);

                const activities = await snapTrade.accountInformation.getAccountActivities({
                    accountId: account.snapTradeAccountId,
                    userId: user.snapTradeUserId,
                    userSecret: userSecret,
                    startDate: friday,
                    endDate: saturday,
                });

                const activityList = activities.data?.data || [];
                console.log(`✅ SnapTrade returned ${activityList.length} activities for Friday`);

                if (activityList.length > 0) {
                    console.log('\nFriday activities from SnapTrade:');
                    for (const activity of activityList.slice(0, 10)) {
                        const tradeDate = activity.trade_date || activity.tradeDate;
                        const settlementDate = activity.settlement_date || activity.settlementDate;
                        console.log(`  • ID: ${activity.id}`);
                        console.log(`    Type: ${activity.type}`);
                        console.log(`    Symbol: ${activity.symbol?.symbol || 'N/A'}`);
                        console.log(`    Trade Date: ${tradeDate}`);
                        console.log(`    Settlement Date: ${settlementDate}`);
                        console.log(`    Units: ${activity.units}`);
                        console.log(`    Price: ${activity.price}`);
                        console.log('');
                    }
                } else {
                    console.log('⚠️  SnapTrade returned NO activities for Friday');
                    console.log('   This means Friday trades either:');
                    console.log('   - Haven\'t settled yet in E*Trade');
                    console.log('   - Are pending in SnapTrade\'s cache');
                    console.log('   - Never happened');
                }

            } catch (error) {
                console.error(`❌ Error fetching activities:`, error);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testSnapTradeAPI();
