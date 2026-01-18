import { prisma } from '../src/lib/prisma';

async function checkRecentTrades() {
    const userEmail = process.argv[2] || 'spulusu';

    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { contains: userEmail, mode: 'insensitive' } },
                { name: { contains: userEmail, mode: 'insensitive' } }
            ]
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log(`\n📊 Checking trades for: ${user.name || user.email}\n`);

    // Check trades from Jan 17-18, 2026
    const recentTrades = await prisma.trade.findMany({
        where: {
            account: { userId: user.id },
            timestamp: {
                gte: new Date('2026-01-17T00:00:00Z'),
                lte: new Date('2026-01-18T23:59:59Z')
            }
        },
        orderBy: { timestamp: 'desc' }
    });

    console.log(`📅 Trades from Jan 17-18, 2026: ${recentTrades.length}\n`);

    if (recentTrades.length > 0) {
        console.log('Recent trades:');
        recentTrades.slice(0, 10).forEach(t => {
            console.log(`   ${t.timestamp.toISOString()} - ${t.symbol} ${t.action} ${t.quantity} @ $${t.price}`);
        });
    } else {
        console.log('❌ No trades found from Jan 17-18, 2026');
    }

    // Check last trade date
    const lastTrade = await prisma.trade.findFirst({
        where: { account: { userId: user.id } },
        orderBy: { timestamp: 'desc' }
    });

    if (lastTrade) {
        console.log(`\n📅 Most recent trade in database:`);
        console.log(`   Date: ${lastTrade.timestamp.toISOString()}`);
        console.log(`   Symbol: ${lastTrade.symbol}`);
        console.log(`   Action: ${lastTrade.action}\n`);
    }

    // Check total trades
    const totalTrades = await prisma.trade.count({
        where: { account: { userId: user.id } }
    });
    console.log(`📊 Total trades in database: ${totalTrades}\n`);
}

checkRecentTrades()
    .catch(e => console.error('Error:', e))
    .finally(() => prisma.$disconnect());
