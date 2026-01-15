import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function traceSpecificSymbol() {
    const userId = 'cmk95esou000012nso4n7zgdl';
    const symbol = 'SPXW  260106C06930000';

    console.log(`=== Tracing Symbol: ${symbol} ===\n`);

    const dbTrades = await prisma.trade.findMany({
        where: {
            account: { userId },
            symbol: symbol
        },
        orderBy: { timestamp: 'asc' }
    });

    console.log(`Trades in DB: ${dbTrades.length}`);
    dbTrades.forEach(t => {
        console.log(`  ${t.timestamp.toISOString()} | ${t.action.padEnd(10)} | qty:${t.quantity} | price:${t.price} | mult:${t.contractMultiplier}`);
    });

    await prisma.$disconnect();
}

traceSpecificSymbol().catch(console.error);
