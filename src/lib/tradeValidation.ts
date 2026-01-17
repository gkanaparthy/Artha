/**
 * Data Quality Validation Rules for SnapTrade Sync
 * 
 * These rules detect suspicious/bad trade data before it enters the database.
 */

interface TradeData {
    symbol: string;
    timestamp: Date;
    quantity: number;
    price: number;
    action: string;
}

export function validateTrade(trade: TradeData): { valid: boolean; reason?: string } {
    const now = new Date();
    const tradeDate = new Date(trade.timestamp);

    // Rule 1: Reject trades with future dates (more than 1 day in the future)
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (tradeDate > oneDayFromNow) {
        return {
            valid: false,
            reason: `Trade date ${tradeDate.toISOString()} is in the future`
        };
    }

    // Rule 2: Reject trades older than 10 years (likely bad data)
    const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
    if (tradeDate < tenYearsAgo) {
        return {
            valid: false,
            reason: `Trade date ${tradeDate.toISOString()} is more than 10 years old`
        };
    }

    // Rule 3: Reject trades with zero or negative price (except for expired options)
    if (trade.price <= 0 && !trade.action.includes('EXPIRATION')) {
        return {
            valid: false,
            reason: `Trade has invalid price: $${trade.price}`
        };
    }

    // Rule 4: Reject trades with zero quantity (except for corporate actions)
    if (trade.quantity === 0 && !['SPLIT', 'DIVIDEND'].includes(trade.action)) {
        return {
            valid: false,
            reason: `Trade has zero quantity`
        };
    }

    // Rule 5: Flag suspiciously large quantities (10,000+ shares for stocks)
    if (Math.abs(trade.quantity) > 10000 && trade.symbol.length <= 5) {
        console.warn(`⚠️  Large quantity detected: ${trade.symbol} ${trade.quantity} shares`);
        // Don't reject, just warn
    }

    return { valid: true };
}

/**
 * Suggested usage in snaptrade.service.ts:
 * 
 * Before the prisma.trade.upsert() call, add:
 * 
 *   const validation = validateTrade({
 *       symbol: tradeSymbol,
 *       timestamp: tradeTimestamp,
 *       quantity: trade.units,
 *       price: trade.price,
 *       action: action
 *   });
 *   
 *   if (!validation.valid) {
 *       console.warn(`[SnapTrade Sync] Skipping invalid trade: ${validation.reason}`);
 *       skippedTrades++;
 *       continue;
 *   }
 */
