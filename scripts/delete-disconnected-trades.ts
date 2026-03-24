import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.brokerAccount.findMany({
        where: { disabledReason: 'User disconnected - will not sync' },
        include: {
            user: true,
            _count: {
                select: { trades: true }
            }
        }
    });

    console.log(`Found ${accounts.length} explicitly disconnected accounts.`);

    let totalTradesDeleted = 0;

    for (const acc of accounts) {
        console.log(`Account ID: ${acc.id}`);
        console.log(`  User: ${acc.user.email}`);
        console.log(`  Broker: ${acc.brokerName}`);
        console.log(`  Trades pending deletion: ${acc._count.trades}`);

        if (acc._count.trades > 0) {
            const deleted = await prisma.trade.deleteMany({
                where: { accountId: acc.id }
            });
            console.log(`  -> Deleted ${deleted.count} trades.`);
            totalTradesDeleted += deleted.count;
        }
    }

    console.log(`\nDone. Total trades deleted: ${totalTradesDeleted}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
