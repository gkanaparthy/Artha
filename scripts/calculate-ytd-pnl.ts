import { prisma } from '../src/lib/prisma';

// Import the same types and FIFO logic from metrics route
interface ClosedTrade {
    symbol: string;
    pnl: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    closedAt: Date;
    openedAt: Date;
    broker: string;
    accountId: string;
    type: string;
}

interface Lot {
    tradeId: string;
    date: Date;
    price: number;
    quantity: number;
    broker: string;
    accountId: string;
    originalQuantity: number;
    multiplier: number;
    type: string;
}

interface TradeInput {
    id: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    timestamp: Date;
    fees: number;
    accountId: string;
    account?: { brokerName: string | null; id: string };
    type?: string;
    universalSymbolId?: string | null;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: Date | null;
    contractMultiplier?: number;
    snapTradeTradeId?: string | null;
}

interface PnLReport {
    user: {
        id: string;
        name: string | null;
        email: string | null;
    };
    period: {
        startDate: string;
        endDate: string;
        label: string;
    };
    summary: {
        totalPnL: number;
        stockPnL: number;
        optionPnL: number;
        totalTrades: number;
        stockTrades: number;
        optionTrades: number;
    };
    monthly: Array<{ month: string; pnl: number }>;
    topWinners: Array<{ symbol: string; pnl: number; closedAt: string }>;
    topLosers: Array<{ symbol: string; pnl: number; closedAt: string }>;
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options: {
        user?: string;
        startDate?: string;
        endDate?: string;
        json?: boolean;
        help?: boolean;
    } = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--user' || arg === '-u') {
            options.user = args[++i];
        } else if (arg === '--startDate' || arg === '-s') {
            options.startDate = args[++i];
        } else if (arg === '--endDate' || arg === '-e') {
            options.endDate = args[++i];
        } else if (arg === '--json' || arg === '-j') {
            options.json = true;
        } else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    }

    return options;
}

function printHelp() {
    console.log(`
📊 P&L Calculator - Calculate FIFO P&L for any user and date range

Usage:
  npx tsx scripts/calculate-ytd-pnl.ts [options]

Options:
  --user, -u <value>        User identifier (email, name, or ID) [REQUIRED]
  --startDate, -s <date>    Start date (YYYY-MM-DD) [default: start of current year]
  --endDate, -e <date>      End date (YYYY-MM-DD) [default: today]
  --json, -j                Output as JSON (for backend integration)
  --help, -h                Show this help message

Examples:
  # Calculate YTD P&L for a user (by email)
  npx tsx scripts/calculate-ytd-pnl.ts --user "suman@example.com"

  # Calculate P&L for a specific date range
  npx tsx scripts/calculate-ytd-pnl.ts --user "Suman Pulusu" --startDate "2025-01-01" --endDate "2025-12-31"

  # Get JSON output for backend integration
  npx tsx scripts/calculate-ytd-pnl.ts --user "suman@example.com" --json

  # Calculate P&L by user ID
  npx tsx scripts/calculate-ytd-pnl.ts --user "cmkhti6uu0000111l52rekv5x"
`);
}

function getCanonicalKey(trade: {
    symbol: string;
    universalSymbolId?: string | null;
    type?: string;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: Date | null;
    accountId: string;
}): string {
    const accountPrefix = trade.accountId;
    if (trade.universalSymbolId) return `${accountPrefix}:${trade.universalSymbolId}`;
    if (trade.type === 'OPTION') {
        return `${accountPrefix}:${trade.symbol}`;
    }
    return `${accountPrefix}:${trade.symbol}`;
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

function calculateFIFOPnL(trades: TradeInput[]) {
    // Deduplicate trades
    const seen = new Set<string>();
    const uniqueTrades = trades.filter(trade => {
        if (!trade.snapTradeTradeId) {
            return false;
        }
        if (seen.has(trade.snapTradeTradeId)) {
            return false;
        }
        seen.add(trade.snapTradeTradeId);
        return true;
    });

    // Group by canonical key
    const tradesByKey = new Map<string, TradeInput[]>();
    const keyDetails = new Map<string, { symbol: string, type: string }>();

    for (const trade of uniqueTrades) {
        const key = getCanonicalKey(trade);
        if (!tradesByKey.has(key)) tradesByKey.set(key, []);
        tradesByKey.get(key)!.push(trade);

        if (!keyDetails.has(key)) {
            keyDetails.set(key, {
                symbol: trade.symbol,
                type: trade.type || 'STOCK'
            });
        }
    }

    const closedTrades: ClosedTrade[] = [];

    // Process each instrument
    for (const [key, instrumentTrades] of tradesByKey) {
        const longLots: Lot[] = [];
        const shortLots: Lot[] = [];

        for (const trade of instrumentTrades) {
            const action = trade.action.toUpperCase();
            const quantity = Math.abs(trade.quantity);
            const price = trade.price;
            const broker = trade.account?.brokerName || 'Unknown';
            const accountId = trade.accountId;
            const date = trade.timestamp;
            let tradeType = trade.type || 'STOCK';
            let multiplier = trade.contractMultiplier || 1;

            // Heuristic for options saved as stocks
            if (multiplier === 1 && /^[A-Z]+\s*[0-9]{6}[CP][0-9]{8}$/.test(trade.symbol)) {
                multiplier = 100;
                tradeType = 'OPTION';
            }

            if (quantity === 0) continue;

            // Handle stock splits
            if (action === 'SPLIT') {
                const rawQty = trade.quantity;
                const currentLongQty = longLots.reduce((sum, l) => sum + l.quantity, 0);
                const currentShortQty = shortLots.reduce((sum, l) => sum + l.quantity, 0);

                if (currentLongQty > 0) {
                    const ratio = (currentLongQty + rawQty) / currentLongQty;
                    for (const lot of longLots) {
                        lot.quantity *= ratio;
                        lot.price /= ratio;
                    }
                }
                if (currentShortQty > 0) {
                    const ratio = (currentShortQty + rawQty) / currentShortQty;
                    for (const lot of shortLots) {
                        lot.quantity *= ratio;
                        lot.price /= ratio;
                    }
                }
                continue;
            }

            let isBuy = action === 'BUY' || action === 'BUY_TO_OPEN' || action === 'BUY_TO_CLOSE' || action === 'ASSIGNMENT';
            let isSell = action === 'SELL' || action === 'SELL_TO_OPEN' || action === 'SELL_TO_CLOSE' || action === 'EXERCISES';

            if (action === 'OPTIONEXPIRATION') {
                if (trade.quantity < 0) {
                    isSell = true;
                } else {
                    isBuy = true;
                }
            }

            if (!isBuy && !isSell) continue;

            let remainingQty = quantity;
            const totalFee = Math.abs(trade.fees);
            const feePerUnit = totalFee / quantity;

            if (isBuy) {
                // Close short positions
                while (remainingQty > 0.000001 && shortLots.length > 0) {
                    const matchLot = shortLots[0];
                    const matchQty = Math.min(remainingQty, matchLot.quantity);
                    const lotMultiplier = matchLot.multiplier;
                    const pnl = (matchLot.price - price) * matchQty * lotMultiplier - (feePerUnit * matchQty);

                    closedTrades.push({
                        symbol: keyDetails.get(key)?.symbol || trade.symbol,
                        pnl: pnl,
                        entryPrice: matchLot.price,
                        exitPrice: price,
                        quantity: matchQty,
                        closedAt: date,
                        openedAt: matchLot.date,
                        broker: matchLot.broker,
                        accountId: matchLot.accountId,
                        type: matchLot.type
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) {
                        shortLots.shift();
                    }
                }

                // Open long position
                if (remainingQty > 0.000001) {
                    longLots.push({
                        tradeId: trade.id,
                        date: date,
                        price: price,
                        quantity: remainingQty,
                        originalQuantity: remainingQty,
                        broker: broker,
                        accountId: accountId,
                        multiplier: multiplier,
                        type: tradeType
                    });
                }
            } else {
                // Close long positions
                while (remainingQty > 0.000001 && longLots.length > 0) {
                    const matchLot = longLots[0];
                    const matchQty = Math.min(remainingQty, matchLot.quantity);
                    const lotMultiplier = matchLot.multiplier;
                    const pnl = (price - matchLot.price) * matchQty * lotMultiplier - (feePerUnit * matchQty);

                    closedTrades.push({
                        symbol: keyDetails.get(key)?.symbol || trade.symbol,
                        pnl: pnl,
                        entryPrice: matchLot.price,
                        exitPrice: price,
                        quantity: matchQty,
                        closedAt: date,
                        openedAt: matchLot.date,
                        broker: matchLot.broker,
                        accountId: matchLot.accountId,
                        type: matchLot.type
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) {
                        longLots.shift();
                    }
                }

                // Open short position
                if (remainingQty > 0.000001) {
                    shortLots.push({
                        tradeId: trade.id,
                        date: date,
                        price: price,
                        quantity: remainingQty,
                        originalQuantity: remainingQty,
                        broker: broker,
                        accountId: accountId,
                        multiplier: multiplier,
                        type: tradeType
                    });
                }
            }
        }

        // Auto-close expired options
        const now = new Date();
        const symbol = keyDetails.get(key)?.symbol || '';
        const expDate = getOptionExpiration(symbol);

        if (expDate && expDate < now) {
            // Close expired long positions
            for (const lot of longLots) {
                if (lot.quantity > 0.000001) {
                    const pnl = (0 - lot.price) * lot.quantity * lot.multiplier;
                    closedTrades.push({
                        symbol: symbol,
                        pnl: pnl,
                        entryPrice: lot.price,
                        exitPrice: 0,
                        quantity: lot.quantity,
                        closedAt: expDate,
                        openedAt: lot.date,
                        broker: lot.broker,
                        accountId: lot.accountId,
                        type: lot.type
                    });
                }
            }
            longLots.length = 0;

            // Close expired short positions
            for (const lot of shortLots) {
                if (lot.quantity > 0.000001) {
                    const pnl = lot.price * lot.quantity * lot.multiplier;
                    closedTrades.push({
                        symbol: symbol,
                        pnl: pnl,
                        entryPrice: lot.price,
                        exitPrice: 0,
                        quantity: lot.quantity,
                        closedAt: expDate,
                        openedAt: lot.date,
                        broker: lot.broker,
                        accountId: lot.accountId,
                        type: lot.type
                    });
                }
            }
            shortLots.length = 0;
        }
    }

    return closedTrades;
}

async function main() {
    const options = parseArgs();

    if (options.help) {
        printHelp();
        process.exit(0);
    }

    if (!options.user) {
        console.error('❌ Error: --user argument is required\n');
        printHelp();
        process.exit(1);
    }

    const outputJson = options.json || false;

    // Set date range (default to YTD)
    const now = new Date();
    const startDate = options.startDate
        ? new Date(options.startDate)
        : new Date(now.getFullYear(), 0, 1);
    const endDate = options.endDate
        ? new Date(options.endDate + 'T23:59:59')
        : new Date(now);

    const periodLabel = options.startDate || options.endDate
        ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        : `YTD ${now.getFullYear()}`;

    if (!outputJson) {
        console.log(`\n📊 Calculating P&L for "${options.user}"...`);
        console.log(`📅 Period: ${periodLabel}\n`);
    }

    // Find user by email, name, or ID
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: options.user, mode: 'insensitive' } },
                { email: { contains: options.user, mode: 'insensitive' } },
                { name: { contains: options.user, mode: 'insensitive' } },
                { id: options.user }
            ]
        }
    });

    if (!user) {
        if (!outputJson) {
            console.error('❌ User not found. Available users:\n');
            const allUsers = await prisma.user.findMany({
                select: { id: true, name: true, email: true }
            });
            allUsers.forEach(u => {
                console.log(`  - ${u.name || 'No name'} (${u.email || 'No email'})`);
            });
        } else {
            console.log(JSON.stringify({ error: 'User not found' }, null, 2));
        }
        process.exit(1);
    }

    if (!outputJson) {
        console.log(`✅ Found user: ${user.name || user.email} (ID: ${user.id})\n`);
    }

    // Fetch all trades for the user (FIFO requires all trades)
    const trades = await prisma.trade.findMany({
        where: {
            account: {
                userId: user.id
            },
            action: {
                in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT']
            }
        },
        include: {
            account: {
                select: { brokerName: true, id: true }
            }
        },
        orderBy: [
            { timestamp: 'asc' },
            { createdAt: 'asc' },
            { id: 'asc' }
        ]
    });

    if (!outputJson) {
        console.log(`📋 Total trades found: ${trades.length}\n`);
    }

    if (trades.length === 0) {
        const report: PnLReport = {
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            period: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                label: periodLabel
            },
            summary: {
                totalPnL: 0,
                stockPnL: 0,
                optionPnL: 0,
                totalTrades: 0,
                stockTrades: 0,
                optionTrades: 0
            },
            monthly: [],
            topWinners: [],
            topLosers: []
        };

        if (outputJson) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log('No trades found for this user.');
        }
        process.exit(0);
    }

    // Calculate FIFO P&L
    const closedTrades = calculateFIFOPnL(trades);

    // Filter by date range
    const filteredTrades = closedTrades.filter(t => t.closedAt >= startDate && t.closedAt <= endDate);
    const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Calculate by asset type
    const stockTrades = filteredTrades.filter(t => t.type === 'STOCK');
    const optionTrades = filteredTrades.filter(t => t.type === 'OPTION');

    const stockPnL = stockTrades.reduce((sum, t) => sum + t.pnl, 0);
    const optionPnL = optionTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Calculate monthly breakdown
    const monthlyPnL = new Map<string, number>();
    for (const trade of filteredTrades) {
        const monthKey = trade.closedAt.toISOString().slice(0, 7); // YYYY-MM
        monthlyPnL.set(monthKey, (monthlyPnL.get(monthKey) || 0) + trade.pnl);
    }
    const monthlyData = Array.from(monthlyPnL.entries())
        .map(([month, pnl]) => ({ month, pnl }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // Get top winners and losers
    const winners = filteredTrades.filter(t => t.pnl > 0).sort((a, b) => b.pnl - a.pnl).slice(0, 5);
    const losers = filteredTrades.filter(t => t.pnl < 0).sort((a, b) => a.pnl - b.pnl).slice(0, 5);

    const report: PnLReport = {
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        },
        period: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            label: periodLabel
        },
        summary: {
            totalPnL: Math.round(totalPnL * 100) / 100,
            stockPnL: Math.round(stockPnL * 100) / 100,
            optionPnL: Math.round(optionPnL * 100) / 100,
            totalTrades: filteredTrades.length,
            stockTrades: stockTrades.length,
            optionTrades: optionTrades.length
        },
        monthly: monthlyData.map(m => ({ month: m.month, pnl: Math.round(m.pnl * 100) / 100 })),
        topWinners: winners.map(t => ({
            symbol: t.symbol,
            pnl: Math.round(t.pnl * 100) / 100,
            closedAt: t.closedAt.toISOString().split('T')[0]
        })),
        topLosers: losers.map(t => ({
            symbol: t.symbol,
            pnl: Math.round(t.pnl * 100) / 100,
            closedAt: t.closedAt.toISOString().split('T')[0]
        }))
    };

    if (outputJson) {
        console.log(JSON.stringify(report, null, 2));
    } else {
        // Print human-readable report
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`  P&L REPORT FOR ${(user.name || user.email || '').toUpperCase()}`);
        console.log(`  ${periodLabel}`);
        console.log('═══════════════════════════════════════════════════════════\n');

        console.log(`💰 Total P&L: $${report.summary.totalPnL.toFixed(2)}`);
        console.log(`   📈 Stock P&L:  $${report.summary.stockPnL.toFixed(2)} (${report.summary.stockTrades} trades)`);
        console.log(`   📊 Option P&L: $${report.summary.optionPnL.toFixed(2)} (${report.summary.optionTrades} trades)`);
        console.log(`   🔢 Total Trades: ${report.summary.totalTrades}\n`);

        if (report.monthly.length > 0) {
            console.log('📅 Monthly Breakdown:');
            console.log('───────────────────────────────────────────────────────────');
            for (const { month, pnl } of report.monthly) {
                const indicator = pnl >= 0 ? '✅' : '❌';
                console.log(`   ${indicator} ${month}: $${pnl.toFixed(2)}`);
            }
            console.log();
        }

        if (report.topWinners.length > 0) {
            console.log('🏆 Top 5 Winners:');
            console.log('───────────────────────────────────────────────────────────');
            report.topWinners.forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.symbol}: $${t.pnl.toFixed(2)} (Closed: ${t.closedAt})`);
            });
            console.log();
        }

        if (report.topLosers.length > 0) {
            console.log('💔 Top 5 Losers:');
            console.log('───────────────────────────────────────────────────────────');
            report.topLosers.forEach((t, i) => {
                console.log(`   ${i + 1}. ${t.symbol}: $${t.pnl.toFixed(2)} (Closed: ${t.closedAt})`);
            });
            console.log();
        }

        console.log('═══════════════════════════════════════════════════════════\n');
    }
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
