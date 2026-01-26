import { PrismaClient, TagCategory } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TAGS = [
    // Setup Tags
    { name: 'Breakout', category: TagCategory.SETUP, color: '#10B981', description: 'Price breaking through resistance/support' },
    { name: 'Pullback', category: TagCategory.SETUP, color: '#3B82F6', description: 'Entry on a retracement in trend direction' },
    { name: 'Reversal', category: TagCategory.SETUP, color: '#F59E0B', description: 'Betting on trend change' },
    { name: 'Momentum', category: TagCategory.SETUP, color: '#8B5CF6', description: 'Following strong directional move' },
    { name: 'Earnings', category: TagCategory.SETUP, color: '#EC4899', description: 'Trade around earnings announcement' },

    // Mistake Tags
    { name: 'Early Entry', category: TagCategory.MISTAKE, color: '#EF4444', description: 'Entered before confirmation' },
    { name: 'Late Entry', category: TagCategory.MISTAKE, color: '#F97316', description: 'Chased after move already happened' },
    { name: 'Oversized', category: TagCategory.MISTAKE, color: '#DC2626', description: 'Position too large for account' },
    { name: 'No Stop Loss', category: TagCategory.MISTAKE, color: '#B91C1C', description: 'Failed to set or honor stop' },
    { name: 'Broke Rules', category: TagCategory.MISTAKE, color: '#7F1D1D', description: 'Violated trading plan' },

    // Emotion Tags
    { name: 'FOMO', category: TagCategory.EMOTION, color: '#F59E0B', description: 'Fear of missing out drove entry' },
    { name: 'Revenge Trade', category: TagCategory.EMOTION, color: '#EF4444', description: 'Trying to recover losses aggressively' },
    { name: 'Hesitation', category: TagCategory.EMOTION, color: '#6B7280', description: 'Delayed entry/exit due to fear' },
    { name: 'Overconfidence', category: TagCategory.EMOTION, color: '#8B5CF6', description: 'Took excessive risk after wins' },
    { name: 'Calm & Focused', category: TagCategory.EMOTION, color: '#10B981', description: 'Executed plan without emotion' }
];

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, email: true }
    });

    console.log(`Found ${users.length} users to seed tags for.`);

    for (const user of users) {
        console.log(`Seeding tags for user: ${user.email} (${user.id})`);

        let createdCount = 0;
        let skippedCount = 0;

        for (const tag of DEFAULT_TAGS) {
            const existing = await prisma.tagDefinition.findUnique({
                where: {
                    userId_name: {
                        userId: user.id,
                        name: tag.name
                    }
                }
            });

            if (!existing) {
                await prisma.tagDefinition.create({
                    data: {
                        ...tag,
                        userId: user.id,
                        isDefault: true
                    }
                });
                createdCount++;
            } else {
                skippedCount++;
            }
        }
        console.log(`  - Created ${createdCount} tags, skipped ${skippedCount} existing tags.`);
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
