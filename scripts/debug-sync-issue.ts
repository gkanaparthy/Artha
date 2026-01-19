import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSyncIssue() {
    try {
        const user = await prisma.user.findFirst({
            where: {
                email: 'spulusu@gmail.com'
            },
            include: {
                brokerAccounts: true
            }
        });

        if (!user) {
            console.log('User not found');
            // List all users
            const allUsers = await prisma.user.findMany({
                select: { id: true, email: true, name: true }
            });
            console.log('Available users:', allUsers);
            return;
        }

        console.log('=== SUMAN\'S ACCOUNT DEBUG ===\n');
        console.log('User ID:', user.id);
        console.log('Email:', user.email);
        console.log('SnapTrade User ID:', user.snapTradeUserId);
        console.log('Has SnapTrade Secret:', !!user.snapTradeUserSecret);

        console.log('\n=== BROKER ACCOUNTS ===');
        for (const account of user.brokerAccounts) {
            console.log(`\n${account.brokerName} (ID: ${account.id})`);
            console.log(`  SnapTrade Account ID: ${account.snapTradeAccountId}`);
            console.log(`  Created: ${account.createdAt}`);

            // Count trades by date range
            const totalTrades = await prisma.trade.count({
                where: { accountId: account.id }
            });

            const jan15Trades = await prisma.trade.count({
                where: {
                    accountId: account.id,
                    timestamp: {
                        gte: new Date('2026-01-15T00:00:00Z'),
                        lt: new Date('2026-01-16T00:00:00Z')
                    }
                }
            });

            const jan16Trades = await prisma.trade.count({
                where: {
                    accountId: account.id,
                    timestamp: {
                        gte: new Date('2026-01-16T00:00:00Z'),
                        lt: new Date('2026-01-17T00:00:00Z')
                    }
                }
            });

            const jan17Trades = await prisma.trade.count({
                where: {
                    accountId: account.id,
                    timestamp: {
                        gte: new Date('2026-01-17T00:00:00Z'),
                        lt: new Date('2026-01-18T00:00:00Z')
                    }
                }
            });

            const jan18Trades = await prisma.trade.count({
                where: {
                    accountId: account.id,
                    timestamp: {
                        gte: new Date('2026-01-18T00:00:00Z'),
                        lt: new Date('2026-01-19T00:00:00Z')
                    }
                }
            });

            console.log(`  Total trades: ${totalTrades}`);
            console.log(`  Wed Jan 15: ${jan15Trades} trades`);
            console.log(`  Thu Jan 16: ${jan16Trades} trades`);
            console.log(`  Fri Jan 17: ${jan17Trades} trades ${jan17Trades === 0 ? '❌ MISSING!' : '✅'}`);
            console.log(`  Sat Jan 18: ${jan18Trades} trades`);

            // Get latest trade for this account
            const latestTrade = await prisma.trade.findFirst({
                where: { accountId: account.id },
                orderBy: { timestamp: 'desc' },
                select: {
                    timestamp: true,
                    symbol: true,
                    action: true,
                    snapTradeTradeId: true
                }
            });

            if (latestTrade) {
                console.log(`  Latest trade: ${latestTrade.timestamp.toISOString()} | ${latestTrade.action} ${latestTrade.symbol}`);
                console.log(`  Latest SnapTrade ID: ${latestTrade.snapTradeTradeId}`);
            }
        }

        // Check for ANY Friday trades across all accounts
        console.log('\n=== FRIDAY TRADES (ALL ACCOUNTS) ===');
        const fridayTrades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: user.id
                },
                timestamp: {
                    gte: new Date('2026-01-17T00:00:00Z'),
                    lt: new Date('2026-01-18T00:00:00Z')
                }
            },
            select: {
                id: true,
                timestamp: true,
                symbol: true,
                action: true,
                quantity: true,
                account: {
                    select: { brokerName: true }
                }
            }
        });

        if (fridayTrades.length === 0) {
            console.log('❌ NO FRIDAY TRADES FOUND IN DATABASE');
            console.log('\nThis means either:');
            console.log('  1. SnapTrade API is not returning Friday trades');
            console.log('  2. Trades are being skipped during sync');
            console.log('  3. Trades have incorrect timestamps');
        } else {
            console.log(`✅ Found ${fridayTrades.length} Friday trades`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugSyncIssue();
