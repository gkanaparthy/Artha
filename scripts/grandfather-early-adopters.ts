import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('--- Grandfathering Early Adopters ---');

    // 1. Snapshot all current users
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            subscriptionStatus: true
        }
    });

    console.log(`Found ${users.length} users in database.`);

    let updatedCount = 0;
    const now = new Date();

    for (const user of users) {
        // Skip users who are already grandfathered or already have an active/paid subscription
        if (['GRANDFATHERED', 'ACTIVE', 'LIFETIME', 'TRIALING'].includes(user.subscriptionStatus)) {
            console.log(` Skipping ${user.email} (Status: ${user.subscriptionStatus})`);
            continue;
        }

        try {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    subscriptionStatus: 'GRANDFATHERED',
                    subscriptionPlan: 'LIFETIME',
                    subscriptionTier: 'REGULAR', // Defaulting to regular for grandfathered
                    isGrandfathered: true,
                    isFounder: false, // Grandfathered users aren't counted as founders for the 100 limit unless they pay
                    grandfatheredAt: now,
                    grandfatheredReason: 'Early Adopter',
                    // Also reset trial fields just in case
                    trialStartedAt: null,
                    trialEndsAt: null
                }
            });
            updatedCount++;
            console.log(` ✓ Grandfathered ${user.email}`);
        } catch (error) {
            console.error(` ✗ Failed to update ${user.email}:`, error);
        }
    }

    console.log(`\nSuccess: Grandfathered ${updatedCount} users.`);
    console.log('--- Process Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
