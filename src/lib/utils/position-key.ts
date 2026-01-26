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
                // Legacy format: {accountId}:{symbol}:{openedAtISO}
                // Bug #8: Symbols can contain colons. We should look for the ISO date pattern at the end.
                // ISO date example: 2024-01-15T09:30:00.000Z
                const isoDateRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.+/;
                const match = key.match(isoDateRegex);

                if (match) {
                    const openedAtStr = match[0];
                    const openedAt = new Date(openedAtStr);
                    if (!isNaN(openedAt.getTime())) {
                        // The part before the timestamp is accountId:symbol
                        const prefix = key.slice(0, match.index! - 1); // remove trailing colon
                        const firstColonIndex = prefix.indexOf(':');
                        if (firstColonIndex !== -1) {
                            return {
                                accountId: prefix.slice(0, firstColonIndex),
                                symbol: prefix.slice(firstColonIndex + 1),
                                openedAt
                            };
                        }
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
    // Base64url is not supported in all browser Buffer polyfills
    // Fall back to standard base64 and manual character replacement
    return Buffer.from(key).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * URL-safe decoding for the position key
 */
export function decodePositionKey(encodedKey: string): string {
    // Restore base64 standard characters before decoding
    let base64 = encodedKey
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    // Add padding if missing
    while (base64.length % 4) {
        base64 += '=';
    }

    return Buffer.from(base64, 'base64').toString('utf8');
}
