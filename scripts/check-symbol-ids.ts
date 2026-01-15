import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSymbolIds() {
    const userId = 'cmk95esou000012nso4n7zgdl';

    console.log('=== Checking Universal Symbol IDs ===\n');

    const dbTrades = await prisma.trade.findMany({
        where: {
            account: { userId },
            symbol: { contains: 'ORCL' }
        },
        select: {
            id: true,
            symbol: true,
            universalSymbolId: true,
            contractMultiplier: true,
            type: true
        }
    });

    dbTrades.forEach(t => {
        console.log(`${t.symbol.padEnd(30)} | ID: ${String(t.universalSymbolId).padEnd(40)} | mult: ${t.contractMultiplier}`);
    });

    await prisma.$disconnect();
}

checkSymbolIds().catch(console.error);
