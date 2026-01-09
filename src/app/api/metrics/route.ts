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
}

function calculateMetricsFromTrades(trades: {
    id: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    timestamp: Date;
    fees: number;
    account?: { brokerName: string | null };
}[], filters?: FilterOptions) {
    // Group trades by symbol
    const tradesBySymbol = new Map<string, typeof trades>();
    for (const trade of trades) {
        const symbolTrades = tradesBySymbol.get(trade.symbol) || [];
        symbolTrades.push(trade);
        tradesBySymbol.set(trade.symbol, symbolTrades);
    }

    const closedTrades: ClosedTrade[] = [];
    const allOpenPositions: OpenPosition[] = [];
    let unrealizedCost = 0;

    // Process each symbol using FIFO matching
    for (const [symbol, symbolTrades] of tradesBySymbol) {
        // Sort by timestamp, then by action (BUY before SELL) to ensure intraday handles open -> close correctly
        symbolTrades.sort((a, b) => {
            const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
            if (timeDiff !== 0) return timeDiff;
            // If same time, process BUY before SELL
            if (a.action === 'BUY' && b.action !== 'BUY') return -1;
            if (a.action !== 'BUY' && b.action === 'BUY') return 1;
            return 0;
        });

        // Open Positions can now be Positive (Long) or Negative (Short)
        const openPositions: (Position & { broker: string })[] = [];

        for (const trade of symbolTrades) {
            // Normalize quantity: BUY is positive, SELL is negative
            // SnapTrade usually gives positive quantity + action, but let's be safe
            let quantity = Math.abs(trade.quantity);
            if (trade.action === 'SELL') quantity = -quantity;

            // Skip non-trade actions (like SPLIT for now)
            if (trade.action !== 'BUY' && trade.action !== 'SELL') continue;

            const tradePrice = trade.price;
            let remainingQty = quantity; // This can be positive or negative

            // Match against opposite positions
            // If buying (positive), look for shorts (negative)
            // If selling (negative), look for longs (positive)
            while (
                openPositions.length > 0 &&
                Math.abs(remainingQty) > 0.00000001 &&
                (Math.sign(remainingQty) !== Math.sign(openPositions[0].quantity))
            ) {
                const oldestPosition = openPositions[0];

                // We match the smaller magnitude
                const matchQty = Math.min(Math.abs(remainingQty), Math.abs(oldestPosition.quantity));

                // Prorate fees
                const totalTradeFee = Math.abs(trade.fees);
                const startTotalQty = Math.abs(quantity);
                const feePerShare = startTotalQty > 0 ? totalTradeFee / startTotalQty : 0;
                const matchedFee = feePerShare * matchQty;

                let pnl = 0;

                if (oldestPosition.quantity > 0) {
                    // Closing Long (Selling)
                    // PnL = (SellPrice - BuyPrice) * Qty - Fees
                    pnl = (tradePrice - oldestPosition.price) * matchQty - matchedFee;
                } else {
                    // Closing Short (Buying)
                    // Short Entry Price is oldestPosition.price.
                    // Cover Price is tradePrice.
                    // PnL = (EntryPrice - CoverPrice) * Qty - Fees
                    pnl = (oldestPosition.price - tradePrice) * matchQty - matchedFee;
                }

                closedTrades.push({
                    symbol,
                    pnl,
                    entryPrice: oldestPosition.price,
                    exitPrice: tradePrice,
                    quantity: matchQty,
                    closedAt: trade.timestamp,
                    openedAt: oldestPosition.timestamp,
                    broker: oldestPosition.broker // Attribution to opening broker
                });

                // Update remainders
                if (remainingQty > 0) {
                    remainingQty -= matchQty;
                    oldestPosition.quantity += matchQty; // -10 + 5 = -5
                } else {
                    remainingQty += matchQty; // -10 + 5 = -5 (magnitude reduces)
                    oldestPosition.quantity -= matchQty; // 10 - 5 = 5
                }

                // Check if oldest position is closed
                if (Math.abs(oldestPosition.quantity) <= 0.00000001) {
                    openPositions.shift();
                }
            }

            // If any quantity remains, add it as a new open position
            if (Math.abs(remainingQty) > 0.00000001) {
                openPositions.push({
                    quantity: remainingQty,
                    price: tradePrice,
                    timestamp: trade.timestamp,
                    broker: trade.account?.brokerName || 'Unknown',
                    tradeId: trade.id
                });
            }
        }

        // Track unrealized cost of remaining open positions
        for (const pos of openPositions) {
            if (Math.abs(pos.quantity) > 0.00000001) {
                unrealizedCost += pos.price * Math.abs(pos.quantity);
                allOpenPositions.push({
                    symbol,
                    quantity: pos.quantity, // Negative for shorts
                    entryPrice: pos.price,
                    openedAt: pos.timestamp,
                    broker: pos.broker,
                    currentValue: pos.price * pos.quantity, // Placeholder current value
                    tradeId: pos.tradeId,
                });
            }
        }
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
            winRate: Math.round((data.wins / data.trades) * 100),
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

        const trades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: session.user.id
                },
                action: { in: ['BUY', 'SELL'] }
            },
            include: {
                account: {
                    select: { brokerName: true }
                }
            },
            orderBy: {
                timestamp: 'asc'
            }
        });

        const filters: FilterOptions = {};
        if (startDate) filters.startDate = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filters.endDate = end;
        }
        if (symbol) filters.symbol = symbol;

        const metrics = calculateMetricsFromTrades(trades, Object.keys(filters).length > 0 ? filters : undefined);

        return NextResponse.json(metrics);

    } catch (error: unknown) {
        console.error('Metrics error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
