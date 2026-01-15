import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDupes() {
    const userId = 'cmk95esou000012nso4n7zgdl';

    console.log('=== Finding Potential Duplicates ===\n');

    const dbTrades = await prisma.trade.findMany({
        where: { account: { userId } },
        orderBy: { timestamp: 'asc' }
    });

    const seen = new Map<string, any>();
    let totalDupes = 0;

    for (const t of dbTrades) {
        // Content-based key (ignoring timestamp precision and ID)
        const key = `${t.symbol}|${t.action}|${t.quantity}|${t.price}`;

        if (seen.has(key)) {
            const prev = seen.get(key);
            // If they are within 1 minute of each other, they are likely duplicates
            const diffMs = Math.abs(t.timestamp.getTime() - prev.timestamp.getTime());
            if (diffMs < 60000) {
                console.log(`DUPE FOUND: ${t.symbol} | ${t.action} | qty:${t.quantity} | price:${t.price}`);
                console.log(`  T1: ${prev.timestamp.toISOString()} (ID: ${prev.id.slice(-6)})`);
                console.log(`  T2: ${t.timestamp.toISOString()} (ID: ${t.id.slice(-6)})`);
                console.log(`  Diff: ${diffMs / 1000}s\n`);
                totalDupes++;
                continue;
            }
        }
        seen.set(key, t);
    }

    console.log(`Total potential duplicates found: ${totalDupes}`);

    await prisma.$disconnect();
}

findDupes().catch(console.error);
