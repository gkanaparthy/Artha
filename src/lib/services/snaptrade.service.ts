import { snapTrade } from '@/lib/snaptrade';
import { prisma } from '@/lib/prisma';

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
        // We use the localUserId as the SnapTrade User ID for simplicity,
        // provided it meets their requirements (immutable, unique).
        // Or we let them generate one?
        // Docs: "You will need to provide a unique SnapTrade userId"
        const snapTradeUserId = localUserId;

        const result = await snapTrade.authentication.registerSnapTradeUser({
            userId: snapTradeUserId,
        });

        // Save secret
        await prisma.user.update({
            where: { id: localUserId },
            data: {
                snapTradeUserId: result.data.userId,
                snapTradeUserSecret: result.data.userSecret,
            },
        });

        return {
            userId: result.data.userId,
            userSecret: result.data.userSecret,
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

        const result = await snapTrade.authentication.loginSnapTradeUser({
            userId: user.snapTradeUserId,
            userSecret: user.snapTradeUserSecret,
            customRedirect: customRedirectUri,
            immediateRedirect: true,
        });

        return (result.data as any).redirectURI;
    }

    /**
     * Syncs trade activities/transactions for all accounts of the user.
     */
    async syncTrades(localUserId: string) {
        const user = await prisma.user.findUnique({
            where: { id: localUserId },
            include: { brokerAccounts: true },
        });

        if (!user || !user.snapTradeUserId || !user.snapTradeUserSecret) {
            throw new Error('User not found or not registered');
        }

        const { snapTradeUserId, snapTradeUserSecret } = user;

        // 1. Get Accounts (to ensure we have them all)
        console.log('[SnapTrade Sync] Fetching accounts for user:', snapTradeUserId);
        const accounts = await snapTrade.accountInformation.listUserAccounts({
            userId: snapTradeUserId,
            userSecret: snapTradeUserSecret,
        });
        console.log('[SnapTrade Sync] Found', accounts.data?.length || 0, 'accounts');

        // Update/Create Accounts in DB
        for (const acc of accounts.data || []) {
            console.log('[SnapTrade Sync] Account:', acc.id, acc.institution_name);
            await prisma.brokerAccount.upsert({
                where: { snapTradeAccountId: acc.id },
                update: {
                    brokerName: acc.institution_name,
                },
                create: {
                    userId: localUserId,
                    snapTradeAccountId: acc.id,
                    brokerName: acc.institution_name,
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
            console.log('[SnapTrade Sync] Fetching activities for account:', acc.id);
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
                    console.log('[SnapTrade Sync] First activity:', JSON.stringify(activityList[0], null, 2));
                }
                // Attach account ID to each activity since it's not included in response
                for (const activity of activityList) {
                    activity._accountId = acc.id;
                }
                allActivities.push(...activityList);
            } catch (err) {
                console.error('[SnapTrade Sync] Error fetching account activities:', err);
            }
        }

        const tradeData = allActivities;
        console.log('[SnapTrade Sync] Total activities received:', tradeData.length);
        if (tradeData.length > 0) {
            console.log('[SnapTrade Sync] First activity sample:', JSON.stringify(tradeData[0], null, 2));
        }

        let count = 0;

        for (const trade of tradeData) {
            // Filter only "trade" types (BUY/SELL)
            // SnapTrade "type" can be DIVIDEND, etc.
            // We are interested in BUY, SELL, maybe others.
            // We will map them.

            // Basic check for trade-like types.
            const meaningfulTypes = ['BUY', 'SELL', 'SPLIT', 'ASSIGNMENT', 'EXERCISES']; // Adjust as needed
            // Actually SnapTrade returns normalized types usually.

            const action = trade.type?.toUpperCase();
            if (!action) continue;

            // Ensure account exists locally (it should from step 1)
            // Use _accountId we attached, or fall back to trade.account?.id for old API
            const snapTradeAccountId = trade._accountId || trade.account?.id;
            if (!snapTradeAccountId) {
                console.log('[SnapTrade Sync] Skipping trade - no account ID:', trade.id);
                continue;
            }
            const account = await prisma.brokerAccount.findUnique({
                where: { snapTradeAccountId },
            });

            if (!account) continue;

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
                continue; // Skip trades without valid dates instead of using import date
            }

            // Validate the parsed date
            if (isNaN(tradeTimestamp.getTime())) {
                console.warn('[SnapTrade Sync] Invalid date for trade:', trade.id, 'Raw values:', { rawTradeDate, rawSettlementDate });
                continue;
            }

            console.log('[SnapTrade Sync] Processing trade:', trade.id, 'Date:', tradeTimestamp.toISOString(), 'Symbol:', trade.symbol?.symbol);

            // Upsert Trade
            await prisma.trade.upsert({
                where: { snapTradeTradeId: trade.id },
                update: {
                    timestamp: tradeTimestamp, // Always update the timestamp in case it was wrong before
                    universalSymbolId: trade.optionSymbol ? trade.optionSymbol.id : trade.symbol?.id,
                    optionType: trade.optionSymbol?.optionType,
                    strikePrice: trade.optionSymbol?.strikePrice,
                    expiryDate: trade.optionSymbol?.expirationDate ? new Date(trade.optionSymbol.expirationDate) : null,
                },
                create: {
                    accountId: account.id,
                    symbol: trade.symbol?.symbol || trade.symbol?.rawSymbol || 'UNKNOWN',
                    universalSymbolId: trade.optionSymbol ? trade.optionSymbol.id : trade.symbol?.id,
                    quantity: trade.units || 0,
                    price: trade.price || 0,
                    action: action,
                    timestamp: tradeTimestamp,
                    fees: trade.fee || 0,
                    currency: trade.currency?.code || 'USD',
                    type: trade.optionSymbol ? 'OPTION' : 'STOCK',
                    snapTradeTradeId: trade.id,

                    // Detailed Option Data
                    optionType: trade.optionSymbol?.optionType,
                    strikePrice: trade.optionSymbol?.strikePrice,
                    expiryDate: trade.optionSymbol?.expirationDate ? new Date(trade.optionSymbol.expirationDate) : null,
                },
            });

            count++;
        }

        return { synced: count };
    }
}

export const snapTradeService = new SnapTradeService();
