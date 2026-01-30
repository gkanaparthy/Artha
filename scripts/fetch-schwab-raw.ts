import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { safeDecrypt } from '../src/lib/encryption';
import { snapTrade } from '../src/lib/snaptrade';

const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst({
        where: { email: 'kgauthamprasad@gmail.com' }
    });

    if (!user || !user.snapTradeUserId || !user.snapTradeUserSecret) {
        console.log('User or SnapTrade credentials not found');
        return;
    }

    const secret = safeDecrypt(user.snapTradeUserSecret);
    if (!secret) {
        console.log('Failed to decrypt secret');
        return;
    }

    const accountId = '2b96f604-cc61-444a-bdfe-27f92d3a744a'; // Schwab 6893
    console.log(`Fetching activities for Schwab 6893 (ID: ${accountId})...`);

    const yesterday = '2026-01-20'; // Just the last week
    const today = '2026-01-28';

    try {
        const response = await snapTrade.accountInformation.getAccountActivities({
            userId: user.snapTradeUserId,
            userSecret: secret,
            accountId: accountId,
            startDate: yesterday,
            endDate: today,
        });

        // The SDK might return nested data
        const activities = (response as any).data?.data || (response as any).data || [];
        console.log(`Received ${activities.length} activities for Jan 27-28`);

        activities.forEach((a: any) => {
            console.log(JSON.stringify(a, null, 2));
        });

    } catch (e: any) {
        console.error('SnapTrade API Error:', e.response?.data || e.message);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
