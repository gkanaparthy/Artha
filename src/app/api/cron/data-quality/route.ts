import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Daily Data Quality Monitoring Cron
 * 
 * Schedule: Daily at 2 AM UTC
 * Vercel Cron: https://vercel.com/docs/cron-jobs
 * 
 * Actions:
 * 1. Scan all users for data quality issues
 * 2. Log issues found
 * 3. (Future) Send email alerts to admins if critical issues found
 */

export async function GET(req: NextRequest) {
    try {
        // Verify this is a cron job (Vercel sets this header)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Cron: Data Quality] Starting daily health check...');

        // Call the health check endpoint logic
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

        const issues = [];

        for (const user of users) {
            const allTrades = user.brokerAccounts.flatMap(acc => acc.trades);
            if (allTrades.length === 0) continue;

            // Check for phantom positions
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

                let netQty = 0;
                for (const trade of trades) {
                    const action = trade.action.toUpperCase();
                    const isBuy = action.includes('BUY') || action === 'ASSIGNMENT';
                    const isSell = action.includes('SELL') || action === 'EXERCISES' || action === 'OPTIONEXPIRATION';

                    if (isBuy) netQty += Math.abs(trade.quantity);
                    else if (isSell) netQty -= Math.abs(trade.quantity);
                }

                if (!hasBuys && hasSells && netQty < -0.001) {
                    phantomSymbols.push(symbol);
                }
            }

            if (phantomSymbols.length > 0) {
                issues.push({
                    userId: user.id,
                    userName: user.name || user.email,
                    phantomCount: phantomSymbols.length,
                    symbols: phantomSymbols
                });
            }
        }

        console.log(`[Cron: Data Quality] Scanned ${users.length} users`);
        console.log(`[Cron: Data Quality] Found ${issues.length} users with phantom positions`);

        if (issues.length > 0) {
            console.log('[Cron: Data Quality] Users with issues:', JSON.stringify(issues, null, 2));

            // TODO: Send email alert to admin if critical issues
            // For now, just log it
        }

        return NextResponse.json({
            success: true,
            scannedUsers: users.length,
            usersWithIssues: issues.length,
            issues: issues.length > 0 ? issues : undefined,
            timestamp: new Date().toISOString()
        });
    } catch (error: unknown) {
        console.error('[Cron: Data Quality] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
