import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeSymbols() {
    const userId = 'cmk95esou000012nso4n7zgdl';
    const csvPath = path.join(process.cwd(), 'All_trades_SP.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.trim().split('\n');

    const csvSymbols = new Set();
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 9) continue;
        const ts = new Date(parts[12]);
        if (ts.getFullYear() === 2026) {
            csvSymbols.add(parts[8]);
        }
    }

    const dbTrades = await prisma.trade.findMany({
        where: {
            account: { userId },
            timestamp: {
                gte: new Date('2026-01-01T00:00:00Z'),
                lte: new Date('2026-01-13T23:59:59Z')
            }
        },
        select: { symbol: true }
    });
    const dbSymbols = new Set(dbTrades.map(t => t.symbol));

    console.log('--- SYMBOLS IN JAN 2026 ---');
    console.log(`CSV Symbols Count: ${csvSymbols.size}`);
    console.log(`DB Symbols Count: ${dbSymbols.size}`);

    const inCsvNotDb = [...csvSymbols].filter(s => !dbSymbols.has(s));
    const inDbNotCsv = [...dbSymbols].filter(s => !csvSymbols.has(s));

    console.log(`\nIn CSV but NOT in DB (${inCsvNotDb.length}):`);
    console.log(inCsvNotDb.slice(0, 10).join(', '));

    console.log(`\nIn DB but NOT in CSV (${inDbNotCsv.length}):`);
    console.log(inDbNotCsv.slice(0, 10).join(', '));

    await prisma.$disconnect();
}

analyzeSymbols().catch(console.error);
