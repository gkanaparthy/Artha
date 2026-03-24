import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            name: {
                contains: 'Suman',
                mode: 'insensitive',
            },
        },
        include: {
            brokerAccounts: true,
        },
    });

    if (users.length === 0) {
        console.log('User Suman Pulusu not found.');
        return;
    }

    // Assuming Suman is the only one or we'll loop through users just in case
    const user = users.find(u => u.name?.toLowerCase().includes('suman') || u.email?.toLowerCase().includes('suman'));

    if (!user) {
        console.log('No user matched.');
        return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);

    const eTradeAccounts = user.brokerAccounts.filter(acc => acc.brokerName?.toLowerCase().includes('e-trade') || acc.brokerName?.toLowerCase().includes('etrade'));

    console.log(`Found ${eTradeAccounts.length} E-Trade accounts.`);

    for (const account of eTradeAccounts) {
        console.log(`Processing E-Trade account: ${account.id} - ${account.accountNumber}`);

        // Delete TradeGroups
        const deletedGroups = await prisma.tradeGroup.deleteMany({
            where: {
                accountId: account.id,
            },
        });
        console.log(`Deleted ${deletedGroups.count} TradeGroups for account ${account.id}`);

        // Delete Trades
        const deletedTrades = await prisma.trade.deleteMany({
            where: {
                accountId: account.id,
            },
        });
        console.log(`Deleted ${deletedTrades.count} Trades for account ${account.id}`);

        // Delete BrokerAccount
        const deletedBrokerInfo = await prisma.brokerAccount.delete({
            where: {
                id: account.id,
            },
        });
        console.log(`Deleted BrokerAccount ${account.id}`);
    }

    console.log('Finished deleting all E-Trade accounts for the user.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
