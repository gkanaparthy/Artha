import { PrismaClient } from '@prisma/client';
import { generatePositionKey, parsePositionKey } from '../src/lib/utils/position-key';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration of legacy position keys to v1 format...');

    // 1. Migrate PositionTag table
    const positionTags = await prisma.positionTag.findMany();
    console.log(`Found ${positionTags.length} position tags. Checking for legacy keys...`);

    let ptUpdated = 0;
    for (const tag of positionTags) {
        if (!tag.positionKey.startsWith('v1|')) {
            const parsed = parsePositionKey(tag.positionKey);
            if (parsed) {
                const newKey = generatePositionKey(parsed.accountId, parsed.symbol, parsed.openedAt);

                try {
                    // We need to be careful about unique constraint: @@unique([positionKey, tagDefinitionId])
                    // If a record with the newKey already exists (unlikely but possible), we might need to merge or delete.
                    await prisma.positionTag.update({
                        where: { id: tag.id },
                        data: { positionKey: newKey }
                    });
                    ptUpdated++;
                } catch (err) {
                    console.error(`Failed to update PositionTag ${tag.id}: ${err}`);
                }
            } else {
                console.warn(`Could not parse legacy key: ${tag.positionKey}`);
            }
        }
    }
    console.log(`Updated ${ptUpdated} PositionTag records.`);

    // 2. Migrate Trade table (Optional if backfill is run, but good for safety)
    const tradesWithKeys = await prisma.trade.findMany({
        where: {
            positionKey: {
                not: null,
                not: {
                    startsWith: 'v1|'
                }
            } as any // Bypass lint for now if needed
        }
    });

    console.log(`Found ${tradesWithKeys.length} trades with legacy keys. Updating...`);

    let tUpdated = 0;
    for (const trade of tradesWithKeys) {
        if (trade.positionKey && !trade.positionKey.startsWith('v1|')) {
            const parsed = parsePositionKey(trade.positionKey);
            if (parsed) {
                const newKey = generatePositionKey(parsed.accountId, parsed.symbol, parsed.openedAt);
                await prisma.trade.update({
                    where: { id: trade.id },
                    data: { positionKey: newKey }
                });
                tUpdated++;
            }
        }
    }
    console.log(`Updated ${tUpdated} Trade records.`);

    console.log('Migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
