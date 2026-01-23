import { snapTrade } from '@/lib/snaptrade';
import { prisma } from '@/lib/prisma';
import { encrypt, safeDecrypt } from '@/lib/encryption';

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

        // 1. Get Accounts (to ensure we have them all)
        console.log('[SnapTrade Sync] Fetching accounts for user:', snapTradeUserId);

        // Fetch both accounts and authorizations to link the authorizationId
        const [accounts, authorizations] = await Promise.all([
            snapTrade.accountInformation.listUserAccounts({
                userId: snapTradeUserId,
                userSecret: snapTradeUserSecret,
            }),
            snapTrade.connections.listBrokerageAuthorizations({
                userId: snapTradeUserId,
                userSecret: snapTradeUserSecret,
            })
        ]);

        console.log('[SnapTrade Sync] Found', accounts.data?.length || 0, 'accounts and', authorizations.data?.length || 0, 'authorizations');

        // Update/Create Accounts in DB
        const matchedLocalAccountIds = new Set<string>();

        for (const acc of accounts.data || []) {
            console.log('[SnapTrade Sync] Account:', acc.id, acc.institution_name, 'Number:', acc.number);

            // Find matching authorizationId for this account
            // We match by the institution name from the auth object
            const matchingAuth = (authorizations.data || []).find(
                a => a.brokerage?.name === acc.institution_name
            );

            // Determine disabled status from the authorization
            const isDisabled = matchingAuth?.disabled === true;

            // Encrypt account number (PII) before storing
            const encryptedAccountNumber = acc.number ? encrypt(acc.number) : null;

            const upsertedAccount = await prisma.brokerAccount.upsert({
                where: { snapTradeAccountId: acc.id },
                update: {
                    brokerName: acc.institution_name,
                    accountNumber: encryptedAccountNumber,
                    // Clear/update disabled status based on actual authorization state
                    disabled: isDisabled,
                    disabledAt: isDisabled ? (user.brokerAccounts.find(a => a.snapTradeAccountId === acc.id)?.disabledAt || new Date()) : null,
                    disabledReason: isDisabled ? 'Connection broken - requires re-authentication' : null,
                    lastCheckedAt: new Date(),
                    lastSyncedAt: new Date(),
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
                    lastSyncedAt: new Date(),
                    authorizationId: matchingAuth?.id || null,
                },
            });

            matchedLocalAccountIds.add(upsertedAccount.id);
        }

        // Handle accounts that were NOT in the SnapTrade list but have an authorizationId
        // This handles cases where an authorization was deleted in SnapTrade
        const missingAccounts = user.brokerAccounts.filter(
            acc => acc.authorizationId && !matchedLocalAccountIds.has(acc.id) && !acc.disabled
        );

        if (missingAccounts.length > 0) {
            console.warn(`[SnapTrade Sync] Found ${missingAccounts.length} accounts missing from SnapTrade, marking as disabled`);
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

        // 2. Fetch Activities (Trades)
        // We need to iterate over date ranges or fetch "all".
        // For MVP, lets fetch "last 1 year" or similar defaults?
        // Or use `startDate` / `endDate`.
        // Fetch 3 years of history to ensure complete position data
        // (1 year can miss opening trades for long-held positions)
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

        console.log('[SnapTrade Sync] Fetching activities from', threeYearsAgo.toISOString().split('T')[0], 'to', new Date().toISOString().split('T')[0]);

        // Use the newer account-level API (the old transactionsAndReporting.getActivities is deprecated)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allActivities: any[] = [];

        for (const acc of accounts.data || []) {
            const accountName = acc.institution_name || acc.id;
            console.log('[SnapTrade Sync] Fetching activities for account:', acc.id, accountName);
            try {
                const activities = await snapTrade.accountInformation.getAccountActivities({
                    accountId: acc.id,
                    userId: snapTradeUserId,
                    userSecret: snapTradeUserSecret,
                    startDate: threeYearsAgo.toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                });
                // Response structure: { data: { data: [...activities], pagination: {...} } }
                const activityList = activities.data?.data || [];
                console.log('[SnapTrade Sync] Account', acc.id, 'returned', activityList.length, 'activities');
                if (activityList.length > 0) {
                    // Log only safe identifiers, not full trade data
                    console.log('[SnapTrade Sync] First activity id:', activityList[0]?.id, 'type:', activityList[0]?.type);
                }
                // Attach account ID to each activity since it's not included in response
                for (const activity of activityList) {
                    activity._accountId = acc.id;
                }
                allActivities.push(...activityList);
            } catch (err) {
                console.error('[SnapTrade Sync] Error fetching account activities for', accountName, ':', err);
                failedAccounts.push(accountName);
            }
        }

        const tradeData = allActivities;
        console.log('[SnapTrade Sync] Total activities received:', tradeData.length);

        let count = 0;

        for (const trade of tradeData) {
            // Filter only "trade" types (BUY/SELL)
            // SnapTrade "type" can be DIVIDEND, etc.
            // We are interested in BUY, SELL, maybe others.
            // Meaningful types: BUY, SELL, SPLIT, ASSIGNMENT, EXERCISES

            const action = trade.type?.toUpperCase();
            if (!action) {
                skippedTrades++;
                continue;
            }

            // Check if this trade is on the permanent blocklist
            const tradeId = trade.id;
            const blockCheck = await import('../tradeBlocklist').then(m => m.isTradeBlocked(tradeId));
            if (blockCheck.blocked) {
                console.warn('[SnapTrade Sync] Skipping blocked trade:', tradeId, '-', blockCheck.reason);
                skippedTrades++;
                continue;
            }

            // Ensure account exists locally (it should from step 1)
            // Use _accountId we attached, or fall back to trade.account?.id for old API
            const snapTradeAccountId = trade._accountId || trade.account?.id;
            if (!snapTradeAccountId) {
                console.log('[SnapTrade Sync] Skipping trade - no account ID:', trade.id);
                skippedTrades++;
                continue;
            }
            const account = await prisma.brokerAccount.findUnique({
                where: { snapTradeAccountId },
            });

            if (!account) {
                skippedTrades++;
                continue;
            }

            // Parse trade date - SnapTrade may use snake_case or camelCase depending on SDK version
            const rawTradeDate = trade.trade_date || trade.tradeDate;
            const rawSettlementDate = trade.settlement_date || trade.settlementDate;

            let tradeTimestamp: Date;
            if (rawTradeDate) {
                tradeTimestamp = new Date(rawTradeDate);
            } else if (rawSettlementDate) {
                tradeTimestamp = new Date(rawSettlementDate);
            } else {
                console.warn('[SnapTrade Sync] Trade missing date, skipping:', trade.id, 'Raw data:', JSON.stringify(trade));
                skippedTrades++;
                continue; // Skip trades without valid dates instead of using import date
            }

            // Validate the parsed date
            if (isNaN(tradeTimestamp.getTime())) {
                console.warn('[SnapTrade Sync] Invalid date for trade:', trade.id, 'Raw values:', { rawTradeDate, rawSettlementDate });
                skippedTrades++;
                continue;
            }

            // SnapTrade SDK uses snake_case for all fields
            // option_symbol contains option details, symbol contains stock details
            const optionSymbol = trade.option_symbol;
            const isOption = !!optionSymbol;

            // For options, use the OCC ticker from option_symbol; for stocks, use symbol
            const tradeSymbol = isOption
                ? (optionSymbol.ticker || trade.symbol?.symbol || 'UNKNOWN')
                : (trade.symbol?.symbol || trade.symbol?.raw_symbol || 'UNKNOWN');

            // Contract multiplier: 100 for standard options, 10 for mini options, 1 for stocks
            const contractMultiplier = isOption
                ? (optionSymbol.is_mini_option ? 10 : 100)
                : 1;

            // Option action (BUY_TO_OPEN, SELL_TO_CLOSE, etc.) is in trade.option_type
            const optionAction = trade.option_type || null;

            const quantity = trade.units || 0;

            console.log('[SnapTrade Sync] Processing trade:', trade.id, 'Date:', tradeTimestamp.toISOString(), 'Symbol:', tradeSymbol, 'Type:', isOption ? 'OPTION' : 'STOCK', 'Multiplier:', contractMultiplier);

            // Use transaction for atomic check-and-insert to prevent race conditions
            const result = await prisma.$transaction(async (tx) => {
                // Primary deduplication: Check by snapTradeTradeId (unique identifier from SnapTrade)
                // This is the only reliable way to identify duplicates - content-based dedup
                // was causing legitimate trades to be skipped (e.g., multiple partial fills
                // with same qty/price at same time)
                if (trade.id) {
                    const existingBySnapTradeId = await tx.trade.findUnique({
                        where: { snapTradeTradeId: trade.id }
                    });
                    if (existingBySnapTradeId) {
                        // Update the existing trade with latest data
                        await tx.trade.update({
                            where: { id: existingBySnapTradeId.id },
                            data: {
                                timestamp: tradeTimestamp,
                                symbol: tradeSymbol,
                                universalSymbolId: isOption ? optionSymbol.id : trade.symbol?.id,
                                type: isOption ? 'OPTION' : 'STOCK',
                                optionType: optionSymbol?.option_type || null,
                                strikePrice: optionSymbol?.strike_price || null,
                                expiryDate: optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null,
                                optionAction: optionAction,
                                contractMultiplier: contractMultiplier,
                            }
                        });
                        return { skipped: false, updated: true, tradeId: existingBySnapTradeId.id };
                    }
                }

                // Create new trade
                const newTrade = await tx.trade.create({
                    data: {
                        accountId: account.id,
                        symbol: tradeSymbol,
                        universalSymbolId: isOption ? optionSymbol.id : trade.symbol?.id,
                        quantity: quantity,
                        price: trade.price || 0, // Keep original price for storage
                        action: action,
                        timestamp: tradeTimestamp,
                        fees: trade.fee || 0,
                        currency: trade.currency?.code || 'USD',
                        type: isOption ? 'OPTION' : 'STOCK',
                        snapTradeTradeId: trade.id || null, // Handle undefined/null explicitly
                        contractMultiplier: contractMultiplier,
                        optionAction: optionAction,
                        optionType: optionSymbol?.option_type || null,
                        strikePrice: optionSymbol?.strike_price || null,
                        expiryDate: optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null,
                    },
                });
                return { skipped: false, created: true, tradeId: newTrade.id };
            });

            count++;
        }

        const accountCount = accounts.data?.length || 0;
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
}

export const snapTradeService = new SnapTradeService();
