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
    if (!secret) return;

    const accountId = '2b96f604-cc61-444a-bdfe-27f92d3a744a'; // Schwab 6893
    console.log(`Checking POSITIONS for Schwab 6893...`);

    try {
        const response = await snapTrade.accountInformation.getUserAccountPositions({
            userId: user.snapTradeUserId,
            userSecret: secret,
            accountId: accountId,
        });

        const positions = (response as any).data || [];
        console.log(`Current Positions: ${positions.length}`);
        positions.forEach((p: any) => {
            console.log(JSON.stringify(p, null, 2));
        });

    } catch (e: any) {
        console.error('SnapTrade API Error:', e.response?.data || e.message);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
