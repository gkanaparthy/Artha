import { prisma } from '../src/lib/prisma';

interface Lot {
    price: number;
    quantity: number;
    multiplier: number;
    openedAt: Date;
    tradeId: string;
}

interface ClosedTrade {
    symbol: string;
    pnl: number;
    openedAt: Date;
    closedAt: Date;
    quantity: number;
    entryPrice: number;
    exitPrice: number;
}

async function debugUserPnL() {
    const userId = 'cmk95esou000012nso4n7zgdl';

    console.log('=== YTD PnL Debug Script ===\n');

    // Fetch all trades ordered by timestamp
    const trades = await prisma.trade.findMany({
        where: {
            account: { userId },
            action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION'] }
        },
        include: { account: { select: { brokerName: true, id: true } } },
        orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
    });

    console.log(`Total trades: ${trades.length}`);

    // Separate by year
    const trades2025 = trades.filter(t => t.timestamp.getFullYear() === 2025);
    const trades2026 = trades.filter(t => t.timestamp.getFullYear() === 2026);
    console.log(`2025 trades: ${trades2025.length}`);
    console.log(`2026 trades: ${trades2026.length}`);

    // FIFO lot matching
    const longLots = new Map<string, Lot[]>();
    const shortLots = new Map<string, Lot[]>();
    const closedTrades: ClosedTrade[] = [];

    for (const trade of trades) {
        const action = trade.action.toUpperCase();
        const symbol = trade.symbol;
        const key = `${trade.accountId}:${symbol}`;
        const quantity = Math.abs(trade.quantity);
        const price = trade.price;
        const multiplier = trade.contractMultiplier || 100;
        const timestamp = trade.timestamp;

        let isBuy = ['BUY', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'ASSIGNMENT'].includes(action);
        let isSell = ['SELL', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'EXERCISES'].includes(action);

        // Option expiration: negative qty = closing long, positive = closing short
        if (action === 'OPTIONEXPIRATION') {
            if (trade.quantity < 0) {
                isSell = true;
            } else {
                isBuy = true;
            }
        }

        if (!longLots.has(key)) longLots.set(key, []);
        if (!shortLots.has(key)) shortLots.set(key, []);

        let remaining = quantity;

        if (isBuy) {
            // First, cover any shorts
            const shorts = shortLots.get(key)!;
            while (remaining > 0 && shorts.length > 0) {
                const lot = shorts[0];
                const matchQty = Math.min(remaining, lot.quantity);
                // Short cover PnL: (sell price - buy price) * qty * multiplier
                const pnl = (lot.price - price) * matchQty * lot.multiplier;
                closedTrades.push({
                    symbol,
                    pnl,
                    openedAt: lot.openedAt,
                    closedAt: timestamp,
                    quantity: matchQty,
                    entryPrice: lot.price,
                    exitPrice: price
                });
                lot.quantity -= matchQty;
                remaining -= matchQty;
                if (lot.quantity <= 0) shorts.shift();
            }
            // Remaining opens new long
            if (remaining > 0) {
                longLots.get(key)!.push({
                    price, quantity: remaining, multiplier, openedAt: timestamp, tradeId: trade.id
                });
            }
        } else if (isSell) {
            // First, close any longs
            const longs = longLots.get(key)!;
            while (remaining > 0 && longs.length > 0) {
                const lot = longs[0];
                const matchQty = Math.min(remaining, lot.quantity);
                // Long close PnL: (sell price - buy price) * qty * multiplier
                const pnl = (price - lot.price) * matchQty * lot.multiplier;
                closedTrades.push({
                    symbol,
                    pnl,
                    openedAt: lot.openedAt,
                    closedAt: timestamp,
                    quantity: matchQty,
                    entryPrice: lot.price,
                    exitPrice: price
                });
                lot.quantity -= matchQty;
                remaining -= matchQty;
                if (lot.quantity <= 0) longs.shift();
            }
            // Remaining opens new short
            if (remaining > 0) {
                shortLots.get(key)!.push({
                    price, quantity: remaining, multiplier, openedAt: timestamp, tradeId: trade.id
                });
            }
        }
    }

    // Calculate totals
    const allClosedPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
    console.log(`\nTotal closed P&L (all time): $${allClosedPnL.toFixed(2)}`);

    // YTD (closed in 2026)
    const ytdClosed = closedTrades.filter(t => t.closedAt.getFullYear() === 2026);
    const ytdPnL = ytdClosed.reduce((sum, t) => sum + t.pnl, 0);
    console.log(`YTD closed P&L (closedAt in 2026): $${ytdPnL.toFixed(2)}`);
    console.log(`YTD closed trades: ${ytdClosed.length}`);

    // Show top winners and losers YTD
    const sortedYtd = [...ytdClosed].sort((a, b) => b.pnl - a.pnl);
    console.log('\nTop 5 YTD Winners:');
    sortedYtd.slice(0, 5).forEach(t => {
        console.log(`  ${t.symbol}: $${t.pnl.toFixed(2)} (closed ${t.closedAt.toISOString().split('T')[0]})`);
    });
    console.log('\nTop 5 YTD Losers:');
    sortedYtd.slice(-5).reverse().forEach(t => {
        console.log(`  ${t.symbol}: $${t.pnl.toFixed(2)} (closed ${t.closedAt.toISOString().split('T')[0]})`);
    });

    // Check if there are any weird entries
    const suspiciouslyLarge = ytdClosed.filter(t => Math.abs(t.pnl) > 5000);
    if (suspiciouslyLarge.length > 0) {
        console.log('\nSuspiciously large P&L entries:');
        suspiciouslyLarge.forEach(t => {
            console.log(`  ${t.symbol}: $${t.pnl.toFixed(2)} | qty:${t.quantity} | entry:$${t.entryPrice} | exit:$${t.exitPrice}`);
        });
    }

    // Check open positions
    let openLongs = 0, openShorts = 0;
    for (const [, lots] of longLots) {
        for (const lot of lots) {
            if (lot.quantity > 0) openLongs++;
        }
    }
    for (const [, lots] of shortLots) {
        for (const lot of lots) {
            if (lot.quantity > 0) openShorts++;
        }
    }
    console.log(`\nOpen positions: ${openLongs} longs, ${openShorts} shorts`);

    await prisma.$disconnect();
}

debugUserPnL().catch(console.error);
