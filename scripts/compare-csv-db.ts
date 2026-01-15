import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function compareCsvToDb() {
    const userId = 'cmk95esou000012nso4n7zgdl';
    const csvPath = path.join(process.cwd(), 'All_trades_SP.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    // Parse CSV trades for Jan 2026
    const csvTrades = [];
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 13) continue;
        const ts = new Date(parts[12]);
        if (ts.getFullYear() === 2026 && ts.getMonth() === 0) { // Jan 2026
            csvTrades.push({
                symbol: parts[8],
                action: parts[9],
                quantity: parseFloat(parts[10]),
                price: parseFloat(parts[11]),
                timestamp: ts
            });
        }
    }

    console.log(`CSV Trades for Jan 2026: ${csvTrades.length}`);

    // Get DB trades for Jan 2026
    const dbTrades = await prisma.trade.findMany({
        where: {
            account: { userId },
            timestamp: {
                gte: new Date('2026-01-01T00:00:00Z'),
                lte: new Date('2026-01-13T23:59:59Z')
            }
        },
        orderBy: { timestamp: 'asc' }
    });

    console.log(`DB Trades for Jan 2026: ${dbTrades.length}\n`);

    // Match them up
    const unmatchedCsv = [];
    const matchedDbIds = new Set();

    for (const ct of csvTrades) {
        const match = dbTrades.find(dt =>
            !matchedDbIds.has(dt.id) &&
            dt.symbol === ct.symbol &&
            dt.action === ct.action &&
            Math.abs(dt.quantity - ct.quantity) < 0.001 &&
            Math.abs(dt.price - ct.price) < 0.01 &&
            Math.abs(dt.timestamp.getTime() - ct.timestamp.getTime()) < 5000 // 5 sec tolerance
        );

        if (match) {
            matchedDbIds.add(match.id);
        } else {
            unmatchedCsv.push(ct);
        }
    }

    const extraInDb = dbTrades.filter(dt => !matchedDbIds.has(dt.id));

    console.log(`Unmatched CSV trades (missing in DB): ${unmatchedCsv.length}`);
    if (unmatchedCsv.length > 0) {
        unmatchedCsv.slice(0, 5).forEach(t => console.log(`  MISSING: ${t.symbol} | ${t.action} | ${t.quantity} | ${t.timestamp.toISOString()}`));
    }

    console.log(`\nExtra DB trades (duplicates or sync issues): ${extraInDb.length}`);
    if (extraInDb.length > 0) {
        extraInDb.slice(0, 10).forEach(t => console.log(`  EXTRA: ${t.id.slice(-8)} | ${t.symbol} | ${t.action} | ${t.quantity} | ${t.price} | ${t.timestamp.toISOString()}`));
    }

    // Check multipliers for extra trades
    if (extraInDb.length > 0) {
        const withBadMult = extraInDb.filter(t => t.contractMultiplier !== 1 && !t.symbol.match(/\d{6}[CP]\d{8}/));
        console.log(`\nExtra trades with non-stock multiplier: ${withBadMult.length}`);
    }

    await prisma.$disconnect();
}

compareCsvToDb().catch(console.error);
