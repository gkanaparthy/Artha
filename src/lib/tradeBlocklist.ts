/**
 * Blocklist of SnapTrade Trade IDs to permanently skip during sync.
 * 
 * These are trades confirmed to be bad data from SnapTrade that should
 * not be imported into the database, even if SnapTrade continues to return them.
 * 
 * Format: Map<snapTradeTradeId, reason>
 */

export const TRADE_BLOCKLIST = new Map<string, string>([
    // RKLB orphaned short sale - no preceding BUY
    // This trade creates phantom losses by matching against future BUYs
    ['2cf7f32b-e99f-4313-a955-a0ffcfe6b865', 'RKLB orphaned short sale on 2025-01-27, no opening trade exists'],
]);

/**
 * Check if a trade should be skipped during sync
 */
export function isTradeBlocked(snapTradeTradeId: string): { blocked: boolean; reason?: string } {
    const reason = TRADE_BLOCKLIST.get(snapTradeTradeId);
    if (reason) {
        return { blocked: true, reason };
    }
    return { blocked: false };
}
