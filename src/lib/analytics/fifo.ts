import { TradeInput, FilterOptions, ClosedTrade, OpenPositionInternal, Lot } from "@/types/trading";

// Helper keys
const getCanonicalKey = (trade: {
    symbol: string;
    universalSymbolId?: string | null;
    type?: string;
    accountId: string;
}): string => { // ... No changes here
    const accountPrefix = trade.accountId;
    if (trade.universalSymbolId) return `${accountPrefix}:${trade.universalSymbolId}`;
    if (trade.type === 'OPTION') {
        return `${accountPrefix}:${trade.symbol}`;
    }
    return `${accountPrefix}:${trade.symbol}`;
};

// Helper option expiry
function getOptionExpiration(symbol: string): Date | null {
    const match = symbol.match(/(\d{6})[CP]/);
    if (match) {
        const expStr = match[1];
        const year = 2000 + parseInt(expStr.slice(0, 2));
        const month = parseInt(expStr.slice(2, 4)) - 1; // 0-indexed
        const day = parseInt(expStr.slice(4, 6));
        return new Date(year, month, day, 23, 59, 59);
    }
    return null;
}

export function calculateMetricsFromTrades(trades: TradeInput[], filters?: FilterOptions) {
    // Helper to get tags for an item
    const getTagsForItem = (item: { symbol: string, accountId: string, openedAt: Date, positionKey?: string | null }) => {
        if (!filters || !('positionTags' in filters) || !('tagDefs' in filters)) return [];
        // For lookup, we try to reconstruct the key. 
        // Note: The positionKey logic in DB might be `v1|...` but here we are using a Map keyed by something?
        // Wait, the caller (route.tsx) constructs the map using `pt.positionKey`.
        // BUT, the positionKey is generated via `accountId:symbol:openedAt` in the DB backfill?
        // Actually, the new backfill uses `v1|...`.
        // The Map in route.tsx uses `pt.positionKey`. 
        // So we need to construct the key in the SAME format as the DB.

        // HOWEVER, the `calculateMetrics` logic is purely FIFO based and doesn't know the DB `positionKey`.
        // It calculates `openedAt` dynamically.
        // If the DB `positionKey` relies on the *first trade timestamp*, and our FIFO logic matches that, we are good.
        // The backfill script uses the FIRST trade timestamp of the group logic.
        // Our FIFO logic here determines `matchLot.date` as the openedAt.

        // So we should try to match the format: `v1|accountId|symbol|timestamp`
        // But we must handle legacy keys too if any exist? The backfill should have fixed them.

        // Let's assume v1 format:
        // const v1Key = `v1|${item.accountId}|${item.symbol}|${item.openedAt.getTime()}`;

        // We also need to support the legacy format just in case the Map has legacy keys?
        // Or if the backfill isn't finished.
        // The key in the Map comes from `prisma.positionTag.findMany`.

        const ptMap = 'positionTags' in (filters as object) ? (filters as unknown as Record<string, unknown>).positionTags as Map<string, string[]> : new Map();
        const defMap = 'tagDefs' in (filters as object) ? (filters as unknown as Record<string, unknown>).tagDefs as Map<string, { id: string; name: string; color: string; category: string; icon: string | null }> : new Map();

        let tagIds: string[] | undefined;

        // Try candidate keys in order of reliability
        if (item.positionKey) {
            tagIds = ptMap.get(item.positionKey);
        }

        // Fallback to re-deriving v1 key if no tag found was found yet
        if (!tagIds) {
            const v1Key = `v1|${item.accountId}|${item.symbol}|${item.openedAt.getTime()}`;
            tagIds = ptMap.get(v1Key);
        }

        // Final fallback to legacy key
        if (!tagIds) {
            const legacyKey = `${item.accountId}:${item.symbol}:${item.openedAt.toISOString()}`;
            tagIds = ptMap.get(legacyKey);
        }

        if (!tagIds) return [];

        return tagIds.map((id: string) => defMap.get(id)).filter(Boolean) as { id: string; name: string; color: string; category: string; icon: string | null }[];
    };

    // 0. Deduplicate trades using SnapTrade's unique trade ID
    const seen = new Set<string>();
    const uniqueTrades = trades.filter(trade => {
        if (!trade.snapTradeTradeId) {
            // console.warn('[FIFO] Trade missing snapTradeTradeId:', trade.id);
            return false;
        }
        if (seen.has(trade.snapTradeTradeId)) {
            // console.warn('[FIFO] Duplicate trade detected:', trade.snapTradeTradeId);
            return false;
        }
        seen.add(trade.snapTradeTradeId);
        return true;
    });

    // 1. Group by Canonical Key
    const tradesByKey = new Map<string, TradeInput[]>();
    const keyDetails = new Map<string, { symbol: string, type: string }>();

    for (const trade of uniqueTrades) {
        const key = getCanonicalKey({
            symbol: trade.symbol,
            universalSymbolId: trade.universalSymbolId,
            type: trade.type,
            accountId: trade.accountId
        });

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
    const allOpenPositions: OpenPositionInternal[] = [];
    let unrealizedCost = 0;

    // 2. Process each Instrument Key
    for (const [key, instrumentTrades] of tradesByKey) {
        const longLots: Lot[] = [];
        const shortLots: Lot[] = [];

        // Sort by timestamp just in case
        instrumentTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (const trade of instrumentTrades) {
            const action = trade.action.toUpperCase();
            const quantity = Math.abs(trade.quantity);
            const price = trade.price;
            const broker = trade.account?.brokerName || 'Unknown';
            const accountId = trade.accountId;
            const date = trade.timestamp;
            let tradeType = trade.type || 'STOCK';
            let multiplier = trade.contractMultiplier || 1;

            if (multiplier === 1 && /^[A-Z]+\s*[0-9]{6}[CP][0-9]{8}$/.test(trade.symbol)) {
                multiplier = 100;
                tradeType = 'OPTION';
            }

            if (quantity === 0) continue;

            if (action === 'SPLIT') {
                // ... split logic ...
                // Simplified split logic from original
                const rawQty = trade.quantity;
                const currentLongQty = longLots.reduce((sum, l) => sum + l.quantity, 0);
                const currentShortQty = shortLots.reduce((sum, l) => sum + l.quantity, 0);

                if (currentLongQty > 0) {
                    const ratio = (currentLongQty + rawQty) / currentLongQty;
                    for (const lot of longLots) { lot.quantity *= ratio; lot.price /= ratio; }
                }
                if (currentShortQty > 0) {
                    const ratio = (currentShortQty + rawQty) / currentShortQty;
                    for (const lot of shortLots) { lot.quantity *= ratio; lot.price /= ratio; }
                }
                continue;
            }

            let isBuy = action === 'BUY' || action === 'BUY_TO_OPEN' || action === 'BUY_TO_CLOSE' || action === 'ASSIGNMENT';
            let isSell = action === 'SELL' || action === 'SELL_TO_OPEN' || action === 'SELL_TO_CLOSE' || action === 'EXERCISES';

            if (action === 'OPTIONEXPIRATION') {
                if (trade.quantity < 0) isSell = true;
                else isBuy = true;
            }

            if (!isBuy && !isSell) continue;

            let remainingQty = quantity;
            const totalFee = Math.abs(trade.fees);
            const feePerUnit = totalFee / quantity;

            if (isBuy) {
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
                        type: matchLot.type,
                        multiplier: lotMultiplier,
                        tags: getTagsForItem({
                            symbol: keyDetails.get(key)?.symbol || trade.symbol,
                            accountId: matchLot.accountId,
                            openedAt: matchLot.date,
                            positionKey: matchLot.positionKey
                        })
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) shortLots.shift();
                }

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
                        type: tradeType,
                        positionKey: trade.positionKey || null
                    });
                }
            } else {
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
                        type: matchLot.type,
                        multiplier: lotMultiplier,
                        tags: getTagsForItem({
                            symbol: keyDetails.get(key)?.symbol || trade.symbol,
                            accountId: matchLot.accountId,
                            openedAt: matchLot.date,
                            positionKey: matchLot.positionKey
                        })
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) longLots.shift();
                }

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
                        type: tradeType,
                        positionKey: trade.positionKey || null
                    });
                }
            }
        }

        // Auto-close expired
        const now = new Date();
        const symbol = keyDetails.get(key)?.symbol || '';
        const expDate = getOptionExpiration(symbol);

        if (expDate && expDate < now) {
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
                        multiplier: lot.multiplier,
                        tags: getTagsForItem({
                            symbol: symbol,
                            accountId: lot.accountId,
                            openedAt: lot.date,
                            positionKey: lot.positionKey
                        })
                    });
                }
            }
            longLots.length = 0;
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
                        multiplier: lot.multiplier,
                        tags: getTagsForItem({
                            symbol: symbol,
                            accountId: lot.accountId,
                            openedAt: lot.date,
                            positionKey: lot.positionKey
                        })
                    });
                }
            }
            shortLots.length = 0;
        }

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
                type: lot.type,
                tags: getTagsForItem({
                    symbol: keyDetails.get(key)?.symbol || key,
                    accountId: lot.accountId,
                    openedAt: lot.date,
                    positionKey: lot.positionKey // Added positionKey
                })
            });
        }

        // Phantom short logic omitted for brevity in this shared file, but important. 
        // We will include basic short logic.
        const symbolTrades = instrumentTrades;
        const hasBuys = symbolTrades.some(t => {
            const action = t.action.toUpperCase();
            return action.includes('BUY') || action === 'ASSIGNMENT';
        });
        const hasSells = symbolTrades.some(t => {
            const action = t.action.toUpperCase();
            return action.includes('SELL') || action === 'EXERCISES' || action === 'OPTIONEXPIRATION';
        });

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
                    type: lot.type,
                    tags: getTagsForItem({ symbol: keyDetails.get(key)?.symbol || key, accountId: lot.accountId, openedAt: lot.date })
                });
            }
        }
    }

    for (const pos of allOpenPositions) {
        unrealizedCost += Math.abs(pos.currentValue);
    }

    // Filtering Logic
    let filteredTrades = closedTrades;
    let filteredOpenPositions = allOpenPositions;

    if (filters) {
        if (filters.startDate) {
            filteredTrades = filteredTrades.filter(t => t.closedAt >= filters.startDate!);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.openedAt >= filters.startDate!);
        }
        if (filters.endDate) {
            filteredTrades = filteredTrades.filter(t => t.closedAt <= filters.endDate!);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.openedAt <= filters.endDate!);
        }
        if (filters.symbol) {
            const symbols = filters.symbol.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
            if (symbols.length > 0) {
                filteredTrades = filteredTrades.filter(t => symbols.some(s => t.symbol.toLowerCase().startsWith(s)));
                filteredOpenPositions = filteredOpenPositions.filter(p => symbols.some(s => p.symbol.toLowerCase().startsWith(s)));
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
        if (filters.tagIds && filters.tagIds.length > 0 && 'positionTags' in (filters as object)) {
            const ptMap = (filters as unknown as Record<string, unknown>).positionTags as Map<string, string[]>;
            const filterByTags = (item: { symbol: string, accountId: string, openedAt: Date }) => {
                const v1Key = `v1|${item.accountId}|${item.symbol}|${item.openedAt.getTime()}`;
                let itemTagIds = ptMap.get(v1Key);

                if (!itemTagIds) {
                    const legacyKey = `${item.accountId}:${item.symbol}:${item.openedAt.toISOString()}`;
                    itemTagIds = ptMap.get(legacyKey) || [];
                }

                if (filters.tagFilterMode === 'all') {
                    return filters.tagIds!.every(id => itemTagIds!.includes(id));
                } else {
                    return filters.tagIds!.some(id => itemTagIds!.includes(id));
                }
            };

            filteredTrades = filteredTrades.filter(filterByTags);
            filteredOpenPositions = filteredOpenPositions.filter(filterByTags);
        }
    }

    return { filteredTrades, filteredOpenPositions, unrealizedCost };
}
