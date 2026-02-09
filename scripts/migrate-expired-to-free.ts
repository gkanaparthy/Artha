import { prisma } from '../src/lib/prisma';

/**
 * One-time migration: EXPIRED → FREE
 *
 * This script updates users with EXPIRED status to the new FREE status.
 * FREE represents the free tier (trial expired or subscription ended).
 *
 * SAFE: Only performs UPDATE operations. No data is deleted.
 * IDEMPOTENT: Can be run multiple times safely.
 *
 * Run: pnpm tsx scripts/migrate-expired-to-free.ts
 */
async function main() {
    console.log('--- Migrating EXPIRED users to FREE ---');

    // Find all EXPIRED users
    const expiredUsers = await prisma.user.findMany({
        where: { subscriptionStatus: 'EXPIRED' },
        select: { id: true, email: true, subscriptionStatus: true },
    });

    console.log(`Found ${expiredUsers.length} users with EXPIRED status.`);

    if (expiredUsers.length === 0) {
        console.log('Nothing to migrate.');
        await prisma.$disconnect();
        return;
    }

    // Batch update all EXPIRED → FREE
    const result = await prisma.user.updateMany({
        where: { subscriptionStatus: 'EXPIRED' },
        data: { subscriptionStatus: 'FREE' },
    });

    console.log(`Updated ${result.count} users from EXPIRED to FREE.`);

    // Log individual users for audit trail
    for (const user of expiredUsers) {
        console.log(`  Migrated: ${user.email} (${user.id})`);
    }

    await prisma.$disconnect();
    console.log('--- Migration complete ---');
}

main().catch((e) => {
    console.error('Migration failed:', e);
    prisma.$disconnect();
    process.exit(1);
});
