import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTqqq() {
    const userId = 'cmk95esou000012nso4n7zgdl';
    const symbol = 'TQQQ';

    console.log(`=== Analyzing TQQQ for user: ${userId} ===\n`);

    const dbTrades = await prisma.trade.findMany({
        where: {
            account: { userId },
            symbol: symbol
        },
        orderBy: { timestamp: 'asc' }
    });

    console.log(`Total TQQQ trades: ${dbTrades.length}`);

    const longLots: { qty: number, price: number }[] = [];
    let closedPnL = 0;

    for (const trade of dbTrades) {
        console.log(`Trade: ${trade.timestamp.toISOString().split('T')[0]} | ${trade.action} | qty: ${trade.quantity} | price: ${trade.price}`);

        if (trade.action === 'BUY') {
            longLots.push({ qty: trade.quantity, price: trade.price });
        } else if (trade.action === 'SELL') {
            let remaining = Math.abs(trade.quantity);
            while (remaining > 0 && longLots.length > 0) {
                const lot = longLots[0];
                const take = Math.min(remaining, lot.qty);
                closedPnL += (trade.price - lot.price) * take;
                lot.qty -= take;
                remaining -= take;
                if (lot.qty <= 0) longLots.shift();
            }
        } else if (trade.action === 'SPLIT') {
            const currentQty = longLots.reduce((sum, l) => sum + l.qty, 0);
            if (currentQty > 0) {
                const ratio = (currentQty + trade.quantity) / currentQty;
                console.log(`  >>> APPLYING SPLIT: ratio ${ratio}`);
                for (const lot of longLots) {
                    lot.qty *= ratio;
                    lot.price /= ratio;
                }
            }
        }
    }

    console.log(`\nFinal Realized P&L: $${closedPnL.toFixed(2)}`);

    await prisma.$disconnect();
}

checkTqqq().catch(console.error);
