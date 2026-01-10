/**
 * Migration Script: Encrypt existing SnapTrade secrets
 * 
 * This script finds all users with unencrypted snapTradeUserSecret
 * and encrypts them. Run this once after deploying the encryption update.
 * 
 * Usage: npx ts-node --project tsconfig.json scripts/migrate-encrypt-secrets.ts
 * Or via API: POST /api/admin/migrate-secrets (with admin auth)
 */

import { prisma } from '@/lib/prisma';
import { encrypt, isEncrypted } from '@/lib/encryption';

async function migrateSecrets() {
    console.log('Starting secrets encryption migration...');

    // Find all users with SnapTrade secrets
    const users = await prisma.user.findMany({
        where: {
            snapTradeUserSecret: { not: null }
        },
        select: {
            id: true,
            email: true,
            snapTradeUserSecret: true,
        }
    });

    console.log(`Found ${users.length} users with SnapTrade secrets`);

    let encrypted = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
        try {
            if (!user.snapTradeUserSecret) {
                skipped++;
                continue;
            }

            // Check if already encrypted
            if (isEncrypted(user.snapTradeUserSecret)) {
                console.log(`User ${user.id} (${user.email}): Already encrypted, skipping`);
                skipped++;
                continue;
            }

            // Encrypt the secret
            const encryptedSecret = encrypt(user.snapTradeUserSecret);

            // Update in database
            await prisma.user.update({
                where: { id: user.id },
                data: { snapTradeUserSecret: encryptedSecret }
            });

            console.log(`User ${user.id} (${user.email}): Encrypted successfully`);
            encrypted++;

        } catch (error) {
            console.error(`User ${user.id} (${user.email}): Failed to encrypt`, error);
            failed++;
        }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Encrypted: ${encrypted}`);
    console.log(`Skipped (already encrypted): ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${users.length}`);

    return { encrypted, skipped, failed, total: users.length };
}

// Export for use as module or API
export { migrateSecrets };

// Run if executed directly
if (require.main === module) {
    migrateSecrets()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Migration failed:', err);
            process.exit(1);
        });
}
