
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking user and session data...\n');

    // Get the user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.log('❌ No user found in database');
        return;
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Check sessions
    const sessions = await prisma.session.findMany({
        where: { userId: user.id }
    });
    console.log(`Sessions for this user: ${sessions.length}`);
    if (sessions.length > 0) {
        sessions.forEach(s => {
            console.log(`  - Expires: ${s.expires}`);
        });
    }

    // Check broker accounts
    const accounts = await prisma.brokerAccount.findMany({
        where: { userId: user.id },
        include: {
            _count: {
                select: { trades: true }
            }
        }
    });
    console.log(`\nBroker accounts for userId ${user.id}: ${accounts.length}`);
    accounts.forEach(acc => {
        console.log(`  - ${acc.brokerName} (ID: ${acc.id}): ${acc._count.trades} trades`);
    });

    // Check trades directly
    const trades = await prisma.trade.findMany({
        where: {
            account: {
                userId: user.id
            }
        },
        take: 5,
        orderBy: { timestamp: 'desc' }
    });
    console.log(`\nRecent trades for this user: ${trades.length} (showing first 5)`);
    trades.forEach(t => {
        console.log(`  - ${t.timestamp.toISOString().split('T')[0]} ${t.symbol} ${t.action} ${t.quantity}@${t.price}`);
    });
}

main()
    .catch(e => console.error('Error:', e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
