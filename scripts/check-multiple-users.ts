
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMultipleUsers() {
    const users = await prisma.user.findMany({
        include: {
            accounts: true,
            brokerAccounts: {
                include: {
                    _count: { select: { trades: true } }
                }
            }
        }
    });

    console.log(`\nTotal users in database: ${users.length}\n`);

    users.forEach((user, i) => {
        const tradeCount = user.brokerAccounts.reduce((sum, acc) => sum + acc._count.trades, 0);
        console.log(`User ${i + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  OAuth Links: ${user.accounts.length}`);
        console.log(`  Broker Accounts: ${user.brokerAccounts.length}`);
        console.log(`  Total Trades: ${tradeCount}`);
        console.log('');
    });

    if (users.length > 1) {
        console.log('❌ PROBLEM: Multiple users exist!');
        console.log('   You keep creating new users each time you log in.');
        console.log('   The trades belong to one user, but you\'re logging in as another.');
    }
}

checkMultipleUsers()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
