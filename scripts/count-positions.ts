
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userSearch = process.argv[2] || "Suman";
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { name: { contains: userSearch, mode: 'insensitive' } },
                { email: { contains: userSearch, mode: 'insensitive' } }
            ]
        }
    });

    if (!user) {
        console.log("User not found");
        return;
    }

    console.log(`Calculating open positions for ${user.name}...`);

    const trades = await prisma.trade.findMany({
        where: {
            account: { userId: user.id },
            action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'] }
        },
        orderBy: { timestamp: 'asc' }
    });

    const positions = new Map<string, number>();

    for (const trade of trades) {
        const key = `${trade.accountId}:${trade.symbol}`;
        const current = positions.get(key) || 0;

        let qtyChange = trade.quantity;
        const action = trade.action.toUpperCase();

        if (action.includes('SELL') || action === 'OPTIONEXPIRATION' || action === 'EXERCISES') {
            qtyChange = -Math.abs(trade.quantity);
        } else if (action.includes('BUY') || action === 'ASSIGNMENT') {
            qtyChange = Math.abs(trade.quantity);
        }

        positions.set(key, current + qtyChange);
    }

    const openPositions = Array.from(positions.entries())
        .filter(([_, qty]) => Math.abs(qty) > 0.0001)
        .map(([key, qty]) => ({ symbol: key.split(':')[1], qty }));

    console.log(`\nOpen Positions for ${user.name}:`);
    console.log(`Total Symbols with Open Positions: ${openPositions.length}`);
    openPositions.forEach(p => {
        console.log(`${p.symbol}: ${p.qty.toFixed(4)}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
