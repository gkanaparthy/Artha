import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
    multiplier: number; // Contract multiplier (100 for options, 1 for stocks)
}

interface OpenPosition {
    symbol: string;
    quantity: number;
    entryPrice: number;
    openedAt: Date;
    broker: string;
    accountId: string;
    currentValue: number;
    tradeId: string;
    type: string;
}

interface FilterOptions {
    startDate?: Date;
    endDate?: Date;
    symbol?: string;
    accountId?: string;
    assetType?: string;
}

// Parse option expiration date from symbol (format: SYM  YYMMDD[CP]STRIKE)
function getOptionExpiration(symbol: string): Date | null {
    const match = symbol.match(/(\d{6})[CP]/);
    if (match) {
        const expStr = match[1];
        const year = 2000 + parseInt(expStr.slice(0, 2));
        const month = parseInt(expStr.slice(2, 4)) - 1; // 0-indexed
        const day = parseInt(expStr.slice(4, 6));
        return new Date(year, month, day, 23, 59, 59); // End of expiration day
    }
    return null;
}

function getCanonicalKey(trade: {
    symbol: string;
    universalSymbolId?: string | null;
    type?: string;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: Date | null;
    accountId: string; // REQUIRED: trades must be matched within same account
}): string {
    // Include accountId to ensure trades are matched within the same brokerage account
    const accountPrefix = trade.accountId;

    // 1. Prefer ID if available (Stock or Option)
    if (trade.universalSymbolId) return `${accountPrefix}:${trade.universalSymbolId}`;

    // 2. If Option but no ID (fallback), try to construct unique key or use symbol
    if (trade.type === 'OPTION') {
        // If SnapTrade gives a distinct symbol for option (e.g. AAPL230120C...), use it.
        return `${accountPrefix}:${trade.symbol}`;
    }

    // 3. Stock fallback
    return `${accountPrefix}:${trade.symbol}`;
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
    account?: { brokerName: string | null };
    type?: string;
    universalSymbolId?: string | null;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: Date | null;
    contractMultiplier?: number;
    snapTradeTradeId?: string | null;
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

function calculateMetricsFromTrades(trades: TradeInput[], filters?: FilterOptions) {
    // 0. Deduplicate trades using SnapTrade's unique trade ID
    // This handles cases where the same trade appears multiple times in the database
    const seen = new Set<string>();
    const uniqueTrades = trades.filter(trade => {
        // CRITICAL: snapTradeTradeId must be present for all trades
        if (!trade.snapTradeTradeId) {
            console.warn('[FIFO] Trade missing snapTradeTradeId:', trade.id, trade.symbol, trade.timestamp);
            return false; // Skip trades without snapTradeTradeId (shouldn't happen)
        }

        if (seen.has(trade.snapTradeTradeId)) {
            console.warn('[FIFO] Duplicate trade detected:', trade.snapTradeTradeId, trade.symbol);
            return false;
        }

        seen.add(trade.snapTradeTradeId);
        return true;
    });

    // 1. Group by Canonical Key
    const tradesByKey = new Map<string, TradeInput[]>();
    // We also need a map to lookup Symbol/Name details from the Key later for display
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
    const allOpenPositions: OpenPosition[] = [];
    let unrealizedCost = 0;

    // 2. Process each Instrument Key
    for (const [key, instrumentTrades] of tradesByKey) {
        const longLots: Lot[] = [];
        const shortLots: Lot[] = [];

        for (const trade of instrumentTrades) {

            // Normalize action and quantity
            const action = trade.action.toUpperCase();
            const quantity = Math.abs(trade.quantity);
            const price = trade.price;
            const broker = trade.account?.brokerName || 'Unknown';
            const accountId = trade.accountId;
            const date = trade.timestamp;
            let tradeType = trade.type || 'STOCK';
            // Contract multiplier: 100 for standard options, 10 for mini options, 1 for stocks
            let multiplier = trade.contractMultiplier || 1;

            // Heuristic catch for Options that were saved as Stocks (raw symbol fallback)
            // e.g. "SPXW  260105C06920000"
            if (multiplier === 1 && /^[A-Z]+\s*[0-9]{6}[CP][0-9]{8}$/.test(trade.symbol)) {
                multiplier = 100;
                tradeType = 'OPTION';
            }

            if (quantity === 0) continue;

            // Handle Stock Splits
            if (action === 'SPLIT') {
                const rawQty = trade.quantity; // Use signed quantity (e.g. +200 for 2:1 split on 200 shares)
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
                continue; // Splits adjust lots but don't count as standard trades
            }

            let isBuy = action === 'BUY' || action === 'BUY_TO_OPEN' || action === 'BUY_TO_CLOSE' || action === 'ASSIGNMENT';
            let isSell = action === 'SELL' || action === 'SELL_TO_OPEN' || action === 'SELL_TO_CLOSE' || action === 'EXERCISES';

            if (action === 'OPTIONEXPIRATION') {
                // Check original quantity sign
                // Negative quantity = Removing assets (Closing Long) -> Treat as Sell
                // Positive quantity = Adding assets (Closing Short) -> Treat as Buy
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
                // Trying to Buy.
                // Check if we have Short Lots to Cover (Close)
                while (remainingQty > 0.000001 && shortLots.length > 0) {
                    const matchLot = shortLots[0]; // FIFO
                    const matchQty = Math.min(remainingQty, matchLot.quantity);
                    // Use the lot's multiplier for P&L calculation (for options: qty * multiplier * price diff)
                    const lotMultiplier = matchLot.multiplier;

                    // Matched Close - multiply by contract multiplier for price diff, 
                    // but NOT for fees because feePerUnit is already relative to quantity
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
                        type: matchLot.type,
                        multiplier: lotMultiplier
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
                        broker: broker,
                        accountId: accountId,
                        multiplier: multiplier,
                        type: tradeType
                    });
                }
            } else {
                // Selling.
                // Check if we have Long Lots to Close
                while (remainingQty > 0.000001 && longLots.length > 0) {
                    const matchLot = longLots[0]; // FIFO
                    const matchQty = Math.min(remainingQty, matchLot.quantity);
                    // Use the lot's multiplier for P&L calculation (for options: qty * multiplier * price diff)
                    const lotMultiplier = matchLot.multiplier;

                    // Matched Close - multiply by contract multiplier for price diff,
                    // but NOT for fees because feePerUnit is already relative to quantity
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
                        type: matchLot.type,
                        multiplier: lotMultiplier
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
                        broker: broker,
                        accountId: accountId,
                        multiplier: multiplier,
                        type: tradeType
                    });
                }
            }
        }

        // Auto-close expired options that don't have OPTIONEXPIRATION records
        // This handles cases where SnapTrade doesn't send expiration events
        const now = new Date();
        const symbol = keyDetails.get(key)?.symbol || '';
        const expDate = getOptionExpiration(symbol);

        if (expDate && expDate < now) {
            // This is an expired option - close all remaining lots at $0

            // Close expired long positions (loss = cost basis)
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
                        type: lot.type,
                        multiplier: lot.multiplier
                    });
                }
            }
            longLots.length = 0; // Clear all long lots

            // Close expired short positions (profit = premium received)
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
                        type: lot.type,
                        multiplier: lot.multiplier
                    });
                }
            }
            shortLots.length = 0; // Clear all short lots
        }

        // Collect Open Positions from Lots
        for (const lot of longLots) {
            allOpenPositions.push({
                symbol: keyDetails.get(key)?.symbol || key,
                quantity: lot.quantity,
                entryPrice: lot.price,
                openedAt: lot.date,
                broker: lot.broker,
                accountId: lot.accountId,
                currentValue: lot.price * lot.quantity * lot.multiplier,
                tradeId: lot.tradeId,
                type: lot.type
            });
        }

        // Filter out phantom short positions (orphaned sells without buys)
        // These typically occur when:
        // 1. Account was liquidated/closed before sync window
        // 2. Positions were transferred out
        // 3. Opening trades are outside 3-year sync window
        // We detect these by checking if ALL trades for this symbol are sells
        const symbolTrades = instrumentTrades;
        const hasBuys = symbolTrades.some(t => {
            const action = t.action.toUpperCase();
            return action.includes('BUY') || action === 'ASSIGNMENT';
        });
        const hasSells = symbolTrades.some(t => {
            const action = t.action.toUpperCase();
            return action.includes('SELL') || action === 'EXERCISES' || action === 'OPTIONEXPIRATION';
        });

        // Only add short positions if we have evidence of actual short selling
        // (buys present in history). Otherwise it's likely a phantom from missing data.
        const isLikelyPhantom = shortLots.length > 0 && !hasBuys && hasSells;

        if (!isLikelyPhantom) {
            for (const lot of shortLots) {
                allOpenPositions.push({
                    symbol: keyDetails.get(key)?.symbol || key,
                    quantity: -lot.quantity,
                    entryPrice: lot.price,
                    openedAt: lot.date,
                    broker: lot.broker,
                    accountId: lot.accountId,
                    currentValue: lot.price * -lot.quantity * lot.multiplier,
                    tradeId: lot.tradeId,
                    type: lot.type
                });
            }
        } else {
            console.log('[FIFO] Filtered phantom short position for', keyDetails.get(key)?.symbol, '- missing buy history');
        }
    }

    // Calculate total unrealized cost (already includes multiplier from currentValue)
    for (const pos of allOpenPositions) {
        unrealizedCost += Math.abs(pos.currentValue);
    }

    // Apply filters to closed trades and open positions
    let filteredTrades = closedTrades;
    let filteredOpenPositions = allOpenPositions;

    if (filters) {
        if (filters.startDate) {
            // Filter closed trades by when they were CLOSED (realized P&L date)
            filteredTrades = filteredTrades.filter(t => t.closedAt >= filters.startDate!);
            // Filter open positions by when they were opened (still relevant for open positions)
            filteredOpenPositions = filteredOpenPositions.filter(p => p.openedAt >= filters.startDate!);
        }
        if (filters.endDate) {
            // Filter closed trades by closedAt date
            filteredTrades = filteredTrades.filter(t => t.closedAt <= filters.endDate!);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.openedAt <= filters.endDate!);
        }
        if (filters.symbol) {
            const symbols = filters.symbol.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
            if (symbols.length > 0) {
                // Use startsWith for prefix matching (e.g., "AA" matches "AAPL" and "AA")
                filteredTrades = filteredTrades.filter(t =>
                    symbols.some(s => t.symbol.toLowerCase().startsWith(s))
                );
                filteredOpenPositions = filteredOpenPositions.filter(p =>
                    symbols.some(s => p.symbol.toLowerCase().startsWith(s))
                );
            }
        }
        if (filters.accountId && filters.accountId !== 'all') {
            filteredTrades = filteredTrades.filter(t => t.accountId === filters.accountId);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.accountId === filters.accountId);
        }
        if (filters.assetType && filters.assetType !== 'all') {
            filteredTrades = filteredTrades.filter(t => t.type === filters.assetType);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.type === filters.assetType);
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

    // Calculate average win/loss percentages
    // CRITICAL: Must include multiplier for options (100) to get correct percentage
    const avgWinPct = winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => {
            const costBasis = t.entryPrice * t.quantity * t.multiplier;
            return sum + (costBasis > 0 ? (t.pnl / costBasis) * 100 : 0);
        }, 0) / winningTrades.length
        : 0;
    const avgLossPct = losingTrades.length > 0
        ? Math.abs(losingTrades.reduce((sum, t) => {
            const costBasis = t.entryPrice * t.quantity * t.multiplier;
            return sum + (costBasis > 0 ? (t.pnl / costBasis) * 100 : 0);
        }, 0) / losingTrades.length)
        : 0;

    const netPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate MTD and YTD PnL from all closed trades    // Calculate largest win and loss
    const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map(t => t.pnl))
        : 0;
    const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map(t => t.pnl))
        : 0;

    // Calculate unrealized P&L (open positions)
    // For now, we use unrealizedCost as a proxy (total cost basis of open positions)
    // TODO: Would need current market prices to calculate actual unrealized P&L

    // Average trade P&L
    const avgTrade = totalClosedTrades > 0 ? netPnL / totalClosedTrades : 0;

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
        avgWinPct: Math.round(avgWinPct * 10) / 10,
        avgLossPct: Math.round(avgLossPct * 10) / 10,
        profitFactor: profitFactor === Infinity ? null : Math.round(profitFactor * 100) / 100,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        largestWin: Math.round(largestWin * 100) / 100,
        largestLoss: Math.round(largestLoss * 100) / 100,
        avgTrade: Math.round(avgTrade * 100) / 100,
        unrealizedCost: Math.round(unrealizedCost * 100) / 100,
        // MTD and YTD PnL calculations
        mtdPnL: (() => {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            let sum = 0;
            for (const t of filteredTrades) {
                const closed = new Date(t.closedAt);
                if (closed >= startOfMonth) sum += t.pnl;
            }
            return Math.round(sum * 100) / 100;
        })(),
        ytdPnL: (() => {
            const now = new Date();
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            let sum = 0;
            for (const t of filteredTrades) {
                const closed = new Date(t.closedAt);
                if (closed >= startOfYear) sum += t.pnl;
            }
            return Math.round(sum * 100) / 100;
        })(),
        openPositionsCount: filteredOpenPositions.length,
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
        const accountId = searchParams.get('accountId');
        const assetType = searchParams.get('assetType');

        // IMPORTANT: Fetch ALL trades for FIFO lot matching
        // Date filters are applied AFTER FIFO processing on the closedTrades output
        // This ensures positions that span date boundaries are correctly matched
        const trades = await prisma.trade.findMany({
            where: {
                account: {
                    userId: session.user.id
                },
                action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'] }
            },
            include: {
                account: {
                    select: { brokerName: true, id: true }
                }
            },
            orderBy: [
                { timestamp: 'asc' },
                { createdAt: 'asc' }, // SnapTrade returns in order, so import order = execution order
                { id: 'asc' } // Fallback
            ]
        });

        const filters: FilterOptions = {};
        if (startDate) filters.startDate = new Date(startDate + 'T00:00:00');
        if (endDate) {
            filters.endDate = new Date(endDate + 'T23:59:59');
        }
        if (symbol) filters.symbol = symbol;
        if (accountId) filters.accountId = accountId;
        if (assetType) filters.assetType = assetType;

        const metrics = calculateMetricsFromTrades(trades, Object.keys(filters).length > 0 ? filters : undefined);

        return NextResponse.json(metrics);

    } catch (error: unknown) {
        console.error('Metrics error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
