import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

/**
 * Data Health Check Endpoint
 * 
 * Scans all users for common data quality issues:
 * 1. Phantom positions (orphaned sells without buys)
 * 2. Suspiciously old open positions
 * 3. Extreme position counts
 * 
 * Admin-only endpoint for monitoring
 */

interface UserIssue {
    userId: string;
    userName: string | null;
    email: string | null;
    issues: {
        phantomPositions?: {
            count: number;
            symbols: string[];
        };
        oldOpenPositions?: {
            count: number;
            oldestDate: string;
        };
        extremePositionCount?: {
            count: number;
        };
    };
    severity: 'low' | 'medium' | 'high';
}

export async function GET() {
    try {
        // Verify admin access
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || session.user.email !== adminEmail) {
            return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        }

        // Get all users with trades
        const users = await prisma.user.findMany({
            where: {
                brokerAccounts: {
                    some: {
                        trades: {
                            some: {}
                        }
                    }
                }
            },
            include: {
                brokerAccounts: {
                    include: {
                        trades: {
                            orderBy: { timestamp: 'asc' }
                        }
                    }
                }
            }
        });

        console.log(`[Health Check] Scanning ${users.length} users...`);

        const usersWithIssues: UserIssue[] = [];

        for (const user of users) {
            const allTrades = user.brokerAccounts.flatMap(acc => acc.trades);

            if (allTrades.length === 0) continue;

            const issues: UserIssue['issues'] = {};
            let severity: 'low' | 'medium' | 'high' = 'low';

            // Check 1: Phantom positions (sells without buys)
            const tradesBySymbol = new Map<string, typeof allTrades>();
            for (const trade of allTrades) {
                if (!tradesBySymbol.has(trade.symbol)) {
                    tradesBySymbol.set(trade.symbol, []);
                }
                tradesBySymbol.get(trade.symbol)!.push(trade);
            }

            const phantomSymbols: string[] = [];
            for (const [symbol, trades] of tradesBySymbol) {
                const hasBuys = trades.some(t => {
                    const action = t.action.toUpperCase();
                    return action.includes('BUY') || action === 'ASSIGNMENT';
                });
                const hasSells = trades.some(t => {
                    const action = t.action.toUpperCase();
                    return action.includes('SELL') || action === 'EXERCISES' || action === 'OPTIONEXPIRATION';
                });

                // Calculate net quantity
                let netQty = 0;
                for (const trade of trades) {
                    const action = trade.action.toUpperCase();
                    const isBuy = action.includes('BUY') || action === 'ASSIGNMENT';
                    const isSell = action.includes('SELL') || action === 'EXERCISES' || action === 'OPTIONEXPIRATION';

                    if (isBuy) netQty += Math.abs(trade.quantity);
                    else if (isSell) netQty -= Math.abs(trade.quantity);
                }

                // Phantom: has sells, no buys, and net negative (open short)
                if (!hasBuys && hasSells && netQty < -0.001) {
                    phantomSymbols.push(symbol);
                }
            }

            if (phantomSymbols.length > 0) {
                issues.phantomPositions = {
                    count: phantomSymbols.length,
                    symbols: phantomSymbols
                };
                severity = phantomSymbols.length > 5 ? 'high' : 'medium';
            }

            // Check 2: Suspiciously old open positions (>2 years)
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

            const oldTrades = allTrades.filter(t => t.timestamp < twoYearsAgo);
            if (oldTrades.length > 20) { // Arbitrary threshold
                const oldestTrade = allTrades[0]; // Already sorted by timestamp asc
                issues.oldOpenPositions = {
                    count: oldTrades.length,
                    oldestDate: oldestTrade.timestamp.toISOString().split('T')[0]
                };
                if (severity === 'low') severity = 'medium';
            }

            // Check 3: Extreme position count (might indicate sync issues)
            const uniqueSymbols = new Set(allTrades.map(t => t.symbol)).size;
            if (uniqueSymbols > 100) {
                issues.extremePositionCount = {
                    count: uniqueSymbols
                };
                if (severity === 'low') severity = 'medium';
            }

            if (Object.keys(issues).length > 0) {
                usersWithIssues.push({
                    userId: user.id,
                    userName: user.name,
                    email: user.email,
                    issues,
                    severity
                });
            }
        }

        console.log(`[Health Check] Found ${usersWithIssues.length} users with data quality issues`);

        return NextResponse.json({
            scannedUsers: users.length,
            usersWithIssues: usersWithIssues.length,
            issues: usersWithIssues,
            timestamp: new Date().toISOString(),
            summary: {
                critical: usersWithIssues.filter(u => u.severity === 'high').length,
                medium: usersWithIssues.filter(u => u.severity === 'medium').length,
                low: usersWithIssues.filter(u => u.severity === 'low').length,
            }
        });
    } catch (error: unknown) {
        console.error('[Health Check] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
