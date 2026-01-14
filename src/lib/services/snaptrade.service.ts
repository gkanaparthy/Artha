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

        if (!user) throw new Error('Local user not found');

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

        if (
            !user ||
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
        const accounts = await snapTrade.accountInformation.listUserAccounts({
            userId: snapTradeUserId,
            userSecret: snapTradeUserSecret,
        });
        console.log('[SnapTrade Sync] Found', accounts.data?.length || 0, 'accounts');

        // Update/Create Accounts in DB
        for (const acc of accounts.data || []) {
            console.log('[SnapTrade Sync] Account:', acc.id, acc.institution_name, 'Number:', acc.number);
            await prisma.brokerAccount.upsert({
                where: { snapTradeAccountId: acc.id },
                update: {
                    brokerName: acc.institution_name,
                    accountNumber: acc.number || null,
                },
                create: {
                    userId: localUserId,
                    snapTradeAccountId: acc.id,
                    brokerName: acc.institution_name,
                    accountNumber: acc.number || null,
                },
            });
        }

        // 2. Fetch Activities (Trades)
        // We need to iterate over date ranges or fetch "all".
        // For MVP, lets fetch "last 1 year" or similar defaults?
        // Or use `startDate` / `endDate`.
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        console.log('[SnapTrade Sync] Fetching activities from', oneYearAgo.toISOString().split('T')[0], 'to', new Date().toISOString().split('T')[0]);

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
                    startDate: oneYearAgo.toISOString().split('T')[0],
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

            console.log('[SnapTrade Sync] Processing trade:', trade.id, 'Date:', tradeTimestamp.toISOString(), 'Symbol:', tradeSymbol, 'Type:', isOption ? 'OPTION' : 'STOCK', 'Multiplier:', contractMultiplier);

            // Content-based deduplication: Check if a trade with same content already exists
            // SnapTrade sometimes returns the same trade with different IDs
            const existingTrade = await prisma.trade.findFirst({
                where: {
                    accountId: account.id,
                    symbol: tradeSymbol,
                    action: action,
                    quantity: trade.units || 0,
                    price: trade.price || 0,
                    timestamp: tradeTimestamp
                }
            });

            if (existingTrade) {
                // Trade with same content already exists, skip to avoid duplicate
                console.log('[SnapTrade Sync] Skipping duplicate trade (same content exists):', trade.id);
                skippedTrades++;
                continue;
            }

            // Upsert Trade (only if not already existing with same content)
            await prisma.trade.upsert({
                where: { snapTradeTradeId: trade.id },
                update: {
                    timestamp: tradeTimestamp, // Always update the timestamp in case it was wrong before
                    symbol: tradeSymbol,
                    universalSymbolId: isOption ? optionSymbol.id : trade.symbol?.id,
                    type: isOption ? 'OPTION' : 'STOCK',
                    optionType: optionSymbol?.option_type || null,
                    strikePrice: optionSymbol?.strike_price || null,
                    expiryDate: optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null,
                    optionAction: optionAction,
                    contractMultiplier: contractMultiplier,
                },
                create: {
                    accountId: account.id,
                    symbol: tradeSymbol,
                    universalSymbolId: isOption ? optionSymbol.id : trade.symbol?.id,
                    quantity: trade.units || 0,
                    price: trade.price || 0,
                    action: action,
                    timestamp: tradeTimestamp,
                    fees: trade.fee || 0,
                    currency: trade.currency?.code || 'USD',
                    type: isOption ? 'OPTION' : 'STOCK',
                    snapTradeTradeId: trade.id,
                    contractMultiplier: contractMultiplier,
                    optionAction: optionAction,

                    // Detailed Option Data (snake_case from SnapTrade SDK)
                    optionType: optionSymbol?.option_type || null,
                    strikePrice: optionSymbol?.strike_price || null,
                    expiryDate: optionSymbol?.expiration_date ? new Date(optionSymbol.expiration_date) : null,
                },
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
}

export const snapTradeService = new SnapTradeService();
