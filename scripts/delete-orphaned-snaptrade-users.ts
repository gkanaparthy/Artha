import 'dotenv/config';
import { snapTrade } from "../src/lib/snaptrade";
import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

async function deleteOrphanedSnapTradeUsers() {
    console.log('🔍 Finding orphaned SnapTrade users...\n');

    try {
        // List all users in SnapTrade
        const response = await snapTrade.authentication.listSnapTradeUsers();
        const snapTradeUsers = response.data as string[] || [];

        // Get local users
        const localUsers = await prisma.user.findMany({
            select: { snapTradeUserId: true, name: true, email: true }
        });

        const localSnapTradeIds = new Set(localUsers.map(u => u.snapTradeUserId).filter(Boolean));

        // Whitelist: SnapTrade users to KEEP even if not in local database
        // Add user IDs here that should NOT be deleted (e.g., demo users, test accounts)
        const WHITELIST = new Set([
            'DEMO_USER', // Used for public demo
            // Add more user IDs here if needed
        ]);

        // Find orphaned users (not in local DB AND not in whitelist)
        const orphanedUsers: string[] = [];
        const activeUsers: string[] = [];
        const whitelistedUsers: string[] = [];

        snapTradeUsers.forEach((userId: string) => {
            if (localSnapTradeIds.has(userId)) {
                activeUsers.push(userId);
            } else if (WHITELIST.has(userId)) {
                whitelistedUsers.push(userId);
            } else {
                orphanedUsers.push(userId);
            }
        });

        console.log(`📊 Summary:`);
        console.log(`   Total SnapTrade users: ${snapTradeUsers.length}`);
        console.log(`   Active (keep): ${activeUsers.length}`);
        console.log(`   Whitelisted (keep): ${whitelistedUsers.length}`);
        console.log(`   Orphaned (delete): ${orphanedUsers.length}\n`);

        if (orphanedUsers.length === 0) {
            console.log('✅ No orphaned users found. Nothing to do!');
            return;
        }

        console.log('Active users (will keep):');
        activeUsers.forEach(id => {
            const user = localUsers.find(u => u.snapTradeUserId === id);
            console.log(`  ✅ ${user?.name || id}`);
        });

        if (whitelistedUsers.length > 0) {
            console.log('\nWhitelisted users (will keep):');
            whitelistedUsers.forEach(id => {
                console.log(`  ✅ ${id} (whitelisted)`);
            });
        }

        console.log('\nOrphaned users (will delete):');
        orphanedUsers.forEach(id => {
            console.log(`  ❌ ${id}`);
        });

        console.log('\n⚠️  WARNING: This action is IRREVERSIBLE!');
        console.log('⚠️  Deleting these users from SnapTrade will disconnect their broker accounts.');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise<string>((resolve) => {
            rl.question('\nType "DELETE" to confirm deletion, or anything else to cancel: ', resolve);
        });

        rl.close();

        if (answer.trim() !== 'DELETE') {
            console.log('\n❌ Cancelled. No users were deleted.');
            return;
        }

        console.log('\n🗑️  Deleting orphaned users...\n');

        let successCount = 0;
        let failCount = 0;

        for (const userId of orphanedUsers) {
            try {
                await snapTrade.authentication.deleteSnapTradeUser({ userId });
                console.log(`  ✅ Deleted: ${userId}`);
                successCount++;
            } catch (error: any) {
                console.error(`  ❌ Failed to delete ${userId}:`, error.message);
                failCount++;
            }
        }

        console.log(`\n✅ Done!`);
        console.log(`   Successfully deleted: ${successCount}`);
        if (failCount > 0) {
            console.log(`   Failed: ${failCount}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

deleteOrphanedSnapTradeUsers();
