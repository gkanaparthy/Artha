import { TradeInput, FilterOptions, ClosedTrade, OpenPositionInternal, Lot } from "@/types/trading";

// Helper keys
const getCanonicalKey = (trade: {
    symbol: string;
    universalSymbolId?: string | null;
    type?: string;
    accountId: string;
}): string => {
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

    const seen = new Set<string>();
    const uniqueTrades = trades.filter(trade => {
        // Prefer snapTradeTradeId for deduplication, but fallback to DB id to ensure no trades are lost
        const dedupeId = trade.snapTradeTradeId || trade.id;
        if (seen.has(dedupeId)) {
            return false;
        }
        seen.add(dedupeId);
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

    // 2. Process each Instrument Key
    for (const [key, instrumentTrades] of tradesByKey) {
        const longLots: Lot[] = [];
        const shortLots: Lot[] = [];

        // Sort by timestamp just in case
        // Sort by timestamp, then by action (BUYS before SELLS for same-day/same-second trades)
        instrumentTrades.sort((a, b) => {
            const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
            if (timeDiff !== 0) return timeDiff;

            // If same timestamp, prioritize openings/buys
            const isABuy = /BUY|ASSIGNMENT|SPLIT/.test(a.action.toUpperCase());
            const isBBuy = /BUY|ASSIGNMENT|SPLIT/.test(b.action.toUpperCase());
            if (isABuy && !isBBuy) return -1;
            if (!isABuy && isBBuy) return 1;
            return 0;
        });

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
                        universalSymbolId: matchLot.universalSymbolId,
                        pnl: pnl,
                        entryPrice: matchLot.price,
                        exitPrice: price,
                        quantity: matchQty,
                        closedAt: date,
                        openedAt: matchLot.date,
                        broker: matchLot.broker,
                        accountId: matchLot.accountId,
                        type: matchLot.type,
                        optionType: matchLot.optionType || null,
                        strikePrice: matchLot.strikePrice || null,
                        expiryDate: matchLot.expiryDate ? matchLot.expiryDate.toISOString() : null,
                        multiplier: lotMultiplier,
                        positionKey: matchLot.positionKey,
                        tags: getTagsForItem({
                            symbol: keyDetails.get(key)?.symbol || trade.symbol,
                            accountId: matchLot.accountId,
                            openedAt: matchLot.date,
                            positionKey: matchLot.positionKey
                        }),
                        side: "short"
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) shortLots.shift();
                }

                if (remainingQty > 0.000001) {
                    longLots.push({
                        tradeId: trade.id,
                        date: date,
                        universalSymbolId: trade.universalSymbolId || null,
                        price: price,
                        quantity: remainingQty,
                        originalQuantity: remainingQty,
                        broker: broker,
                        accountId: accountId,
                        multiplier: multiplier,
                        type: tradeType,
                        optionType: trade.optionType || null,
                        strikePrice: trade.strikePrice || null,
                        expiryDate: trade.expiryDate || null,
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
                        universalSymbolId: matchLot.universalSymbolId,
                        pnl: pnl,
                        entryPrice: matchLot.price,
                        exitPrice: price,
                        quantity: matchQty,
                        closedAt: date,
                        openedAt: matchLot.date,
                        broker: matchLot.broker,
                        accountId: matchLot.accountId,
                        type: matchLot.type,
                        optionType: matchLot.optionType || null,
                        strikePrice: matchLot.strikePrice || null,
                        expiryDate: matchLot.expiryDate ? matchLot.expiryDate.toISOString() : null,
                        multiplier: lotMultiplier,
                        positionKey: matchLot.positionKey,
                        tags: getTagsForItem({
                            symbol: keyDetails.get(key)?.symbol || trade.symbol,
                            accountId: matchLot.accountId,
                            openedAt: matchLot.date,
                            positionKey: matchLot.positionKey
                        }),
                        side: "long"
                    });

                    matchLot.quantity -= matchQty;
                    remainingQty -= matchQty;

                    if (matchLot.quantity < 0.000001) longLots.shift();
                }

                if (remainingQty > 0.000001) {
                    const isExplicitShort = action === 'SELL_TO_OPEN';
                    if (!isExplicitShort && (tradeType === 'STOCK' || tradeType === 'ETF')) {
                        closedTrades.push({
                            symbol: keyDetails.get(key)?.symbol || trade.symbol,
                            universalSymbolId: trade.universalSymbolId || null,
                            pnl: 0,
                            entryPrice: price,
                            exitPrice: price,
                            quantity: remainingQty,
                            closedAt: date,
                            openedAt: date,
                            broker: broker,
                            accountId: accountId,
                            type: tradeType,
                            optionType: trade.optionType || null,
                            strikePrice: trade.strikePrice || null,
                            expiryDate: trade.expiryDate ? trade.expiryDate.toISOString() : null,
                            multiplier: multiplier,
                            positionKey: trade.positionKey,
                            tags: getTagsForItem({
                                symbol: keyDetails.get(key)?.symbol || trade.symbol,
                                accountId: accountId,
                                openedAt: date,
                                positionKey: trade.positionKey
                            }),
                            side: "long"
                        });
                    } else {
                        shortLots.push({
                            tradeId: trade.id,
                            date: date,
                            universalSymbolId: trade.universalSymbolId || null,
                            price: price,
                            quantity: remainingQty,
                            originalQuantity: remainingQty,
                            broker: broker,
                            accountId: accountId,
                            multiplier: multiplier,
                            type: tradeType,
                            optionType: trade.optionType || null,
                            strikePrice: trade.strikePrice || null,
                            expiryDate: trade.expiryDate || null,
                            positionKey: trade.positionKey || null
                        });
                    }
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
                        universalSymbolId: lot.universalSymbolId,
                        pnl: pnl,
                        entryPrice: lot.price,
                        exitPrice: 0,
                        quantity: lot.quantity,
                        closedAt: expDate,
                        openedAt: lot.date,
                        broker: lot.broker,
                        accountId: lot.accountId,
                        type: lot.type,
                        optionType: lot.optionType || null,
                        strikePrice: lot.strikePrice || null,
                        expiryDate: lot.expiryDate ? lot.expiryDate.toISOString() : null,
                        multiplier: lot.multiplier,
                        tags: getTagsForItem({
                            symbol: symbol,
                            accountId: lot.accountId,
                            openedAt: lot.date,
                            positionKey: lot.positionKey
                        }),
                        side: "long"
                    });
                }
            }
            longLots.length = 0;
            for (const lot of shortLots) {
                if (lot.quantity > 0.000001) {
                    const pnl = lot.price * lot.quantity * lot.multiplier;
                    closedTrades.push({
                        symbol: symbol,
                        universalSymbolId: lot.universalSymbolId,
                        pnl: pnl,
                        entryPrice: lot.price,
                        exitPrice: 0,
                        quantity: lot.quantity,
                        closedAt: expDate,
                        openedAt: lot.date,
                        broker: lot.broker,
                        accountId: lot.accountId,
                        type: lot.type,
                        optionType: lot.optionType || null,
                        strikePrice: lot.strikePrice || null,
                        expiryDate: lot.expiryDate ? lot.expiryDate.toISOString() : null,
                        multiplier: lot.multiplier,
                        tags: getTagsForItem({
                            symbol: symbol,
                            accountId: lot.accountId,
                            openedAt: lot.date,
                            positionKey: lot.positionKey
                        }),
                        side: "short"
                    });
                }
            }
            shortLots.length = 0;
        }

        for (const lot of longLots) {
            allOpenPositions.push({
                symbol: keyDetails.get(key)?.symbol || key,
                universalSymbolId: lot.universalSymbolId,
                quantity: lot.quantity,
                entryPrice: lot.price,
                openedAt: lot.date,
                broker: lot.broker,
                accountId: lot.accountId,
                currentValue: lot.price * lot.quantity * lot.multiplier,
                tradeId: lot.tradeId,
                type: lot.type,
                contractMultiplier: lot.multiplier,
                optionType: lot.optionType || null,
                strikePrice: lot.strikePrice || null,
                expiryDate: lot.expiryDate || null,
                positionKey: lot.positionKey,
                tags: getTagsForItem({
                    symbol: keyDetails.get(key)?.symbol || key,
                    accountId: lot.accountId,
                    openedAt: lot.date,
                    positionKey: lot.positionKey
                }),
                side: "long"
            });
        }

        const symbolTrades = instrumentTrades;
        const hasBuys = symbolTrades.some(t => {
            const act = t.action.toUpperCase();
            return act.includes('BUY') || act === 'ASSIGNMENT';
        });
        const hasSells = symbolTrades.some(t => {
            const act = t.action.toUpperCase();
            return act.includes('SELL') || act === 'EXERCISES' || act === 'OPTIONEXPIRATION';
        });

        const isLikelyPhantom = shortLots.length > 0 && !hasBuys && hasSells;
        if (!isLikelyPhantom) {
            for (const lot of shortLots) {
                allOpenPositions.push({
                    symbol: keyDetails.get(key)?.symbol || key,
                    universalSymbolId: lot.universalSymbolId,
                    quantity: -lot.quantity,
                    entryPrice: lot.price,
                    openedAt: lot.date,
                    broker: lot.broker,
                    accountId: lot.accountId,
                    currentValue: lot.price * -lot.quantity * lot.multiplier,
                    tradeId: lot.tradeId,
                    type: lot.type,
                    contractMultiplier: lot.multiplier,
                    optionType: lot.optionType || null,
                    strikePrice: lot.strikePrice || null,
                    expiryDate: lot.expiryDate || null,
                    positionKey: lot.positionKey,
                    tags: getTagsForItem({
                        symbol: keyDetails.get(key)?.symbol || key,
                        accountId: lot.accountId,
                        openedAt: lot.date,
                        positionKey: lot.positionKey
                    }),
                    side: "short"
                });
            }
        }
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
            const accountIds = Array.isArray(filters.accountId)
                ? filters.accountId
                : filters.accountId.split(',').filter(Boolean);

            if (accountIds.length > 0) {
                filteredTrades = filteredTrades.filter(t => accountIds.includes(t.accountId));
                filteredOpenPositions = filteredOpenPositions.filter(p => accountIds.includes(p.accountId));
            }
        }
        if (filters.assetType && filters.assetType !== 'all') {
            filteredTrades = filteredTrades.filter(t => t.type === filters.assetType);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.type === filters.assetType);
        }
        if (filters.action && filters.action !== 'ALL') {
            const side = filters.action === 'BUY' ? 'long' : 'short';
            filteredTrades = filteredTrades.filter(t => t.side === side);
            filteredOpenPositions = filteredOpenPositions.filter(p => p.side === side);
        }
        if (filters.status && filters.status !== 'all') {
            if (filters.status === "open") {
                filteredTrades = [];
            } else if (filters.status === "winners") {
                filteredTrades = filteredTrades.filter(t => t.pnl > 0);
                filteredOpenPositions = [];
            } else if (filters.status === "losers") {
                filteredTrades = filteredTrades.filter(t => t.pnl < 0);
                filteredOpenPositions = [];
            }
        }
        if (filters.tagIds && filters.tagIds.length > 0 && 'positionTags' in (filters as object)) {
            const ptMap = (filters as unknown as Record<string, unknown>).positionTags as Map<string, string[]>;
            const filterByTags = (item: { symbol: string, accountId: string, openedAt: Date, positionKey?: string | null }) => {
                let itemTagIds: string[] | undefined;
                if (item.positionKey) itemTagIds = ptMap.get(item.positionKey);
                if (!itemTagIds) {
                    const v1Key = `v1|${item.accountId}|${item.symbol}|${item.openedAt.getTime()}`;
                    itemTagIds = ptMap.get(v1Key);
                }
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

    let unrealizedCost = 0;
    for (const pos of filteredOpenPositions) {
        unrealizedCost += Math.abs(pos.currentValue);
    }

    return { filteredTrades, filteredOpenPositions, unrealizedCost };
}
