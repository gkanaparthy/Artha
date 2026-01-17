
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateMetricsAPI() {
    console.log('Simulating what /api/metrics does...\n');

    // Check if there's a session now
    const sessions = await prisma.session.findMany({
        include: {
            user: true
        },
        orderBy: {
            expires: 'desc'
        },
        take: 5
    });

    console.log(`Total sessions in DB: ${sessions.length}`);
    if (sessions.length > 0) {
        console.log('Most recent sessions:');
        sessions.forEach(s => {
            console.log(`  - User: ${s.user.name} | Expires: ${s.expires} | ${s.expires > new Date() ? '✅ VALID' : '❌ EXPIRED'}`);
        });
    } else {
        console.log('❌ NO SESSIONS FOUND - This is why the dashboard is empty!');
        console.log('   The user needs to log in to create a session.');
        return;
    }

    // Use the first valid session to simulate the API call
    const validSession = sessions.find(s => s.expires > new Date());
    if (!validSession) {
        console.log('\n❌ All sessions are expired!');
        return;
    }

    console.log(`\n✅ Using session for user: ${validSession.user.name} (ID: ${validSession.userId})`);

    // Simulate the metrics API query
    const trades = await prisma.trade.findMany({
        where: {
            account: {
                userId: validSession.userId
            },
            action: { in: ['BUY', 'SELL', 'BUY_TO_OPEN', 'BUY_TO_CLOSE', 'SELL_TO_OPEN', 'SELL_TO_CLOSE', 'ASSIGNMENT', 'EXERCISES', 'OPTIONEXPIRATION', 'SPLIT'] }
        },
        include: {
            account: {
                select: { brokerName: true, id: true }
            }
        },
        orderBy: [
            { timestamp: 'asc' },
            { createdAt: 'asc' },
            { id: 'asc' }
        ]
    });

    console.log(`\nTrades found for this user: ${trades.length}`);
    if (trades.length > 0) {
        console.log('Sample trades:');
        trades.slice(0, 5).forEach(t => {
            console.log(`  - ${t.timestamp.toISOString().split('T')[0]} ${t.symbol} ${t.action} ${t.quantity}`);
        });
        console.log('\n✅ The API should return data for this user!');
        console.log('   If the dashboard is still empty, check the browser console for JavaScript errors.');
    } else {
        console.log('\n❌ No trades found for the authenticated user.');
        console.log('   This means the trades belong to a different user ID.');
    }
}

simulateMetricsAPI()
    .catch(e => console.error('Error:', e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
