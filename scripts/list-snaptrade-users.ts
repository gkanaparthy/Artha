import 'dotenv/config';
import { snapTrade } from "../src/lib/snaptrade";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listSnapTradeUsers() {
    console.log('Fetching all SnapTrade users...\n');

    try {
        // List all users registered in SnapTrade
        const response = await snapTrade.authentication.listSnapTradeUsers();
        const snapTradeUsers = response.data || [];

        console.log(`Total SnapTrade users: ${snapTradeUsers.length}\n`);

        // Debug: Show first user structure
        if (snapTradeUsers.length > 0) {
            console.log('Sample user object:', JSON.stringify(snapTradeUsers[0], null, 2), '\n');
        }

        // Get local users
        const localUsers = await prisma.user.findMany({
            select: { snapTradeUserId: true, name: true, email: true }
        });

        const localSnapTradeIds = new Set(localUsers.map(u => u.snapTradeUserId).filter(Boolean));

        console.log('Active users (in local database):');
        localUsers.forEach(u => {
            if (u.snapTradeUserId) {
                console.log(`  ✅ ${u.name} (${u.email}) - ${u.snapTradeUserId}`);
            }
        });

        console.log('\nSnapTrade users analysis:');
        const orphanedUsers: string[] = [];

        snapTradeUsers.forEach((userId: string) => {
            const isActive = localSnapTradeIds.has(userId);

            if (isActive) {
                console.log(`  ✅ KEEP: ${userId} (Active user)`);
            } else {
                console.log(`  ❌ DELETE: ${userId} (Orphaned - not in local DB)`);
                orphanedUsers.push(userId);
            }
        });

        console.log(`\n📊 Summary:`);
        console.log(`   Active: ${localSnapTradeIds.size}`);
        console.log(`   Orphaned: ${orphanedUsers.length}`);
        console.log(`   Total: ${snapTradeUsers.length}`);

        if (orphanedUsers.length > 0) {
            console.log(`\n⚠️  To delete orphaned users, run the cleanup script.`);
        } else {
            console.log(`\n✅ No orphaned users found!`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

listSnapTradeUsers();
