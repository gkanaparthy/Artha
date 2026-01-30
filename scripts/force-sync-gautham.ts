import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SnapTradeService } from '../src/lib/services/snaptrade.service';

const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst({
        where: { email: 'kgauthamprasad@gmail.com' }
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`Force syncing trades for Gautham Kanaparthy...`);
    const service = new SnapTradeService();
    const result = await service.syncTrades(user.id);

    console.log('Sync Result:', JSON.stringify(result, null, 2));

    // Check Schwab 6893 specifically
    const account = await prisma.brokerAccount.findFirst({
        where: {
            userId: user.id,
            snapTradeAccountId: '2b96f604-cc61-444a-bdfe-27f92d3a744a'
        },
        include: {
            _count: {
                select: { trades: true }
            }
        }
    });

    if (account) {
        const start = new Date('2026-01-27T00:00:00Z');
        const end = new Date('2026-01-28T00:00:00Z');
        const yesterdayTrades = await prisma.trade.findMany({
            where: {
                accountId: account.id,
                timestamp: { gte: start, lt: end }
            }
        });
        console.log(`Yesterday's trades for Schwab 6893 after sync: ${yesterdayTrades.length}`);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
