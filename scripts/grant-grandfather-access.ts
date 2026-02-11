import { prisma } from '../src/lib/prisma';

/**
 * Grant GRANDFATHERED status to a specific user.
 * Usage: pnpm tsx scripts/grant-grandfather-access.ts <email>
 */

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: pnpm tsx scripts/grant-grandfather-access.ts <email>');
        process.exit(1);
    }

    console.log(`--- Granting Grandfather Access to ${email} ---`);

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    const now = new Date();

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                subscriptionStatus: 'GRANDFATHERED',
                subscriptionPlan: 'LIFETIME',
                subscriptionTier: 'REGULAR',
                isGrandfathered: true,
                grandfatheredAt: now,
                grandfatheredReason: 'Individual Grant',
                // Clear trial fields
                trialStartedAt: null,
                trialEndsAt: null
            }
        });
        console.log(` ✅ Successfully grandfathered ${email}`);
        console.log(` New Status: GRANDFATHERED`);
        console.log(` Plan: LIFETIME`);
    } catch (error) {
        console.error(` ✗ Failed to update user:`, error);
        process.exit(1);
    }

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
