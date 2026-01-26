import { PrismaClient } from '@prisma/client';
import { tradeGroupingService } from '../src/lib/services/trade-grouping.service';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting full recalculation of positionKeys via Service...');

    // Get all unique groups
    const groups = await prisma.trade.findMany({
        select: {
            accountId: true,
            symbol: true
        },
        distinct: ['accountId', 'symbol']
    });

    console.log(`Identified ${groups.length} unique symbol-account groups.`);

    let count = 0;
    for (const group of groups) {
        await tradeGroupingService.recalculatePositionKeys(group.accountId, group.symbol);
        count++;
        if (count % 100 === 0) {
            console.log(`Processed ${count} / ${groups.length} groups`);
        }
    }

    console.log('Position Key Backfill Completed Successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
