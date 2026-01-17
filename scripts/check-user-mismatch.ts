
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserMismatch() {
    console.log('Checking for user ID mismatches...\n');

    // Get all users
    const users = await prisma.user.findMany({
        include: {
            brokerAccounts: {
                include: {
                    _count: {
                        select: { trades: true }
                    }
                }
            },
            sessions: true,
            accounts: true
        }
    });

    console.log(`Total users in database: ${users.length}\n`);

    users.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  OAuth Accounts: ${user.accounts.length}`);
        console.log(`  Sessions: ${user.sessions.length}`);
        console.log(`  Broker Accounts: ${user.brokerAccounts.length}`);

        const totalTrades = user.brokerAccounts.reduce((sum, acc) => sum + acc._count.trades, 0);
        console.log(`  Total Trades: ${totalTrades}`);

        if (user.sessions.length > 0) {
            console.log(`  ✅ HAS ACTIVE SESSIONS (logged in user)`);
        }
        if (totalTrades > 0) {
            console.log(`  ✅ HAS TRADES (data owner)`);
        }
        console.log('');
    });

    // Check if there's a mismatch
    const userWithSessions = users.find(u => u.sessions.length > 0);
    const userWithTrades = users.find(u =>
        u.brokerAccounts.reduce((sum, acc) => sum + acc._count.trades, 0) > 0
    );

    if (userWithSessions && userWithTrades && userWithSessions.id !== userWithTrades.id) {
        console.log('❌ PROBLEM FOUND:');
        console.log(`   User "${userWithSessions.name}" is logged in (has sessions)`);
        console.log(`   But the trades belong to user "${userWithTrades.name}"`);
        console.log(`   These are DIFFERENT users!`);
        console.log('\nSOLUTION: We need to merge these users or transfer the broker accounts.');
    } else if (!userWithSessions) {
        console.log('❌ No user has sessions - need to log in');
    } else if (userWithSessions.id === userWithTrades?.id) {
        console.log('✅ User with sessions matches user with trades - API should work!');
        console.log('   If dashboard is still empty, check browser console for errors.');
    }
}

checkUserMismatch()
    .catch(e => console.error('Error:', e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
