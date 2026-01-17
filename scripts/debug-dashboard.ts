
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing database access...\n');

    const userCount = await prisma.user.count();
    const tradeCount = await prisma.trade.count();
    const accountCount = await prisma.brokerAccount.count();

    console.log(`User count: ${userCount}`);
    console.log(`Trade count: ${tradeCount}`);
    console.log(`BrokerAccount count: ${accountCount}`);

    if (userCount > 0) {
        const firstUser = await prisma.user.findFirst({
            include: {
                brokerAccounts: {
                    include: {
                        _count: {
                            select: { trades: true }
                        }
                    }
                }
            }
        });

        console.log('\nFirst user details:');
        console.log(`Name: ${firstUser?.name}`);
        console.log(`Email: ${firstUser?.email}`);
        console.log(`Broker accounts: ${firstUser?.brokerAccounts.length}`);
        firstUser?.brokerAccounts.forEach(acc => {
            console.log(`  - ${acc.brokerName}: ${acc._count.trades} trades`);
        });
    }
}

main()
    .catch(e => console.error('Error:', e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
