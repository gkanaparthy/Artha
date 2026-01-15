import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFees() {
    const userId = 'cmk95esou000012nso4n7zgdl';

    console.log('=== Checking Trade Fees ===\n');

    const dbTrades = await prisma.trade.findMany({
        where: {
            account: { userId },
            fees: { gt: 0 }
        },
        take: 10,
        select: {
            symbol: true,
            quantity: true,
            fees: true,
            contractMultiplier: true
        }
    });

    dbTrades.forEach(t => {
        const feePerUnit = t.fees / Math.abs(t.quantity);
        console.log(`${t.symbol.padEnd(30)} | qty: ${t.quantity} | fees: ${t.fees} | feePerUnit: ${feePerUnit.toFixed(4)}`);
    });

    await prisma.$disconnect();
}

checkFees().catch(console.error);
