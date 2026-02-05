import { snapTrade } from '@/lib/snaptrade';
import { prisma } from '@/lib/prisma';
import { encrypt, safeDecrypt } from '@/lib/encryption';

const FUTURES_MULTIPLIERS: Record<string, number> = {
    // Indices
    'ES': 50, 'MES': 5,     // S&P 500
    'NQ': 20, 'MNQ': 2,     // Nasdaq 100
    'RTY': 50, 'M2K': 5,    // Russell 2000
    'YM': 5, 'MYM': 0.5,    // Dow Jones

    // Commodities
    'GC': 100, 'MGC': 10,   // Gold
    'SI': 5000, 'SIL': 1000, // Silver
    'CL': 1000, 'MCL': 100, // Crude Oil
    'HG': 25000,            // Copper
    'NG': 10000,            // Natural Gas

    // Agriculture
    'ZC': 50,               // Corn
    'ZW': 50,               // Wheat
    'ZS': 50,               // Soybeans

    // Currencies
    '6E': 125000,           // Euro
    '6B': 62500,            // British Pound
    '6J': 12500000,         // Japanese Yen
    '6A': 100000,           // Australian Dollar

    // Crypto
    'BTC': 5, 'MBT': 0.1,   // Bitcoin
    'ETH': 50, 'MET': 1.0,  // Ethereum
};

export class SnapTradeService {
    /**
     * Registers a new user with SnapTrade (if not already registered)
     * and saves the secret to the database.
     */
    async registerUser(localUserId: string) {
        const user = await prisma.user.findUnique({
            where: { id: localUserId },
        });

        if (!user) {
            // User session exists but user record doesn't - likely stale session from before DB migration/wipeout
            console.error('[SnapTrade] User ID not found in database:', localUserId);
            throw new Error('Your session is outdated. Please sign out and sign back in to continue.');
        }

        if (user.snapTradeUserId && user.snapTradeUserSecret) {
            return {
                userId: user.snapTradeUserId,
                userSecret: user.snapTradeUserSecret,
            };
        }

        // Register with SnapTrade
        const snapTradeUserId = localUserId;

        const result = await snapTrade.authentication.registerSnapTradeUser({
            userId: snapTradeUserId,
        });

        // Encrypt the secret before saving to database
        const encryptedSecret = encrypt(result.data.userSecret!);

        // Save encrypted secret
        await prisma.user.update({
            where: { id: localUserId },
            data: {
                snapTradeUserId: result.data.userId,
                snapTradeUserSecret: encryptedSecret,
            },
        });

        return {
            userId: result.data.userId,
            userSecret: result.data.userSecret, // Return plain for immediate use
        };
    }

    /**
     * Generates a connection link (redirect URI) for the user to link a broker.
     */
    async generateConnectionLink(localUserId: string, customRedirectUri?: string) {
        const user = await prisma.user.findUnique({
            where: { id: localUserId },
        });

        if (!user) {
            // User session exists but user record doesn't - likely stale session from before DB migration/wipeout
            console.error('[SnapTrade] User ID not found in database:', localUserId);
            throw new Error('Your session is outdated. Please sign out and sign back in to continue.');
        }

        if (
            !user.snapTradeUserId ||
            !user.snapTradeUserSecret
        ) {
            throw new Error(
                'User not registered with SnapTrade. Call registerUser first.'
            );
        }

        // Decrypt the secret for API use
        const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
        if (!decryptedSecret) {
            throw new Error('Failed to decrypt SnapTrade secret');
        }

        const result = await snapTrade.authentication.loginSnapTradeUser({
            userId: user.snapTradeUserId,
            userSecret: decryptedSecret,
            customRedirect: customRedirectUri,
            immediateRedirect: true,
        });

        return (result.data as { redirectURI: string }).redirectURI;
    }

    /**
     * Discovers and registers/updates broker accounts from SnapTrade.
     * This is a fast operation suitable for onboarding.
     */
    async syncAccounts(localUserId: string): Promise<{ accounts: number; error?: string }> {
        const user = await prisma.user.findUnique({
            where: { id: localUserId },
            include: { brokerAccounts: true },
        });

        if (!user) return { accounts: 0, error: 'User not found' };
        if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
            return { accounts: 0, error: 'No broker connected' };
        }

        const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
        if (!decryptedSecret) return { accounts: 0, error: 'Decryption failed' };

        const [accounts, authorizations] = await Promise.all([
            snapTrade.accountInformation.listUserAccounts({
                userId: user.snapTradeUserId,
                userSecret: decryptedSecret,
            }),
            snapTrade.connections.listBrokerageAuthorizations({
                userId: user.snapTradeUserId,
                userSecret: decryptedSecret,
            })
        ]);

        const matchedLocalAccountIds = new Set<string>();

        for (const acc of accounts.data || []) {
            const authId = (acc as any).brokerage_authorization;
            const matchingAuth = (authorizations.data || []).find(a => a.id === authId);
            const isDisabled = matchingAuth?.disabled === true;
            const encryptedAccountNumber = acc.number ? encrypt(acc.number) : null;

            const upsertedAccount = await prisma.brokerAccount.upsert({
                where: { snapTradeAccountId: acc.id },
                update: {
                    brokerName: acc.institution_name,
                    accountNumber: encryptedAccountNumber,
                    disabled: isDisabled,
                    disabledAt: isDisabled ? (user.brokerAccounts.find(a => a.snapTradeAccountId === acc.id)?.disabledAt || new Date()) : null,
                    disabledReason: isDisabled ? 'Connection broken - requires re-authentication' : null,
                    lastCheckedAt: new Date(),
                    authorizationId: matchingAuth?.id || undefined,
                },
                create: {
                    userId: localUserId,
                    snapTradeAccountId: acc.id,
                    brokerName: acc.institution_name,
                    accountNumber: encryptedAccountNumber,
                    disabled: isDisabled,
                    disabledAt: isDisabled ? new Date() : null,
                    disabledReason: isDisabled ? 'Connection broken - requires re-authentication' : null,
                    lastCheckedAt: new Date(),
                    authorizationId: matchingAuth?.id || null,
                },
            });

            matchedLocalAccountIds.add(upsertedAccount.id);
        }

        // Handle missing accounts
        const missingAccounts = user.brokerAccounts.filter(
            acc => acc.authorizationId && !matchedLocalAccountIds.has(acc.id) && !acc.disabled
        );

        if (missingAccounts.length > 0) {
            for (const acc of missingAccounts) {
                await prisma.brokerAccount.update({
                    where: { id: acc.id },
                    data: {
                        disabled: true,
                        disabledAt: new Date(),
                        disabledReason: 'Connection removed or missing from provider',
                        lastCheckedAt: new Date()
                    }
                });
            }
        }

        return { accounts: accounts.data?.length || 0 };
    }

    /**
     * Syncs trade activities/transactions for all accounts of the user.
     * Returns detailed sync result including any partial failures.
     */
    async syncTrades(localUserId: string): Promise<{
        synced: number;
        accounts: number;
        failedAccounts: string[];
        skippedTrades: number;
        error?: string;
    }> {
        const user = await prisma.user.findUnique({
            where: { id: localUserId },
            include: { brokerAccounts: true },
        });

        if (!user) {
            return { synced: 0, accounts: 0, failedAccounts: [], skippedTrades: 0, error: 'User not found' };
        }

        if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
            return { synced: 0, accounts: 0, failedAccounts: [], skippedTrades: 0, error: 'No broker connected. Please connect a broker first.' };
        }

        // Decrypt the secret for API use
        const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
        if (!decryptedSecret) {
            return { synced: 0, accounts: 0, failedAccounts: [], skippedTrades: 0, error: 'Failed to decrypt credentials. Please reconnect your broker.' };
        }

        const snapTradeUserId = user.snapTradeUserId;
        const snapTradeUserSecret = decryptedSecret;
        const failedAccounts: string[] = [];
        let skippedTrades = 0;

        // 1. Sync Accounts first (Discovery)
        const accountDiscovery = await this.syncAccounts(localUserId);
        if (accountDiscovery.error) {
            return { synced: 0, accounts: 0, failedAccounts: [], skippedTrades: 0, error: accountDiscovery.error };
        }

        // 2. Fetch Activities (Trades)
        // Optimize the sync window: if we have trades, only fetch since the last one (+14 days safety)
        const latestTrade = await prisma.trade.findFirst({
            where: { account: { userId: localUserId } },
            orderBy: { timestamp: 'desc' },
        });

        const startDate = new Date();
        if (latestTrade) {
            // Start 14 days before the latest trade to catch any delayed settlements or corrections
            startDate.setTime(latestTrade.timestamp.getTime() - (14 * 24 * 60 * 60 * 1000));
        } else {
            // First time sync: fetch 3 years of history
            startDate.setFullYear(startDate.getFullYear() - 3);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = new Date().toISOString().split('T')[0];

        console.log('[SnapTrade Sync] Fetching activities from', startDateStr, 'to', endDateStr);

        const allActivities: any[] = [];
        // Re-fetch user accounts from DB to get the latest snapshot (including the ones we just added)
        const activeAccounts = await prisma.brokerAccount.findMany({
            where: { userId: localUserId, disabled: false }
        });

        const activityPromises = activeAccounts.map(async (acc) => {
            const accountName = acc.brokerName || acc.snapTradeAccountId;
            try {
                const activities = await snapTrade.accountInformation.getAccountActivities({
                    accountId: acc.snapTradeAccountId,
                    userId: snapTradeUserId,
                    userSecret: snapTradeUserSecret,
                    startDate: startDateStr,
                    endDate: endDateStr,
                });
                const activityList = activities.data?.data || [];
                console.log('[SnapTrade Sync] Account', acc.id, 'returned', activityList.length, 'activities');

                // Attach account ID to each activity since it's not included in response
                for (const activity of activityList) {
                    (activity as any)._accountId = acc.id;
                }
                return activityList;
            } catch (err) {
                console.error('[SnapTrade Sync] Error fetching account activities for', accountName, ':', err);
                failedAccounts.push(accountName);
                return [];
            }
        });

        const activityResults = await Promise.all(activityPromises);
        for (const list of activityResults) {
            allActivities.push(...list);
        }

        const { isTradeBlocked } = await import('../tradeBlocklist');

        // Pre-fetch all user broker accounts into a map for quick lookup
        const userAccounts = await prisma.brokerAccount.findMany({
            where: { userId: localUserId }
        });
        const accountMap = new Map(userAccounts.map(a => [a.snapTradeAccountId, a]));
        const localAccountMap = new Map(userAccounts.map(a => [a.id, a]));

        // Pre-fetch existing trade IDs for the user to avoid individual checks and unique constraint errors
        const existingTrades = await prisma.trade.findMany({
            where: {
                accountId: { in: userAccounts.map(a => a.id) }
            },
            select: {
                snapTradeTradeId: true,
                id: true,
                symbol: true,
                quantity: true,
                price: true,
                action: true,
                timestamp: true,
                expiryDate: true,
                type: true,
                contractMultiplier: true
            }
        });
        const existingTradeMap = new Map(
            existingTrades
                .filter(t => t.snapTradeTradeId)
                .map(t => [t.snapTradeTradeId as string, t])
        );

        const tradeData = allActivities;
        console.log('[SnapTrade Sync] Total activities received:', tradeData.length);

        let count = 0;
        const affectedGroups = new Set<string>(); // accountId:symbol

        for (const trade of tradeData) {
            const action = trade.type?.toUpperCase();
            if (!action) {
                skippedTrades++;
                continue;
            }

            const tradeId = trade.id;
            const blockCheck = isTradeBlocked(tradeId);
            if (blockCheck.blocked) {
                console.warn('[SnapTrade Sync] Skipping blocked trade:', tradeId, '-', blockCheck.reason);
                skippedTrades++;
                continue;
            }

            const snapTradeAccountId = trade.account?.id;
            const localAccountId = trade._accountId;

            // Try matching by Prisma ID first (set during activity mapping)
            // Then fallback to SnapTrade Account ID
            const account = localAccountId ? localAccountMap.get(localAccountId) : (snapTradeAccountId ? accountMap.get(snapTradeAccountId) : null);

            if (!account) {
                skippedTrades++;
                continue;
            }

            const rawTradeDate = trade.trade_date || trade.tradeDate;
            const rawSettlementDate = trade.settlement_date || trade.settlementDate;

            let tradeTimestamp: Date;
            if (rawTradeDate) {
                tradeTimestamp = new Date(rawTradeDate);
            } else if (rawSettlementDate) {
                tradeTimestamp = new Date(rawSettlementDate);
            } else {
                skippedTrades++;
                continue;
            }

            if (isNaN(tradeTimestamp.getTime())) {
                skippedTrades++;
                continue;
            }

            const optionSymbol = trade.option_symbol;
            const isOption = !!optionSymbol;

            // Futures Detection Strategy:
            // 1. Symbol starting with / (e.g. /ES)
            // 2. Explicit type from SnapTrade (if available)
            // 3. Raw symbol patterns
            const rawSym = trade.symbol?.symbol || trade.symbol?.raw_symbol || '';
            const isFuture = trade.symbol?.type === 'FUTURE' || rawSym.startsWith('/');

            const tradeSymbol = isOption
                ? (optionSymbol.ticker || trade.symbol?.symbol || 'UNKNOWN')
                : (trade.symbol?.symbol || trade.symbol?.raw_symbol || 'UNKNOWN');

            let contractMultiplier = 1;
            if (isOption) {
                contractMultiplier = optionSymbol.is_mini_option ? 10 : 100;
            } else if (isFuture) {
                // Extract root ticker: e.g. /ESZ3 -> ES, /NQ -> NQ, ESZ24 -> ES
                const cleanSymbol = rawSym.startsWith('/') ? rawSym.substring(1) : rawSym;
                const rootTicker = cleanSymbol.replace(/[0-9]+$/, '').replace(/[FGHJKMNQUVXZ]$/i, '');
                contractMultiplier = FUTURES_MULTIPLIERS[rootTicker.toUpperCase()] || 1;
            }

            const optionAction = trade.option_type || null;
            const quantity = trade.units || 0;
            const price = trade.price || 0;
            const fees = trade.fee || 0;
            const currency = trade.currency?.code || 'USD';
            const type = isOption ? 'OPTION' : (isFuture ? 'FUTURE' : 'STOCK');
            const expiryDate = optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null;

            // Process Trade
            let existing = trade.id ? existingTradeMap.get(trade.id) : null;

            // FUZZY MATCHING: Check if we have a provisional trade created by "Recent Orders"
            // that matches this settled activity. Use this to avoid duplicates.
            let isProvisionalUpgrade = false;

            if (!existing) {
                // Try to find a recent provisional trade (where snapTradeTradeId is null)
                // matching: Account + Symbol + Action + Quantity + recent Time
                const timeDiffThreshold = 24 * 60 * 60 * 1000; // 24 hours (settlement time variance)

                // We need to search the database for this specific potential match since we didn't pre-fetch everything
                // Optimization: We could pre-fetch provisional trades too, but for now let's query.
                const provisionalMatch = await prisma.trade.findFirst({
                    where: {
                        accountId: account.id,
                        symbol: tradeSymbol,
                        action: action.trim(),
                        quantity: quantity, // Quantity should be exact
                        snapTradeTradeId: null, // Only convert provisional trades
                        timestamp: {
                            gte: new Date(tradeTimestamp.getTime() - timeDiffThreshold),
                            lte: new Date(tradeTimestamp.getTime() + timeDiffThreshold),
                        }
                    },
                    orderBy: { timestamp: 'asc' } // Consume identical trades in FIFO order
                });

                if (provisionalMatch) {
                    console.log(`[SnapTrade Sync] Found provisional match for ${tradeSymbol}: upgrading Order ${provisionalMatch.snapTradeOrderId} -> Activity ${trade.id}`);
                    // Mock the "existing" object to trigger the update path
                    existing = provisionalMatch as any;
                    isProvisionalUpgrade = true;
                }
            }

            if (existing) {
                // Check if anything HAS ACTUALLY CHANGED before blind updating
                const hasChanged =
                    isProvisionalUpgrade || // Always update if we are upgrading from provisional
                    existing.symbol !== tradeSymbol ||
                    existing.timestamp.getTime() !== tradeTimestamp.getTime() ||
                    existing.quantity !== quantity ||
                    existing.price !== price ||
                    existing.action !== action.trim() ||
                    existing.expiryDate?.getTime() !== expiryDate?.getTime() ||
                    existing.type !== type ||
                    existing.contractMultiplier !== contractMultiplier;

                if (hasChanged) {
                    if (!isProvisionalUpgrade) {
                        console.log(`[SnapTrade Sync] Updating changed trade: ${trade.id} (${tradeSymbol})`);
                    }

                    await prisma.trade.update({
                        where: { id: existing.id },
                        data: {
                            timestamp: tradeTimestamp,
                            symbol: tradeSymbol,
                            universalSymbolId: isOption ? optionSymbol.id : trade.symbol?.id,
                            quantity: quantity,
                            price: price,
                            action: action.trim(),
                            fees: fees,
                            currency: currency,
                            type: type,
                            // CRITICAL: If this was a provisional upgrade, we NOW set the real Activity ID
                            // ensuring future syncs find it instantly.
                            snapTradeTradeId: trade.id,
                            optionType: optionSymbol?.option_type ? optionSymbol.option_type.trim() : null,
                            strikePrice: optionSymbol?.strike_price || null,
                            expiryDate: expiryDate,
                            optionAction: optionAction ? optionAction.trim() : null,
                            contractMultiplier: contractMultiplier,
                        }
                    });

                    // Update our map so next iteration doesn't find it as missing if duplicate data
                    existingTradeMap.set(trade.id, { ...existing, ...trade });

                    affectedGroups.add(`${account.id}:${tradeSymbol}`);
                    count++;
                } else {
                    skippedTrades++;
                }
            } else {
                // New trade
                await prisma.trade.create({
                    data: {
                        accountId: account.id,
                        symbol: tradeSymbol,
                        universalSymbolId: isOption ? optionSymbol.id : trade.symbol?.id,
                        quantity: quantity,
                        price: price,
                        action: action.trim(),
                        timestamp: tradeTimestamp,
                        fees: fees,
                        currency: currency,
                        type: type,
                        snapTradeTradeId: trade.id || null, // Final settled ID
                        // snapTradeOrderId: null, // Unknown link
                        contractMultiplier: contractMultiplier,
                        optionAction: optionAction ? optionAction.trim() : null,
                        optionType: optionSymbol?.option_type ? optionSymbol.option_type.trim() : null,
                        strikePrice: optionSymbol?.strike_price || null,
                        expiryDate: expiryDate,
                    },
                });
                affectedGroups.add(`${account.id}:${tradeSymbol}`);
                count++;
            }
        }

        // RECALCULATE KEYS FOR AFFECTED GROUPS (Bug #35)
        if (affectedGroups.size > 0) {
            console.log(`[SnapTrade Sync] Recalculating position keys for ${affectedGroups.size} groups...`);
            const { tradeGroupingService } = await import('./trade-grouping.service');
            for (const group of affectedGroups) {
                const [accId, sym] = group.split(':');
                await tradeGroupingService.recalculatePositionKeys(accId, sym);
            }
        }

        // CLEANUP: Delete orphaned provisional trades older than 3 days
        // These are trades that were synced via "Recent Orders" but never matched by a settled Activity
        // (likely due to quantity mismatches or being phantom/canceled orders)
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const deleted = await prisma.trade.deleteMany({
                where: {
                    accountId: { in: user.brokerAccounts.map(a => a.id) },
                    snapTradeTradeId: null,
                    snapTradeOrderId: { not: null }, // Only target provisional SnapTrade trades
                    timestamp: { lt: threeDaysAgo }
                }
            });
            if (deleted.count > 0) {
                console.log(`[SnapTrade Sync] Cleaned up ${deleted.count} orphaned provisional trades`);
            }
        } catch (e) {
            console.error('[SnapTrade Sync] Cleanup failed:', e);
        }

        const accountCount = activeAccounts.length;
        console.log('[SnapTrade Sync] Completed. Synced:', count, 'Accounts:', accountCount, 'Failed:', failedAccounts.length, 'Skipped:', skippedTrades);

        return {
            synced: count,
            accounts: accountCount,
            failedAccounts,
            skippedTrades,
        };
    }

    /**
     * Fetches current positions (holdings) with market prices for unrealized P&L.
     * Returns both stock and option positions across all accounts.
     */
    async getPositions(localUserId: string): Promise<{
        positions: Array<{
            symbol: string;
            units: number;
            price: number | null;
            averageCost: number | null;
            openPnl: number | null;
            marketValue: number | null;
            type: 'STOCK' | 'OPTION';
            accountId: string;
            brokerName: string;
            // Option-specific fields
            optionType?: 'CALL' | 'PUT';
            strikePrice?: number;
            expirationDate?: string;
            underlyingSymbol?: string;
        }>;
        error?: string;
    }> {
        const user = await prisma.user.findUnique({
            where: { id: localUserId },
            include: { brokerAccounts: true },
        });

        if (!user) {
            return { positions: [], error: 'User not found' };
        }

        if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
            return { positions: [], error: 'No broker connected' };
        }

        const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
        if (!decryptedSecret) {
            return { positions: [], error: 'Failed to decrypt credentials' };
        }

        const snapTradeUserId = user.snapTradeUserId;
        const snapTradeUserSecret = decryptedSecret;

        // Get all accounts
        const accounts = await snapTrade.accountInformation.listUserAccounts({
            userId: snapTradeUserId,
            userSecret: snapTradeUserSecret,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allPositions: any[] = [];

        for (const acc of accounts.data || []) {
            const brokerName = acc.institution_name || 'Unknown';

            try {
                // Fetch stock/ETF positions
                const stockPositions = await snapTrade.accountInformation.getUserAccountPositions({
                    accountId: acc.id,
                    userId: snapTradeUserId,
                    userSecret: snapTradeUserSecret,
                });

                for (const pos of stockPositions.data || []) {
                    const units = pos.units || 0;
                    const price = pos.price ?? null;
                    const avgCost = pos.average_purchase_price ?? null;

                    allPositions.push({
                        symbol: pos.symbol?.symbol?.symbol || pos.symbol?.symbol?.raw_symbol || 'UNKNOWN',
                        units,
                        price,
                        averageCost: avgCost,
                        openPnl: pos.open_pnl ?? null,
                        marketValue: price && units ? price * units : null,
                        type: 'STOCK' as const,
                        accountId: acc.id,
                        brokerName,
                    });
                }
            } catch (err) {
                console.error('[SnapTrade Positions] Error fetching stock positions for', acc.id, err);
            }

            try {
                // Fetch option positions
                const optionPositions = await snapTrade.options.listOptionHoldings({
                    accountId: acc.id,
                    userId: snapTradeUserId,
                    userSecret: snapTradeUserSecret,
                });

                for (const pos of optionPositions.data || []) {
                    const optionSymbol = pos.symbol?.option_symbol;
                    const units = pos.units || 0;
                    const price = pos.price ?? null;
                    // average_purchase_price for options is per CONTRACT
                    const avgCostPerContract = pos.average_purchase_price ?? null;
                    const multiplier = optionSymbol?.is_mini_option ? 10 : 100;

                    // Calculate market value: price per share * units * multiplier
                    const marketValue = price && units ? price * Math.abs(units) * multiplier : null;

                    // Calculate open P&L for options
                    let openPnl: number | null = null;
                    if (price !== null && avgCostPerContract !== null && units !== 0) {
                        // Current value - cost basis
                        // avgCostPerContract is per contract, price is per share
                        const currentValue = price * Math.abs(units) * multiplier;
                        const costBasis = avgCostPerContract * Math.abs(units);
                        openPnl = units > 0
                            ? currentValue - costBasis  // Long position
                            : costBasis - currentValue; // Short position
                    }

                    allPositions.push({
                        symbol: optionSymbol?.ticker || 'UNKNOWN',
                        units,
                        price,
                        averageCost: avgCostPerContract,
                        openPnl,
                        marketValue,
                        type: 'OPTION' as const,
                        accountId: acc.id,
                        brokerName,
                        optionType: optionSymbol?.option_type,
                        strikePrice: optionSymbol?.strike_price,
                        expirationDate: optionSymbol?.expiration_date,
                        underlyingSymbol: optionSymbol?.underlying_symbol?.symbol,
                    });
                }
            } catch (err) {
                console.error('[SnapTrade Positions] Error fetching option positions for', acc.id, err);
            }
        }

        return { positions: allPositions };
    }

    /**
     * Syncs recent orders (last 24h) using FREE SnapTrade endpoint.
     * Discord: "Recent orders endpoint is FREE and realtime"
     */
    async syncRecentOrders(localUserId: string): Promise<{
        synced: number;
        accounts: number;
        failedAccounts: string[];
        error?: string;
    }> {
        const user = await prisma.user.findUnique({
            where: { id: localUserId },
            include: { brokerAccounts: { where: { disabled: false } } } // Only active accounts
        });

        if (!user || !user.snapTradeUserId || !user.snapTradeUserSecret) {
            return { synced: 0, accounts: 0, failedAccounts: [], error: 'No broker connected' };
        }

        const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
        if (!decryptedSecret) {
            return { synced: 0, accounts: 0, failedAccounts: [], error: 'Decryption failed' };
        }

        const snapTradeUserId = user.snapTradeUserId;
        const snapTradeUserSecret = decryptedSecret;
        const failedAccounts: string[] = [];
        const allRecentOrders: any[] = [];

        console.log(`[Recent Orders] Fetching for ${user.brokerAccounts.length} accounts of user ${user.email}`);

        // Fetch recent orders for each account (parallel)
        const promises = user.brokerAccounts.map(async (account) => {
            try {
                const response = await snapTrade.accountInformation.getUserAccountRecentOrders({
                    userId: snapTradeUserId,
                    userSecret: snapTradeUserSecret,
                    accountId: account.snapTradeAccountId,
                    onlyExecuted: false, // We want all recent orders (pending/executed) for better tracking
                });

                const ordersData = response.data.orders || [];
                console.log(`[Recent Orders] Account ${account.brokerName}: ${ordersData.length} orders found`);

                // Filter for executed orders only to avoid polluting P&L with pending/canceled orders
                // We fetch everything (onlyExecuted: false) to debug, but only save actual fills
                const executedOrders = ordersData.filter((o: any) =>
                    o.status === 'EXECUTED' || o.status === 'PARTIAL' || o.status === 'FILLED'
                );

                console.log(`[Recent Orders] Account ${account.brokerName}: ${executedOrders.length} executed orders to process`);

                // Tag with local account info
                return executedOrders.map((o: any) => ({ ...o, _localAccountId: account.id }));
            } catch (err) {
                console.error(`[Recent Orders] Error for ${account.brokerName}:`, err);
                failedAccounts.push(account.brokerName || account.snapTradeAccountId);
                return [];
            }
        });

        const results = await Promise.all(promises);
        for (const list of results) {
            allRecentOrders.push(...list);
        }

        if (allRecentOrders.length === 0) {
            return { synced: 0, accounts: user.brokerAccounts.length, failedAccounts };
        }

        // Get existing trade IDs to skip duplicates
        const existingTrades = await prisma.trade.findMany({
            where: { accountId: { in: user.brokerAccounts.map(a => a.id) } },
            select: { snapTradeTradeId: true, snapTradeOrderId: true }
        });
        const existingTradeIds = new Set(existingTrades.map(t => t.snapTradeTradeId).filter(Boolean));
        const existingOrderIds = new Set(existingTrades.map(t => t.snapTradeOrderId).filter(Boolean));

        let syncedCount = 0;
        const affectedGroups = new Set<string>(); // accountId:symbol
        const { isTradeBlocked } = await import('../tradeBlocklist');

        // Process orders into trades
        for (const order of allRecentOrders) {
            const orderId = order.id;

            // Skip if already synced (either as order or as final trade)
            if (existingOrderIds.has(orderId) || existingTradeIds.has(orderId)) continue;

            // Check blocklist
            if (isTradeBlocked(orderId).blocked) continue;

            const localAccountId = order._localAccountId;
            if (!localAccountId) continue;

            // Parse order fields
            const action = order.action?.toUpperCase() || order.order_type?.toUpperCase();
            if (!action) continue;

            const orderDate = order.filled_at || order.updated_at || order.created_at;
            if (!orderDate) continue;

            const timestamp = new Date(orderDate);
            if (isNaN(timestamp.getTime())) continue;

            const optionSymbol = order.option_symbol;
            const isOption = !!optionSymbol;

            // Futures Detection Strategy (same as syncTrades):
            // 1. Symbol starting with / (e.g. /ES)
            // 2. Explicit type from SnapTrade (if available)
            const rawSym = order.universal_symbol?.symbol || '';
            const isFuture = order.universal_symbol?.type === 'FUTURE' || rawSym.startsWith('/');

            const symbol = isOption
                ? (optionSymbol.ticker || order.universal_symbol?.symbol || 'UNKNOWN')
                : (order.universal_symbol?.symbol || 'UNKNOWN');

            let contractMultiplier = 1;
            if (isOption) {
                contractMultiplier = optionSymbol.is_mini_option ? 10 : 100;
            } else if (isFuture) {
                // Extract root ticker: e.g. /ESZ3 -> ES, /NQ -> NQ, ESZ24 -> ES
                const cleanSymbol = rawSym.startsWith('/') ? rawSym.substring(1) : rawSym;
                const rootTicker = cleanSymbol.replace(/[0-9]+$/, '').replace(/[FGHJKMNQUVXZ]$/i, '');
                contractMultiplier = FUTURES_MULTIPLIERS[rootTicker.toUpperCase()] || 1;
            }

            const quantity = order.filled_units || order.total_quantity || 0;
            const price = order.average_price || order.limit_price || 0;

            // Create trade
            try {
                await prisma.trade.create({
                    data: {
                        accountId: localAccountId,
                        symbol: symbol,
                        universalSymbolId: isOption ? optionSymbol.id : order.universal_symbol?.id,
                        quantity: quantity,
                        price: price,
                        action: action.trim(),
                        timestamp: timestamp,
                        fees: 0, // Recent orders may not include fees
                        currency: order.universal_symbol?.currency?.code || 'USD',
                        type: isOption ? 'OPTION' : (isFuture ? 'FUTURE' : 'STOCK'),
                        snapTradeTradeId: null, // Provisional: not yet a settled Activity ID from daily sync
                        snapTradeOrderId: orderId, // Track source Order ID
                        contractMultiplier: contractMultiplier,
                        optionAction: order.option_type || null,
                        optionType: optionSymbol?.option_type || null,
                        strikePrice: optionSymbol?.strike_price || null,
                        expiryDate: optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null,
                    },
                });
                syncedCount++;
                affectedGroups.add(`${localAccountId}:${symbol}`);
            } catch (err) {
                console.error('[Recent Orders] Create trade failed:', err);
            }
        }

        // RECALCULATE KEYS FOR AFFECTED GROUPS (Ensure P&L is updated)
        if (affectedGroups.size > 0) {
            console.log(`[Recent Orders] Recalculating position keys for ${affectedGroups.size} groups...`);
            const { tradeGroupingService } = await import('./trade-grouping.service');
            for (const group of affectedGroups) {
                const [accId, sym] = group.split(':');
                await tradeGroupingService.recalculatePositionKeys(accId, sym);
            }
        }

        console.log(`[Recent Orders] Synced ${syncedCount} new trades for user ${user.email}`);

        return {
            synced: syncedCount,
            accounts: user.brokerAccounts.length,
            failedAccounts,
        };
    }
}

export const snapTradeService = new SnapTradeService();
