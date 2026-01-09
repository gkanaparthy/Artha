import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

interface Position {
    quantity: number;
    price: number;
    timestamp: Date;
    tradeId: string;
}

interface ClosedTrade {
    symbol: string;
    pnl: number;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    closedAt: Date;
    openedAt: Date;
    broker: string;
}

interface OpenPosition {
    symbol: string;
    quantity: number;
    entryPrice: number;
    openedAt: Date;
    broker: string;
    currentValue: number;
    tradeId: string;
}

interface FilterOptions {
    startDate?: Date;
    endDate?: Date;
    symbol?: string;
    broker?: string;
}

function getCanonicalKey(trade: {
    symbol: string;
    universalSymbolId?: string | null;
    type?: string;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: Date | null;
}): string {
    // 1. Prefer ID if available (Stock or Option)
    if (trade.universalSymbolId) return trade.universalSymbolId;

    // 2. If Option but no ID (fallback), try to construct unique key or use symbol
    if (trade.type === 'OPTION') {
        // If SnapTrade gives a distinct symbol for option (e.g. AAPL230120C...), use it.
        return trade.symbol;
    }

    // 3. Stock fallback
    return trade.symbol;
}

interface TradeInput {
    id: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    timestamp: Date;
    fees: number;
    account?: { brokerName: string | null };
    type?: string;
    universalSymbolId?: string | null;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: Date | null;
}

interface Lot {
    tradeId: string;
    date: Date;
    price: number;
    quantity: number; // Absolute quantity remaining
    broker: string;
    originalQuantity: number;
}

function calculateMetricsFromTrades(trades: TradeInput[], filters?: FilterOptions) {
    // 1. Group by Canonical Key
    const tradesByKey = new Map<string, TradeInput[]>();
    // We also need a map to lookup Symbol/Name details from the Key later for display
    const keyDetails = new Map<string, { symbol: string, type: string }>();

    for (const trade of trades) {
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
    const allOpenPositions: OpenPosition[] = [];
    let unrealizedCost = 0;

    // 2. Process each Instrument Key
    for (const [key, instrumentTrades] of tradesByKey) {
        const longLots: Lot[] = [];
        const shortLots: Lot[] = [];

        for (const trade of instrumentTrades) {

            // Normalize action and quantity
            const action = trade.action.toUpperCase();
            const quantity = Math.abs(trade.quantity); // Always positive for calculations here
            const price = trade.price;
            const broker = trade.account?.brokerName || 'Unknown';
            const date = trade.timestamp;

            if (quantity === 0) continue;

            const isBuy = action === 'BUY' || action === 'BUY_TO_OPEN' || action === 'ASSIGNMENT';
            const isSell = action === 'SELL' || action === 'SELL_TO_OPEN' || action === 'EXERCISES';

            if (!isBuy && !isSell) continue;

            let remainingQty = quantity;
            const totalFee = Math.abs(trade.fees);
            const feePerUnit = totalFee / quantity;

            if (isBuy) {
                // Trying to Buy. 
                // Check if we have Short Lots to Cover (Close)
                while (remainingQty > 0.000001 && shortLots.length > 0) {
                    const matchLot = shortLots[0]; // FIFO
                    const matchQty = Math.min(remainingQty, matchLot.quantity);

                    // Matched Close
                    const pnl = (matchLot.price - price) * matchQty - (feePerUnit * matchQty);

                    closedTrades.push({
                        symbol: keyDetails.get(key)?.symbol || trade.symbol,
                        pnl: pnl,
                        entryPrice: matchLot.price,
                        exitPrice: price,
                        quantity: matchQty,
                        closedAt: date,
                        openedAt: matchLot.date,
                        broker: matchLot.broker
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) {
                        shortLots.shift();
                    }
                }

                // Remaining? Open Long Lot
                if (remainingQty > 0.000001) {
                    longLots.push({
                        tradeId: trade.id,
                        date: date,
                        price: price,
                        quantity: remainingQty,
                        originalQuantity: remainingQty,
                        broker: broker
                    });
                }
            } else {
                // Selling.
                // Check if we have Long Lots to Close
                while (remainingQty > 0.000001 && longLots.length > 0) {
                    const matchLot = longLots[0]; // FIFO
                    const matchQty = Math.min(remainingQty, matchLot.quantity);

                    // Matched Close
                    const pnl = (price - matchLot.price) * matchQty - (feePerUnit * matchQty);

                    closedTrades.push({
                        symbol: keyDetails.get(key)?.symbol || trade.symbol,
                        pnl: pnl,
                        entryPrice: matchLot.price,
                        exitPrice: price,
                        quantity: matchQty,
                        closedAt: date,
                        openedAt: matchLot.date,
                        broker: matchLot.broker
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) {
                        longLots.shift();
                    }
                }

                // Remaining? Open Short Lot
                if (remainingQty > 0.000001) {
                    shortLots.push({
                        tradeId: trade.id,
                        date: date,
                        price: price,
                        quantity: remainingQty,
                        originalQuantity: remainingQty,
                        broker: broker
                    });
                }
            }
        }

        // Collect Open Positions from Lots
        for (const lot of longLots) {
            allOpenPositions.push({
                symbol: keyDetails.get(key)?.symbol || key,
                quantity: lot.quantity,
                entryPrice: lot.price,
                openedAt: lot.date,
                broker: lot.broker,
                currentValue: lot.price * lot.quantity,
                tradeId: lot.tradeId
            });
        }
        for (const lot of shortLots) {
            allOpenPositions.push({
                symbol: keyDetails.get(key)?.symbol || key,
                quantity: -lot.quantity, // Negative for Short info
                entryPrice: lot.price,
                openedAt: lot.date,
                broker: lot.broker,
                currentValue: lot.price * -lot.quantity,
                tradeId: lot.tradeId
            });
        }
    }

    // Calculate total unrealized cost
    for (const pos of allOpenPositions) {
        unrealizedCost += Math.abs(pos.quantity) * pos.entryPrice;
    }

    // Apply filters to closed trades and open positions
    let filteredTrades = closedTrades;
    let filteredOpenPositions = allOpenPositions;

    if (filters) {
        if (filters.startDate) {
            // For a Trading Journal, we often care about when the trade was Initiated (Entry)
            filteredTrades = filteredTrades.filter(t => t.openedAt >= filters.startDate!);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.openedAt >= filters.startDate!);
        }
        if (filters.endDate) {
            filteredTrades = filteredTrades.filter(t => t.openedAt <= filters.endDate!);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.openedAt <= filters.endDate!);
        }
        if (filters.symbol) {
            const symbols = filters.symbol.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
            if (symbols.length > 0) {
                filteredTrades = filteredTrades.filter(t => symbols.includes(t.symbol.toLowerCase()));
                filteredOpenPositions = filteredOpenPositions.filter(p => symbols.includes(p.symbol.toLowerCase()));
            }
        }
        if (filters.broker && filters.broker !== 'all') {
            filteredTrades = filteredTrades.filter(t => t.broker === filters.broker);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.broker === filters.broker);
        }
    }

// Calculate metrics from filtered trades
const winningTrades = filteredTrades.filter(t => t.pnl > 0);
const losingTrades = filteredTrades.filter(t => t.pnl < 0);

const totalClosedTrades = filteredTrades.length;
const winRate = totalClosedTrades > 0 ? (winningTrades.length / totalClosedTrades) * 100 : 0;

const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));

const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;

const netPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

// Calculate MTD and YTD PnL from all closed trades (not filtered)
const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const startOfYear = new Date(now.getFullYear(), 0, 1);

const mtdPnL = closedTrades
    .filter(t => t.closedAt >= startOfMonth)
    .reduce((sum, t) => sum + t.pnl, 0);

const ytdPnL = closedTrades
    .filter(t => t.closedAt >= startOfYear)
    .reduce((sum, t) => sum + t.pnl, 0);

// Calculate cumulative PnL for chart
const sortedClosedTrades = [...filteredTrades].sort(
    (a, b) => a.closedAt.getTime() - b.closedAt.getTime()
);

let cumulative = 0;
const cumulativePnL = sortedClosedTrades.map((t) => {
    cumulative += t.pnl;
    return {
        date: t.closedAt.toISOString().split('T')[0],
        pnl: Math.round(t.pnl * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
        symbol: t.symbol,
    };
});

// Calculate monthly performance
const monthlyPerformance = new Map<string, number>();
for (const trade of sortedClosedTrades) {
    const monthKey = trade.closedAt.toISOString().slice(0, 7); // YYYY-MM
    monthlyPerformance.set(monthKey, (monthlyPerformance.get(monthKey) || 0) + trade.pnl);
}
const monthlyData = Array.from(monthlyPerformance.entries())
    .map(([month, pnl]) => ({
        month,
        pnl: Math.round(pnl * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

// Calculate performance by symbol
const symbolPerformance = new Map<string, { pnl: number; trades: number; wins: number }>();
for (const trade of filteredTrades) {
    const existing = symbolPerformance.get(trade.symbol) || { pnl: 0, trades: 0, wins: 0 };
    existing.pnl += trade.pnl;
    existing.trades += 1;
    if (trade.pnl > 0) existing.wins += 1;
    symbolPerformance.set(trade.symbol, existing);
}
const symbolData = Array.from(symbolPerformance.entries())
    .map(([symbol, data]) => ({
        symbol,
        pnl: Math.round(data.pnl * 100) / 100,
        trades: data.trades,
        winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl);

return {
    netPnL: Math.round(netPnL * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    totalTrades: totalClosedTrades,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: profitFactor === Infinity ? null : Math.round(profitFactor * 100) / 100,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    unrealizedCost: Math.round(unrealizedCost * 100) / 100,
    mtdPnL: Math.round(mtdPnL * 100) / 100,
    ytdPnL: Math.round(ytdPnL * 100) / 100,
    closedTrades: sortedClosedTrades.map(t => ({
        ...t,
        closedAt: t.closedAt.toISOString(),
        openedAt: t.openedAt.toISOString(),
        pnl: Math.round(t.pnl * 100) / 100,
    })),
    openPositions: filteredOpenPositions.map(p => ({
        ...p,
        openedAt: p.openedAt.toISOString(),
        entryPrice: Math.round(p.entryPrice * 100) / 100,
        currentValue: Math.round(p.currentValue * 100) / 100,
    })),
    cumulativePnL,
    monthlyData,
    symbolData,
};
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const symbol = searchParams.get('symbol');
        const broker = searchParams.get('broker');

        const trades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: session.user.id
                },
                action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES'] }
            },
            include: {
                account: {
                    select: { brokerName: true }
                }
            },
            orderBy: [
                { timestamp: 'asc' },
                { id: 'asc' }
            ]
        });

        const filters: FilterOptions = {};
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filters.endDate = end;
        }
        if (symbol) filters.symbol = symbol;
        if (broker) filters.broker = broker;

        const metrics = calculateMetricsFromTrades(trades, Object.keys(filters).length > 0 ? filters : undefined);

        return NextResponse.json(metrics);

    } catch (error: unknown) {
        console.error('Metrics error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
