import { prisma } from '../src/lib/prisma';

interface ClosedTrade {
    symbol: string;
    pnl: number;
    accountId: string;
    broker: string;
    type: string;
    closedAt: Date;
}

interface Lot {
    price: number;
    quantity: number;
    multiplier: number;
    date: Date;
    accountId: string;
    broker: string;
    type: string;
}

function getOptionExpiration(symbol: string): Date | null {
    const match = symbol.match(/(\d{6})[CP]/);
    if (match) {
        const expStr = match[1];
        const year = 2000 + parseInt(expStr.slice(0, 2));
        const month = parseInt(expStr.slice(2, 4)) - 1;
        const day = parseInt(expStr.slice(4, 6));
        return new Date(year, month, day, 23, 59, 59);
    }
    return null;
}

async function main() {
    const userEmail = "spulusu@gmail.com";
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
        console.error("User not found");
        return;
    }

    const trades = await prisma.trade.findMany({
        where: {
            account: { userId: user.id },
            action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'] }
        },
        include: { account: true },
        orderBy: [{ timestamp: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }]
    });

    // Deduplicate
    const seen = new Set();
    const uniqueTrades = trades.filter(t => {
        if (!t.snapTradeTradeId) return false;
        if (seen.has(t.snapTradeTradeId)) return false;
        seen.add(t.snapTradeTradeId);
        return true;
    });

    const tradesByKey = new Map();
    for (const t of uniqueTrades) {
        const key = `${t.accountId}:${t.symbol}`;
        if (!tradesByKey.has(key)) tradesByKey.set(key, []);
        tradesByKey.get(key).push(t);
    }

    const closedTrades: ClosedTrade[] = [];
    for (const [key, instrumentTrades] of tradesByKey) {
        const longLots: Lot[] = [];
        const shortLots: Lot[] = [];

        for (const t of instrumentTrades) {
            const action = t.action.toUpperCase();
            const qty = Math.abs(t.quantity);
            const price = t.price;
            const broker = t.account?.brokerName || 'Unknown';
            const accountId = t.accountId;
            const date = t.timestamp;
            let type = t.type || 'STOCK';
            let mult = t.contractMultiplier || 1;

            if (mult === 1 && /^[A-Z]+\s*[0-9]{6}[CP][0-9]{8}$/.test(t.symbol)) {
                mult = 100;
                type = 'OPTION';
            }

            if (qty < 0.000001) continue;

            const isBuy = action.includes('BUY') || action === 'ASSIGNMENT' || (action === 'OPTIONEXPIRATION' && t.quantity > 0);
            const isSell = action.includes('SELL') || action === 'EXERCISES' || (action === 'OPTIONEXPIRATION' && t.quantity < 0);

            if (isBuy) {
                let remaining = qty;
                while (remaining > 0.000001 && shortLots.length > 0) {
                    const lot = shortLots[0];
                    const match = Math.min(remaining, lot.quantity);
                    closedTrades.push({
                        symbol: t.symbol,
                        pnl: (lot.price - price) * match * lot.multiplier - Math.abs(t.fees * (match / qty)),
                        accountId,
                        broker,
                        type,
                        closedAt: date
                    });
                    lot.quantity -= match;
                    remaining -= match;
                    if (lot.quantity < 0.000001) shortLots.shift();
                }
                if (remaining > 0.000001) {
                    longLots.push({ price, quantity: remaining, multiplier: mult, date, accountId, broker, type });
                }
            } else if (isSell) {
                let remaining = qty;
                while (remaining > 0.000001 && longLots.length > 0) {
                    const lot = longLots[0];
                    const match = Math.min(remaining, lot.quantity);
                    closedTrades.push({
                        symbol: t.symbol,
                        pnl: (price - lot.price) * match * lot.multiplier - Math.abs(t.fees * (match / qty)),
                        accountId,
                        broker,
                        type,
                        closedAt: date
                    });
                    lot.quantity -= match;
                    remaining -= match;
                    if (lot.quantity < 0.000001) longLots.shift();
                }
                if (remaining > 0.000001) {
                    shortLots.push({ price, quantity: remaining, multiplier: mult, date, accountId, broker, type });
                }
            }
        }

        // Handle expirations
        const expDate = getOptionExpiration(instrumentTrades[0].symbol);
        if (expDate && expDate < new Date()) {
            for (const lot of longLots) {
                if (lot.quantity > 0.000001) {
                    closedTrades.push({ symbol: instrumentTrades[0].symbol, pnl: -lot.price * lot.quantity * lot.multiplier, accountId: lot.accountId, broker: lot.broker, type: 'OPTION', closedAt: expDate });
                }
            }
            for (const lot of shortLots) {
                if (lot.quantity > 0.000001) {
                    closedTrades.push({ symbol: instrumentTrades[0].symbol, pnl: lot.price * lot.quantity * lot.multiplier, accountId: lot.accountId, broker: lot.broker, type: 'OPTION', closedAt: expDate });
                }
            }
        }
    }

    const startDate = new Date("2026-01-01");
    const ytdTrades = closedTrades.filter(t => t.closedAt >= startDate);

    const accountPnL = new Map();
    const accountInfo = new Map();

    for (const t of ytdTrades) {
        const current = accountPnL.get(t.accountId) || 0;
        accountPnL.set(t.accountId, current + t.pnl);
        accountInfo.set(t.accountId, { broker: t.broker, id: t.accountId });
    }

    console.log(`\n📊 YTD P&L Breakdown for Suman Pulusu (spulusu@gmail.com)`);
    console.log(`📅 Period: 2026-01-01 to Present\n`);

    let totalPnL = 0;
    // Final reporting
    const allAccounts = await prisma.brokerAccount.findMany({ where: { userId: user.id } });

    console.log(`\n📊 YTD P&L Breakdown for Suman Pulusu (spulusu@gmail.com)`);
    console.log(`📅 Period: 2026-01-01 to Present\n`);

    let grandTotal = 0;
    for (const acc of allAccounts) {
        const pnl = accountPnL.get(acc.id) || 0;
        let accDisplay = acc.accountNumber || acc.id;
        if (accDisplay.length > 4) accDisplay = `*${accDisplay.slice(-4)}`;
        const status = acc.disabled ? '[DISABLED]' : '[ACTIVE]';
        const name = `${acc.brokerName} (${accDisplay}) ${status}`;
        console.log(`   ${name.padEnd(40)}: $${pnl.toFixed(2)}`);
        grandTotal += pnl;
    }

    console.log(`   ${"-".repeat(50)}`);
    console.log(`   ${"TOTAL".padEnd(40)}: $${grandTotal.toFixed(2)}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
