import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const account = await prisma.brokerAccount.findFirst({
        where: { snapTradeAccountId: '2b96f604-cc61-444a-bdfe-27f92d3a744a' }
    });

    if (!account) {
        console.log('Account not found');
        return;
    }

    console.log(`Checking account: ${account.brokerName} ending in 6893`);

    // Check trades for the last 7 days
    const start = new Date('2026-01-20T00:00:00Z');
    const trades = await prisma.trade.findMany({
        where: {
            accountId: account.id,
            timestamp: { gte: start }
        },
        orderBy: { timestamp: 'desc' }
    });

    console.log(`Trades in the last 7+ days: ${trades.length}`);
    trades.forEach(t => {
        console.log(` - ${t.timestamp.toISOString()} | ${t.action} ${t.quantity} ${t.symbol} @ $${t.price}`);
    });
}

run().catch(console.error).finally(() => prisma.$disconnect());
