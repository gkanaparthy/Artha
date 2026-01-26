import { PrismaClient } from '@prisma/client';
import { generatePositionKey } from '../src/lib/utils/position-key';

const prisma = new PrismaClient();

// Helper to get canonical key for grouping trades (from src/app/api/metrics/route.ts logic)
function getCanonicalSymbol(trade: any): string {
    // 1. Prefer ID if available (Stock or Option)
    if (trade.universalSymbolId) return trade.universalSymbolId;

    // 2. If Option but no ID (fallback), try to construct unique key or use symbol
    if (trade.type === 'OPTION') {
        return trade.symbol;
    }

    // 3. Stock fallback
    return trade.symbol;
}

async function main() {
    console.log('Starting full recalculation of positionKeys...');

    // 1. Fetch ALL trades
    // We need everything to correctly calculate position groupings based on history
    const allTrades = await prisma.trade.findMany({
        orderBy: [
            { accountId: 'asc' },
            { symbol: 'asc' }, // Rough grouping
            { timestamp: 'asc' },
            { createdAt: 'asc' }
        ]
    });

    console.log(`Fetched ${allTrades.length} trades. Grouping...`);

    // 2. Group by Account + Canonical Symbol
    const groups = new Map<string, typeof allTrades>();

    for (const trade of allTrades) {
        const canonicalSymbol = getCanonicalSymbol(trade);
        // creating a unique group key: AccountID + Symbol
        const groupKey = `${trade.accountId}|${canonicalSymbol}`;

        if (!groups.has(groupKey)) {
            groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(trade);
    }

    console.log(`identified ${groups.size} unique symbol-account groups.`);

    // 3. Calculate Position Keys per group
    // We track "Net Quantity" to identify when a position opens and closes.
    // When Net Qty is 0, the next trade starts a NEW position (new key).

    const updates: { id: string; positionKey: string }[] = [];

    for (const [groupKey, trades] of groups) {
        // Ensure strictly sorted by time
        trades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        let currentPositionKey: string | null = null;
        let netQty = 0;

        for (const trade of trades) {
            // Allow slight floating point tolerance
            const isFlat = Math.abs(netQty) < 0.0000001;

            if (isFlat) {
                // START NEW POSITION
                // We use the 'generatePositionKey' format: v1|acc|sym|time
                // We pass the Canonical Symbol or the Trade Symbol? 
                // The key should represent the position. The Canonical Symbol is better for grouping options.
                // But generating the key requires 'symbol' string.
                const canonicalSymbol = getCanonicalSymbol(trade);
                currentPositionKey = generatePositionKey(trade.accountId, canonicalSymbol, trade.timestamp);
            }

            // Assign the current key (either new or existing)
            if (currentPositionKey) {
                updates.push({
                    id: trade.id,
                    positionKey: currentPositionKey
                });
            }

            // Update Net Qty
            const qty = Math.abs(trade.quantity);
            const action = trade.action.toUpperCase();

            // Determine sign
            // Buys add, Sells subtract. 
            // NOTE: Shorts: Sell to Open (-1), Buy to Close (+1).
            // So logic holds: Sell is always negative impact on "Long Inventory", or just signed tracking.
            const isSell = action.includes('SELL') || action === 'EXERCISES' || action === 'OPTIONEXPIRATION';
            // Simple signed tracking: Longs are +, Shorts are -
            if (isSell) {
                netQty -= qty;
            } else {
                // BUY, ASSIGNMENT, etc.
                netQty += qty;
            }

            // Handle SPLIT? 
            // Splits usually modify the holding quantity but aren't buys/sells in terms of "Opening/Closing" logic 
            // unless we adjust the 'netQty' to match the split ratio.
            // If we simply ignore Split trades for netQty, we might drift.
            // But SnapTrade splits are weird. Let's assume for now standard Buy/Sell flow.
            // Be careful if netQty becomes 0 by accident.
        }
    }

    console.log(`Computed ${updates.length} updates. Executing batch updates...`);

    // 4. Update DB in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);

        await prisma.$transaction(
            batch.map(update =>
                prisma.trade.update({
                    where: { id: update.id },
                    data: { positionKey: update.positionKey }
                })
            )
        );

        if (i % 1000 === 0) {
            console.log(`Processed ${i} / ${updates.length}`);
        }
    }

    console.log('Position Key Backfill Completed Successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
