import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { safeDecrypt } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst({
        where: { email: 'kgauthamprasad@gmail.com' },
        include: { brokerAccounts: true }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`User: ${user.name}`);
    for (const acc of user.brokerAccounts) {
        const decryptedNum = acc.accountNumber ? safeDecrypt(acc.accountNumber) : 'N/A';
        console.log(`Broker: ${acc.brokerName} | Decrypted Acc#: ${decryptedNum} | SnapTrade ID: ${acc.snapTradeAccountId} | Disabled: ${acc.disabled}`);

        if (decryptedNum.endsWith('6893')) {
            console.log('🎯 Found the target account!');

            // Check trades for this specific account from Jan 27, 2026
            const start = new Date('2026-01-27T00:00:00Z');
            const end = new Date('2026-01-28T00:00:00Z');
            const trades = await prisma.trade.findMany({
                where: {
                    accountId: acc.id,
                    timestamp: { gte: start, lt: end }
                }
            });
            console.log(`Yesterday's trades for this account: ${trades.length}`);

            if (trades.length === 0) {
                // Check SnapTrade for this account
                console.log('Checking why no trades found...');
                // We can't easily check SnapTrade here without full environment, 
                // but let's see when it was last synced.
                console.log(`Last Synced At: ${acc.lastSyncedAt}`);
                console.log(`Last Checked At: ${acc.lastCheckedAt}`);
            }
        }
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
