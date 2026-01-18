import { prisma } from '../src/lib/prisma';

async function main() {
    const userName = process.argv[2] || 'Ashwini';

    console.log(`\n🔍 Diagnosing trades for user containing: "${userName}"\n`);

    // Find user
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { name: { contains: userName, mode: 'insensitive' } },
                { email: { contains: userName, mode: 'insensitive' } }
            ]
        }
    });

    if (!user) {
        console.error('❌ User not found');
        process.exit(1);
    }

    console.log(`✅ Found user: ${user.name || user.email}\n`);

    // Get all trades ordered by time
    const trades = await prisma.trade.findMany({
        where: {
            account: { userId: user.id }
        },
        include: {
            account: { select: { brokerName: true } }
        },
        orderBy: [
            { timestamp: 'asc' },
            { id: 'asc' }
        ]
    });

    console.log(`📊 Total trades: ${trades.length}\n`);

    // Analyze by symbol
    const tradesBySymbol = new Map<string, typeof trades>();
    for (const trade of trades) {
        const symbol = trade.symbol;
        if (!tradesBySymbol.has(symbol)) {
            tradesBySymbol.set(symbol, []);
        }
        tradesBySymbol.get(symbol)!.push(trade);
    }

    console.log(`📈 Unique symbols: ${tradesBySymbol.size}\n`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('SYMBOL ANALYSIS (Potential Orphans)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check each symbol for balance
    const issues = [];

    for (const [symbol, symbolTrades] of tradesBySymbol) {
        let netQuantity = 0;
        let buyCount = 0;
        let sellCount = 0;
        let firstAction = '';
        let lastAction = '';

        for (const trade of symbolTrades) {
            const action = trade.action.toUpperCase();
            const multiplier = trade.contractMultiplier || 1;

            if (!firstAction) firstAction = action;
            lastAction = action;

            const isBuy = action.includes('BUY') || action === 'ASSIGNMENT';
            const isSell = action.includes('SELL') || action === 'EXERCISES' || action === 'OPTIONEXPIRATION';

            if (isBuy) {
                netQuantity += Math.abs(trade.quantity);
                buyCount++;
            } else if (isSell) {
                netQuantity -= Math.abs(trade.quantity);
                sellCount++;
            }
        }

        const isOrphaned = netQuantity !== 0;
        const type = symbolTrades[0].type || 'STOCK';

        if (isOrphaned) {
            issues.push({
                symbol,
                type,
                netQuantity,
                buyCount,
                sellCount,
                firstAction,
                lastAction,
                tradeCount: symbolTrades.length,
                firstDate: symbolTrades[0].timestamp,
                lastDate: symbolTrades[symbolTrades.length - 1].timestamp
            });
        }
    }

    // Sort issues by severity (net quantity)
    issues.sort((a, b) => Math.abs(b.netQuantity) - Math.abs(a.netQuantity));

    if (issues.length === 0) {
        console.log('✅ No orphaned trades found! All positions balanced.');
    } else {
        console.log(`⚠️  Found ${issues.length} potentially orphaned positions:\n`);

        for (const issue of issues) {
            console.log(`Symbol: ${issue.symbol} (${issue.type})`);
            console.log(`  Net Quantity: ${issue.netQuantity > 0 ? '+' : ''}${issue.netQuantity}`);
            console.log(`  Trades: ${issue.buyCount} BUY / ${issue.sellCount} SELL (${issue.tradeCount} total)`);
            console.log(`  First: ${issue.firstAction} on ${issue.firstDate.toISOString().split('T')[0]}`);
            console.log(`  Last:  ${issue.lastAction} on ${issue.lastDate.toISOString().split('T')[0]}`);

            if (issue.netQuantity > 0) {
                console.log(`  ⚠️  OPEN LONG: Missing ${issue.netQuantity} SELL trades`);
            } else {
                console.log(`  ⚠️  OPEN SHORT: Missing ${Math.abs(issue.netQuantity)} BUY trades`);
            }
            console.log();
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('ACTION BREAKDOWN');
    console.log('═══════════════════════════════════════════════════════════\n');

    const actionCounts = new Map<string, number>();
    for (const trade of trades) {
        const action = trade.action;
        actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    }

    for (const [action, count] of Array.from(actionCounts.entries()).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${action}: ${count}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (issues.length > 0) {
        console.log('Possible causes:');
        console.log('1. ⏰ Sync window too short (missing historical opening/closing trades)');
        console.log('2. 🔄 Transfers between accounts (shows as buy in one, sell in other)');
        console.log('3. 🔧 Data quality issues from broker');
        console.log('4. 📅 Positions opened before 3-year sync window');
        console.log('\nSolutions:');
        console.log('- For old positions: Ignore if they\'re truly expired/closed in reality');
        console.log('- For recent positions: Check SnapTrade data directly');
        console.log('- Consider: Fetch positions from SnapTrade API to validate');
    }
    console.log();
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
