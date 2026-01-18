import { prisma } from '../src/lib/prisma';
import { encrypt, safeDecrypt } from '../src/lib/encryption';

/**
 * Migration Script: Encrypt Sensitive OAuth Tokens and Account Numbers
 * 
 * This script encrypts existing unencrypted sensitive data in the database:
 * 1. OAuth tokens (refresh_token, access_token, id_token) in Account table
 * 2. Broker account numbers in BrokerAccount table
 * 
 * Run with: npx tsx scripts/migrate-encrypt-sensitive-data.ts
 * 
 * Safety: Uses safeDecrypt to avoid double-encrypting already encrypted data
 */

async function main() {
    console.log('\n🔐 Starting encryption migration for sensitive data...\n');

    let totalUpdated = 0;

    // 1. Encrypt OAuth tokens in Account table
    console.log('📊 Encrypting OAuth tokens in Account table...');

    const accounts = await prisma.account.findMany({
        select: {
            id: true,
            refresh_token: true,
            access_token: true,
            id_token: true,
        }
    });

    console.log(`   Found ${accounts.length} accounts to process`);

    for (const account of accounts) {
        const updates: Record<string, string | null> = {};

        // Encrypt refresh_token if present and not already encrypted
        if (account.refresh_token) {
            // Check if already encrypted by trying to decrypt
            const decrypted = safeDecrypt(account.refresh_token);
            if (decrypted === account.refresh_token) {
                // Not encrypted, encrypt it
                updates.refresh_token = encrypt(account.refresh_token);
            }
        }

        // Encrypt access_token if present and not already encrypted
        if (account.access_token) {
            const decrypted = safeDecrypt(account.access_token);
            if (decrypted === account.access_token) {
                updates.access_token = encrypt(account.access_token);
            }
        }

        // Encrypt id_token if present and not already encrypted
        if (account.id_token) {
            const decrypted = safeDecrypt(account.id_token);
            if (decrypted === account.id_token) {
                updates.id_token = encrypt(account.id_token);
            }
        }

        if (Object.keys(updates).length > 0) {
            await prisma.account.update({
                where: { id: account.id },
                data: updates,
            });
            totalUpdated++;
            console.log(`   ✅ Encrypted ${Object.keys(updates).length} token(s) for account ${account.id}`);
        }
    }

    console.log(`   ✓ Processed ${accounts.length} accounts, updated ${totalUpdated}\n`);

    // 2. Encrypt broker account numbers in BrokerAccount table
    console.log('📊 Encrypting broker account numbers...');

    const brokerAccounts = await prisma.brokerAccount.findMany({
        select: {
            id: true,
            accountNumber: true,
        }
    });

    console.log(`   Found ${brokerAccounts.length} broker accounts to process`);

    let brokerAccountsUpdated = 0;
    for (const brokerAccount of brokerAccounts) {
        if (brokerAccount.accountNumber) {
            // Check if already encrypted
            const decrypted = safeDecrypt(brokerAccount.accountNumber);
            if (decrypted === brokerAccount.accountNumber) {
                // Not encrypted, encrypt it
                await prisma.brokerAccount.update({
                    where: { id: brokerAccount.id },
                    data: {
                        accountNumber: encrypt(brokerAccount.accountNumber),
                    },
                });
                brokerAccountsUpdated++;
                console.log(`   ✅ Encrypted account number for broker account ${brokerAccount.id}`);
            }
        }
    }

    console.log(`   ✓ Processed ${brokerAccounts.length} broker accounts, updated ${brokerAccountsUpdated}\n`);

    console.log('═'.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`   Total OAuth accounts processed: ${accounts.length}`);
    console.log(`   Total OAuth accounts updated: ${totalUpdated}`);
    console.log(`   Total broker accounts processed: ${brokerAccounts.length}`);
    console.log(`   Total broker accounts updated: ${brokerAccountsUpdated}`);
    console.log('═'.repeat(60));
    console.log('\n✨ All sensitive data is now encrypted!\n');
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
