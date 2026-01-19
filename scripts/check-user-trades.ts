import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserTrades() {
    try {
        // Find Suman's user record
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { name: { contains: 'Suman', mode: 'insensitive' } },
                    { email: { contains: 'suman', mode: 'insensitive' } }
                ]
            },
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

        if (!user) {
            console.log('❌ Suman not found in database');
            return;
        }

        console.log('✅ Found user:', user.name, '(', user.email, ')');
        console.log('   User ID:', user.id);
        console.log('   Broker Accounts:', user.brokerAccounts.length);

        for (const account of user.brokerAccounts) {
            console.log(`\n📊 Account: ${account.brokerName} (${account.id})`);
            console.log(`   Total trades: ${account._count.trades}`);
        }

        // Check for Friday trades (Jan 17, 2026)
        const friday = new Date('2026-01-17T00:00:00Z');
        const saturday = new Date('2026-01-18T00:00:00Z');

        const fridayTrades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: user.id
                },
                timestamp: {
                    gte: friday,
                    lt: saturday
                }
            },
            include: {
                account: {
                    select: {
                        brokerName: true
                    }
                }
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        console.log(`\n📅 Friday (Jan 17, 2026) Trades: ${fridayTrades.length}`);

        if (fridayTrades.length > 0) {
            console.log('\nTrade Details:');
            for (const trade of fridayTrades) {
                console.log(`  • ${trade.timestamp.toISOString()} | ${trade.account.brokerName} | ${trade.action} ${trade.quantity} ${trade.symbol} @ $${trade.price} | Type: ${trade.type}`);
            }
        } else {
            console.log('  No trades found for Friday');
        }

        // Check most recent trades
        const recentTrades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: user.id
                }
            },
            include: {
                account: {
                    select: {
                        brokerName: true
                    }
                }
            },
            orderBy: {
                timestamp: 'desc'
            },
            take: 10
        });

        console.log(`\n🕐 Most Recent 10 Trades:`);
        for (const trade of recentTrades) {
            const date = trade.timestamp.toISOString().split('T')[0];
            console.log(`  • ${date} | ${trade.account.brokerName} | ${trade.action} ${trade.quantity} ${trade.symbol} @ $${trade.price}`);
        }

        // Check specifically for E*Trade
        const etradeAccount = user.brokerAccounts.find(acc =>
            acc.brokerName?.toLowerCase().includes('etrade') ||
            acc.brokerName?.toLowerCase().includes('e*trade') ||
            acc.brokerName?.toLowerCase().includes('e-trade')
        );

        if (etradeAccount) {
            console.log(`\n🏦 E*Trade Account Found: ${etradeAccount.brokerName}`);

            const etradeFridayTrades = fridayTrades.filter(t =>
                t.account.brokerName?.toLowerCase().includes('etrade') ||
                t.account.brokerName?.toLowerCase().includes('e*trade') ||
                t.account.brokerName?.toLowerCase().includes('e-trade')
            );

            console.log(`   Friday E*Trade trades: ${etradeFridayTrades.length}`);
        } else {
            console.log('\n⚠️  No E*Trade account found for this user');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserTrades();
