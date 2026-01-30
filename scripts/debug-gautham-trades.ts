import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugUserTrades(searchName: string) {
    try {
        console.log(`🔍 Searching for user: "${searchName}"`);
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { name: { contains: searchName, mode: 'insensitive' } },
                    { email: { contains: searchName, mode: 'insensitive' } }
                ]
            },
            include: {
                brokerAccounts: {
                    select: {
                        id: true,
                        brokerName: true,
                        accountNumber: true,
                        lastSyncedAt: true,
                        lastCheckedAt: true,
                        disabled: true,
                        _count: {
                            select: { trades: true }
                        }
                    }
                }
            }
        });

        if (!user) {
            console.log(`❌ User "${searchName}" not found in database`);
            const allUsers = await prisma.user.findMany({ select: { name: true, email: true } });
            console.log('\nAll users in DB:');
            allUsers.forEach(u => console.log(` - ${u.name} (${u.email})`));
            return;
        }

        console.log(`✅ Found user: ${user.name} (${user.email})`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Broker Accounts: ${user.brokerAccounts.length}`);

        for (const account of user.brokerAccounts) {
            console.log(`\n📊 Broker: ${account.brokerName}`);
            console.log(`   Account ID: ${account.id}`);
            console.log(`   Account #: ****${account.accountNumber?.slice(-4)}`);
            console.log(`   Status: ${account.disabled ? '🔴 DISABLED' : '🟢 ACTIVE'}`);
            console.log(`   Last Synced At: ${account.lastSyncedAt}`);
            console.log(`   Last Checked At: ${account.lastCheckedAt}`);
            console.log(`   Total Trades: ${account._count.trades}`);

            // Check for trades from yesterday (Jan 27, 2026)
            const start = new Date('2026-01-27T00:00:00Z');
            const end = new Date('2026-01-28T00:00:00Z');

            const yesterdayTrades = await prisma.trade.findMany({
                where: {
                    accountId: account.id,
                    timestamp: {
                        gte: start,
                        lt: end
                    }
                },
                orderBy: { timestamp: 'desc' }
            });

            console.log(`   Yesterday's Trades (Jan 27): ${yesterdayTrades.length}`);
            yesterdayTrades.forEach(t => {
                console.log(`    • ${t.timestamp.toISOString()} | ${t.action} ${t.quantity} ${t.symbol} @ $${t.price}`);
            });

            // If no trades from yesterday, check the very last trades for this account
            if (yesterdayTrades.length === 0) {
                const lastTrades = await prisma.trade.findMany({
                    where: { accountId: account.id },
                    orderBy: { timestamp: 'desc' },
                    take: 3
                });
                if (lastTrades.length > 0) {
                    console.log(`   Actually, the latest trades are:`);
                    lastTrades.forEach(t => {
                        console.log(`    • ${t.timestamp.toISOString()} | ${t.action} ${t.quantity} ${t.symbol} @ $${t.price}`);
                    });
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

const name = 'Gautham';
debugUserTrades(name);
