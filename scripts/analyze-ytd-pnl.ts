import * as fs from 'fs';
import * as path from 'path';

// Structure matching the CSV
interface CSVTrade {
    user_id: string;
    name: string;
    email: string;
    snapTradeUserId: string;
    secret_status: string;
    broker_account_id: string;
    brokerName: string;
    snapTradeAccountId: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    timestamp: Date;
}

interface Lot {
    price: number;
    quantity: number;
    mult: number;
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
    accountId: string;
}

console.log('=== STEP-BY-STEP YTD P&L ANALYSIS ===\n');

// Step 1: Load CSV
console.log('Step 1: Loading CSV file...');
const csvPath = path.join(process.cwd(), 'All_trades_SP.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');
const header = lines[0].split(',');

console.log(`  - Total lines: ${lines.length - 1} trades`);
console.log(`  - Header: ${header.join(', ')}\n`);

// Step 2: Parse trades
console.log('Step 2: Parsing trades...');
const trades: CSVTrade[] = [];
for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 13) continue; // Skip malformed lines

    trades.push({
        user_id: parts[0],
        name: parts[1],
        email: parts[2],
        snapTradeUserId: parts[3],
        secret_status: parts[4],
        broker_account_id: parts[5],
        brokerName: parts[6],
        snapTradeAccountId: parts[7],
        symbol: parts[8],
        action: parts[9],
        quantity: parseFloat(parts[10]),
        price: parseFloat(parts[11]),
        timestamp: new Date(parts[12])
    });
}

console.log(`  - Parsed: ${trades.length} valid trades`);

// Sort by timestamp (FIFO requires chronological order)
trades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
console.log(`  - Sorted by timestamp\n`);

// Step 3: Separate by year
const trades2025 = trades.filter(t => t.timestamp.getFullYear() === 2025);
const trades2026 = trades.filter(t => t.timestamp.getFullYear() === 2026);
console.log('Step 3: Trade distribution:');
console.log(`  - 2025: ${trades2025.length} trades`);
console.log(`  - 2026: ${trades2026.length} trades\n`);

// Step 4: FIFO lot matching
console.log('Step 4: FIFO lot matching (ALL trades)...');
const longLots = new Map<string, Lot[]>();
const shortLots = new Map<string, Lot[]>();
const closedTrades: ClosedTrade[] = [];

let processedCount = 0;
for (const trade of trades) {
    const key = `${trade.broker_account_id}:${trade.symbol}`;
    const action = trade.action.toUpperCase();
    const qty = Math.abs(trade.quantity);
    const price = trade.price;
    const date = trade.timestamp;

    // Detect if this is an option or stock based on symbol format
    // Options have format like "SPXW  260112C06980000" (OSI standard)
    // Stocks are just the ticker like "ORCL"
    const isOption = /^[A-Z]+\s+[0-9]{6}[CP][0-9]{8}$/.test(trade.symbol);
    const mult = isOption ? 100 : 1;
    // Classify action
    const isBuy = action.includes('BUY') || action === 'ASSIGNMENT';
    const isSell = action.includes('SELL') || action === 'EXERCISES' ||
        (action === 'OPTIONEXPIRATION' && trade.quantity < 0);

    if (!isBuy && !isSell) continue;

    if (!longLots.has(key)) longLots.set(key, []);
    if (!shortLots.has(key)) shortLots.set(key, []);

    let remaining = qty;

    if (isBuy) {
        // Cover shorts first
        const shorts = shortLots.get(key)!;
        while (remaining > 0.001 && shorts.length > 0) {
            const lot = shorts[0];
            const match = Math.min(remaining, lot.quantity);
            const pnl = (lot.price - price) * match * lot.mult;
            closedTrades.push({
                symbol: trade.symbol,
                pnl,
                openedAt: lot.openedAt,
                closedAt: date,
                quantity: match,
                entryPrice: lot.price,
                exitPrice: price,
                accountId: trade.broker_account_id
            });
            lot.quantity -= match;
            remaining -= match;
            if (lot.quantity <= 0.001) shorts.shift();
        }
        // Open longs
        if (remaining > 0.001) {
            longLots.get(key)!.push({ price, quantity: remaining, mult, openedAt: date, tradeId: `${processedCount}` });
        }
    } else if (isSell) {
        // Close longs first
        const longs = longLots.get(key)!;
        while (remaining > 0.001 && longs.length > 0) {
            const lot = longs[0];
            const match = Math.min(remaining, lot.quantity);
            const pnl = (price - lot.price) * match * lot.mult;
            closedTrades.push({
                symbol: trade.symbol,
                pnl,
                openedAt: lot.openedAt,
                closedAt: date,
                quantity: match,
                entryPrice: lot.price,
                exitPrice: price,
                accountId: trade.broker_account_id
            });
            lot.quantity -= match;
            remaining -= match;
            if (lot.quantity <= 0.001) longs.shift();
        }
        // Open shorts
        if (remaining > 0.001) {
            shortLots.get(key)!.push({ price, quantity: remaining, mult, openedAt: date, tradeId: `${processedCount}` });
        }
    }
    processedCount++;
}

console.log(`  - Processed: ${processedCount} trades`);
console.log(`  - Closed positions: ${closedTrades.length}`);

// Count open positions
let openLongs = 0, openShorts = 0;
for (const [, lots] of longLots) openLongs += lots.length;
for (const [, lots] of shortLots) openShorts += lots.length;
console.log(`  - Open positions: ${openLongs} longs, ${openShorts} shorts\n`);

// Step 5: Calculate total P&L (all time)
const allTimePnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
console.log('Step 5: All-time P&L:');
console.log(`  - Total P&L: $${allTimePnL.toFixed(2)}\n`);

// Step 6: Filter by date (Jan 1-13, 2026) using closedAt
console.log('Step 6: Filtering by date (Jan 1-13, 2026, closedAt)...');
const startDate = new Date('2026-01-01T00:00:00.000Z');
const endDate = new Date('2026-01-13T23:59:59.999Z');

const ytdClosed = closedTrades.filter(t =>
    t.closedAt >= startDate && t.closedAt <= endDate
);
const ytdPnL = ytdClosed.reduce((sum, t) => sum + t.pnl, 0);

console.log(`  - Closed trades in period: ${ytdClosed.length}`);
console.log(`  - YTD P&L: $${ytdPnL.toFixed(2)}\n`);

// Step 7: Show winners/losers
const winners = ytdClosed.filter(t => t.pnl > 0);
const losers = ytdClosed.filter(t => t.pnl < 0);
console.log('Step 7: Breakdown:');
console.log(`  - Winners: ${winners.length}`);
console.log(`  - Losers: ${losers.length}`);
console.log(`  - Win Rate: ${((winners.length / ytdClosed.length) * 100).toFixed(1)}%\n`);

// Step 8: Show top/bottom trades
const sorted = [...ytdClosed].sort((a, b) => b.pnl - a.pnl);
console.log('Step 8: Top 10 Winners:');
sorted.slice(0, 10).forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.symbol}: $${t.pnl.toFixed(2)} (closed ${t.closedAt.toISOString().split('T')[0]})`);
});

console.log('\nStep 8: Top 10 Losers:');
sorted.slice(-10).reverse().forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.symbol}: $${t.pnl.toFixed(2)} (closed ${t.closedAt.toISOString().split('T')[0]})`);
});

// Step 9: Check for large losses (potential errors)
console.log('\nStep 9: Checking for anomalies...');
const largeLosses = ytdClosed.filter(t => t.pnl < -1000);
if (largeLosses.length > 0) {
    console.log(`  - Found ${largeLosses.length} trades with loss > $1000:`);
    largeLosses.forEach(t => {
        console.log(`    ${t.symbol}: $${t.pnl.toFixed(2)} | qty:${t.quantity} | entry:$${t.entryPrice.toFixed(2)} | exit:$${t.exitPrice.toFixed(2)}`);
    });
} else {
    console.log('  - No unusually large losses found');
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('FINAL RESULT:');
console.log(`YTD P&L (Jan 1-13, 2026): $${ytdPnL.toFixed(2)}`);
console.log(`Dashboard shows: -$16,975.26`);
console.log(`Difference: $${(ytdPnL - (-16975.26)).toFixed(2)}`);
console.log('='.repeat(60));
