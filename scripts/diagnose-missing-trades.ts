
import { prisma } from '../src/lib/prisma';

async function diagnoseMissingTrades() {
    console.log('\n🔍 MISSING TRADE DIAGNOSIS\n');
    console.log('='.repeat(60));

    // 1. Find User
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { contains: 'pulusu', mode: 'insensitive' } },
                { name: { contains: 'Suman', mode: 'insensitive' } }
            ]
        },
        include: { brokerAccounts: true }
    });

    if (!user) {
        console.log('❌ User "Suman" not found');
        return;
    }

    console.log(`✅ User: ${user.name} (${user.email})\n`);

    // 2. TIMELINE ANALYSIS
    console.log('📊 RECENT TRADE TIMELINE (Since Jan 15, 2026):');
    const trades = await prisma.trade.findMany({
        where: {
            account: { userId: user.id },
            timestamp: { gte: new Date('2026-01-15T00:00:00Z') }
        },
        orderBy: { timestamp: 'asc' },
        include: { account: true }
    });

    const byDate = new Map<string, number>();
    trades.forEach(t => {
        const d = t.timestamp.toISOString().split('T')[0];
        byDate.set(d, (byDate.get(d) || 0) + 1);
    });

    ['2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18', '2026-01-19', '2026-01-20', '2026-01-21'].forEach(d => {
        const count = byDate.get(d) || 0;
        const status = count === 0 ? '❌ MISSING' : `✅ ${count} trades`;
        console.log(`   ${d}: ${status}`);
    });
    console.log('\n');

    // 3. ACCOUNT HEALTH CHECK
    console.log('🏦 ACCOUNT HEALTH CHECK:');

    for (const acc of user.brokerAccounts) {
        const tradeCount = await prisma.trade.count({ where: { accountId: acc.id } });
        const lastTrade = await prisma.trade.findFirst({
            where: { accountId: acc.id },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true }
        });

        // Check if this account was created/updated recently
        const createdRecent = acc.createdAt > new Date('2026-01-10');
        const updatedRecent = acc.updatedAt > new Date('2026-01-20');

        console.log(`\n   Broker: ${acc.brokerName}`);
        console.log(`   ID: ${acc.id}`);
        console.log(`   SnapTrade ID (Partial): ...${acc.snapTradeAccountId.slice(-6)}`);
        console.log(`   Created: ${acc.createdAt.toISOString().split('T')[0]} ${createdRecent ? '(RECENT)' : ''}`);
        console.log(`   Last Synced/Updated: ${acc.updatedAt.toISOString()} ${updatedRecent ? '✅' : '⚠️'}`);
        console.log(`   Total Trades: ${tradeCount}`);

        if (lastTrade) {
            console.log(`   Last Trade Date: ${lastTrade.timestamp.toISOString().split('T')[0]}`);
        } else {
            console.log(`   Last Trade Date: NEVER`);
        }

        if (tradeCount === 0) {
            console.log('   ⚠️  WARNING: This account is active but has 0 trades.');
            console.log('      If Friday trades were here, they are not being returned by SnapTrade.');
        } else if (lastTrade && lastTrade.timestamp < new Date('2026-01-16')) {
            console.log('   ⚠️  WARNING: No trades since Jan 15. Sync may be stuck for this account.');
        }
    }

    // 4. SYNC LAG ANALYSIS
    console.log('\n\n⏱️  SYNC LAG ANALYSIS (When were trades actually saved?):');
    const recentSyncs = await prisma.trade.groupBy({
        by: ['createdAt'],
        where: {
            account: { userId: user.id },
            createdAt: { gte: new Date('2026-01-20T00:00:00Z') }
        },
        _count: true
    });

    if (recentSyncs.length > 0) {
        console.log(`   Found sync activity on/after Jan 20:`);
        recentSyncs.forEach(s => {
            console.log(`   - Synced at ${s.createdAt.toISOString()} (${s._count} trades added)`);
        });
        console.log('   ✅ Sync is running and writing to DB.');
    } else {
        console.log('   ❌ No syncs detected since Jan 20. Cron job might be failing?');
    }

    console.log('\n' + '='.repeat(60) + '\n');
}

diagnoseMissingTrades()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
