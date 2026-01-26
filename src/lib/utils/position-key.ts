/**
 * Utility to generate and parse position keys.
 * Format: {accountId}:{symbol}:{openedAtISO}
 * Used to uniquely identify a position across different trades.
 */

export function generatePositionKey(accountId: string, symbol: string, openedAt: Date): string {
    // Version prefix 'v1' allows future upgrades
    // Use pipe '|' as separator which is rare in symbols
    return `v1|${accountId}|${symbol}|${openedAt.getTime()}`;
}

export function parsePositionKey(key: string): {
    accountId: string;
    symbol: string;
    openedAt: Date
} | null {
    try {
        const parts = key.split('|');

        // Handle legacy keys or check version
        if (parts[0] !== 'v1') {
            // Fallback for old colon-based keys if necessary, or just fail
            // For chaos recovery, we might want to try legacy parse here
            if (key.includes(':')) {
                const oldParts = key.split(':');
                if (oldParts.length >= 3) {
                    const openedAtStr = oldParts.slice(-3).join(':');
                    const openedAt = new Date(openedAtStr);
                    if (!isNaN(openedAt.getTime())) {
                        return {
                            accountId: oldParts[0],
                            symbol: oldParts.slice(1, -3).join(':'),
                            openedAt
                        };
                    }
                }
            }
            return null;
        }

        if (parts.length < 4) return null;

        // v1|accountId|symbol|timestamp
        const accountId = parts[1];
        // Symbol might theoretically contain pipes, so we join middle parts if length > 4
        const symbol = parts.slice(2, -1).join('|');
        const timestamp = parseInt(parts[parts.length - 1], 10);

        if (isNaN(timestamp)) return null;

        return {
            accountId,
            symbol,
            openedAt: new Date(timestamp)
        };
    } catch {
        return null;
    }
}

/**
 * URL-safe encoding for the position key
 */
export function encodePositionKey(key: string): string {
    return Buffer.from(key).toString('base64url');
}

/**
 * URL-safe decoding for the position key
 */
export function decodePositionKey(encodedKey: string): string {
    return Buffer.from(encodedKey, 'base64url').toString('utf8');
}
