import { prisma } from '../src/lib/prisma';

/**
 * Reset an account to PENDING to test the auto-retry flow.
 * Usage: pnpm tsx scripts/reset-sync-status.ts <userEmail>
 */

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: pnpm tsx scripts/reset-sync-status.ts <userEmail>');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { brokerAccounts: true }
    });

    if (!user) {
        console.error('User not found');
        process.exit(1);
    }

    console.log(`User: ${user.name} (${user.id})`);

    for (const acc of user.brokerAccounts) {
        console.log(`Resetting account: ${acc.brokerName || acc.snapTradeAccountId}`);
        await prisma.brokerAccount.update({
            where: { id: acc.id },
            data: {
                syncStatus: 'PENDING',
                syncRetryCount: 0,
                syncError: null,
                // Make it look "old" so retry picks it up immediately if needed
                updatedAt: new Date(Date.now() - 5 * 60 * 1000)
            }
        });
    }

    console.log('✅ Accounts reset to PENDING. Now open the dashboard or call /api/trades/sync-retry');
}

main().catch(console.error);
