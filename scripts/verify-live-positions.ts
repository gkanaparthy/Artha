import { prisma } from '../src/lib/prisma';
import { snapTradeService } from '../src/lib/services/snaptrade.service';

async function main() {
    const userName = process.argv[2] || 'Ashwini';

    console.log(`\n🔍 Checking live positions for: "${userName}"\n`);

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

    // Get live positions from SnapTrade
    console.log('📡 Fetching live positions from SnapTrade...\n');

    const positionsResult = await snapTradeService.getPositions(user.id);

    if (positionsResult.error) {
        console.error('❌ Error fetching positions:', positionsResult.error);
        process.exit(1);
    }

    const positions = positionsResult.positions;

    console.log(`📊 Live positions from broker: ${positions.length}\n`);

    if (positions.length === 0) {
        console.log('✅ NO LIVE POSITIONS - All positions are closed according to the broker!\n');
        console.log('This confirms that the "open" trades in our database are phantom positions');
        console.log('caused by missing historical trade data.\n');
    } else {
        console.log('Current positions from broker:\n');
        console.log('═'.repeat(60));
        for (const pos of positions) {
            console.log(`Symbol: ${pos.symbol}`);
            console.log(`  Type: ${pos.type}`);
            console.log(`  Units: ${pos.units}`);
            console.log(`  Market Value: ${pos.marketValue ? `$${pos.marketValue.toFixed(2)}` : 'N/A'}`);
            console.log(`  Open P&L: ${pos.openPnl ? `$${pos.openPnl.toFixed(2)}` : 'N/A'}`);
            console.log(`  Account: ${pos.brokerName}`);
            console.log();
        }
    }

    console.log('═'.repeat(60));
    console.log('\n💡 SOLUTION:\n');

    if (positions.length === 0) {
        console.log('Since broker reports NO open positions, we should:');
        console.log('1. Mark these phantom positions as "archived" or "pre-sync"');
        console.log('2. Exclude them from P&L calculations');
        console.log('3. Or: Add manual closing trades at $0 for these symbols');
        console.log('\nRecommended approach: Filter by date - only show positions');
        console.log('opened AFTER the first sync date (when user connected broker).');
    } else {
        console.log('Broker shows open positions. Need to investigate why FIFO');
        console.log('matching isn\'t working correctly.');
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
