import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMultipliers() {
    const userId = 'cmk95esou000012nso4n7zgdl';

    console.log('=== Checking Contract Multipliers in DB ===\n');

    // Get ORCL trades
    const orclTrades = await prisma.trade.findMany({
        where: {
            account: { userId },
            symbol: { contains: 'ORCL' }
        },
        select: {
            id: true,
            symbol: true,
            action: true,
            quantity: true,
            price: true,
            contractMultiplier: true,
            type: true,
            timestamp: true
        },
        orderBy: { timestamp: 'asc' }
    });

    console.log(`ORCL trades in DB: ${orclTrades.length}\n`);

    orclTrades.forEach(t => {
        console.log(`${t.timestamp.toISOString().split('T')[0]} | ${t.symbol.padEnd(30)} | ${t.action.padEnd(5)} | mult:${t.contractMultiplier} | type:${t.type || 'NULL'}`);
    });

    // Check for any trades with incorrect multiplier
    const stocksWithBadMult = orclTrades.filter(t =>
        !t.symbol.match(/\d{6}[CP]\d{8}/) && // Not an option (no OSI format)
        t.contractMultiplier !== 1
    );

    console.log(`\n❌ Stock trades with wrong multiplier: ${stocksWithBadMult.length}`);

    if (stocksWithBadMult.length > 0) {
        console.log('\nThese should have multiplier = 1:');
        stocksWithBadMult.forEach(t => {
            console.log(`  ${t.symbol} | mult:${t.contractMultiplier} (SHOULD BE 1)`);
        });
    }

    await prisma.$disconnect();
}

checkMultipliers().catch(console.error);
