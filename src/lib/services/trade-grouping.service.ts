import { prisma } from '@/lib/prisma';
import { generatePositionKey } from '@/lib/utils/position-key';

export class TradeGroupingService {
    /**
     * Recalculates position keys for a specific set of trades.
     * Usually called after a sync or for a specific account+symbol group.
     */
    async recalculatePositionKeys(accountId: string, symbol: string) {
        console.log(`[TradeGrouping] Recalculating keys for ${accountId}:${symbol}`);

        // Fetch all trades for this group to calculate net quantity correctly from start of time
        const trades = await prisma.trade.findMany({
            where: { accountId, symbol },
            orderBy: [
                { timestamp: 'asc' },
                { action: 'asc' }, // Ensure BUYs (B) precede SELLs (S) if timestamps are identical (Bug Fix)
                { createdAt: 'asc' }
            ]
        });

        if (trades.length === 0) return;

        let currentPositionKey: string | null = null;
        let netQty = 0;
        const updates: { id: string; positionKey: string }[] = [];

        for (const trade of trades) {
            const isFlat = Math.abs(netQty) < 0.0000001;

            if (isFlat) {
                // START NEW POSITION
                // Sticky logic: If the opening trade already has a valid positionKey, reuse it.
                // This prevents tag loss if the opening trade's timestamp changes slightly in a later sync.
                if (trade.positionKey && trade.positionKey.startsWith('v1|')) {
                    currentPositionKey = trade.positionKey;
                } else {
                    currentPositionKey = generatePositionKey(trade.accountId, trade.symbol, trade.timestamp);
                }
            }

            if (currentPositionKey && trade.positionKey !== currentPositionKey) {
                updates.push({
                    id: trade.id,
                    positionKey: currentPositionKey
                });
            }

            // Update Net Qty (Bug #2)
            // netQty represents our inventory. 
            // Positive = Long position, Negative = Short position, Zero = Flat/Closed.
            const qty = Math.abs(trade.quantity);
            const action = trade.action.toUpperCase();
            const optionAction = trade.optionAction?.toUpperCase();

            // Sells subtract from inventory (makes us shorter or less long)
            const isSellAction = action.includes('SELL') || optionAction?.includes('SELL');
            // Buys add to inventory (makes us longer or less short)
            const isBuyAction = action.includes('BUY') || action.includes('BOUGHT') || optionAction?.includes('BUY') || action === 'ASSIGNMENT';
            const isClosing = action === 'OPTIONEXPIRATION' || action === 'EXERCISES' || action === 'EXERCISE';
            const isAdjustment = action === 'SPLIT';

            if (isBuyAction) {
                netQty += qty;
            } else if (isSellAction) {
                netQty -= qty;
            } else if (isAdjustment) {
                // Splits are typically recorded as (+) for forward splits and (-) for reverse splits
                // However, many brokers record the TOTAL adjustment or a separate trade.
                // In SnapTrade, split units are the adjustment amount.
                netQty += trade.quantity; // use signed quantity for adjustments
            } else if (isClosing) {
                if (netQty > 0) netQty -= Math.min(qty, netQty);
                else if (netQty < 0) netQty += Math.min(qty, Math.abs(netQty));
            }
        }

        if (updates.length > 0) {
            console.log(`[TradeGrouping] Applying ${updates.length} updates for ${symbol}`);
            await prisma.$transaction(
                updates.map(u =>
                    prisma.trade.update({
                        where: { id: u.id },
                        data: { positionKey: u.positionKey }
                    })
                )
            );
        }
    }

    /**
     * Cleans up position tags that no longer have any associated trades. (Bug #5)
     * Usually called after large deletions or periodically.
     */
    async cleanupOrphanedTags(userId: string) {
        console.log(`[TradeGrouping] Cleaning up orphaned tags for user ${userId}...`);

        // Find tags for this user
        const tags = await prisma.positionTag.findMany({
            where: { userId },
            select: { positionKey: true }
        });

        const uniqueKeys = Array.from(new Set(tags.map(t => t.positionKey)));
        let deletedCount = 0;

        for (const key of uniqueKeys) {
            const tradeCount = await prisma.trade.count({
                where: { positionKey: key }
            });

            if (tradeCount === 0) {
                const deleted = await prisma.positionTag.deleteMany({
                    where: { positionKey: key, userId }
                });
                deletedCount += deleted.count;
            }
        }

        if (deletedCount > 0) {
            console.log(`[TradeGrouping] Deleted ${deletedCount} orphaned position tags.`);
        }
        return deletedCount;
    }
}

export const tradeGroupingService = new TradeGroupingService();
