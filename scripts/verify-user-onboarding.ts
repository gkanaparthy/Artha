import { PrismaClient } from '@prisma/client';
import { snapTrade } from '../src/lib/snaptrade';
import { safeDecrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function verifyUserOnboarding(email: string) {
    console.log(`\n🔍 Verifying onboarding for: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: { brokerAccounts: true }
    });

    if (!user) {
        console.log('❌ User not found in database');
        return;
    }

    console.log(`   Internal ID: ${user.id}`);
    console.log(`   SnapTrade ID: ${user.snapTradeUserId || 'NOT SET'}`);
    console.log(`   Onboarding Completed: ${user.onboardingCompleted}`);
    console.log(`   Local Broker Accounts: ${user.brokerAccounts.length}`);

    if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
        console.log('⚠️  User has not started SnapTrade registration');
        return;
    }

    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
    if (!decryptedSecret) {
        console.log('❌ Failed to decrypt SnapTrade secret');
        return;
    }

    console.log('📡 Fetching accounts from SnapTrade API...');
    try {
        const response = await snapTrade.accountInformation.listUserAccounts({
            userId: user.snapTradeUserId,
            userSecret: decryptedSecret,
        });

        const remoteAccounts = response.data || [];
        console.log(`   Remote Accounts found: ${remoteAccounts.length}`);

        if (remoteAccounts.length > 0) {
            remoteAccounts.forEach(acc => {
                console.log(`     - ${acc.institution_name} (${acc.name}) [${acc.id}]`);
            });

            // If we have remote accounts but no local broker accounts, we need to sync!
            if (user.brokerAccounts.length === 0) {
                console.log('\n🚨 DISCREPANCY DETECTED: User has broker accounts in SnapTrade but not in our DB!');
                console.log('   We might need to trigger a manual account sync or check why the initial sync failed.');
            }
        } else {
            console.log('📋 No accounts linked in SnapTrade yet.');
        }

    } catch (error: any) {
        console.error('❌ Error calling SnapTrade API:', error.message);
    }
}

const email = process.argv[2];
if (!email) {
    console.error('Usage: npx tsx scripts/verify-user-onboarding.ts <email>');
    process.exit(1);
}

verifyUserOnboarding(email)
    .catch(console.error)
    .finally(() => prisma.$disconnect());
