import { prisma } from '../src/lib/prisma';

async function main() {
    const users = await prisma.user.findMany({
        include: {
            accounts: true,
            _count: {
                select: { brokerAccounts: true, sessions: true }
            }
        }
    });

    console.log('--- Auth Pattern Analysis ---');
    console.log(`Total Users: ${users.length}`);

    const stats = {
        google: 0,
        resend: 0,
        no_account: 0,
        broker_connected: 0,
        multi_provider: 0
    };

    users.forEach(u => {
        if (u.snapTradeUserId) stats.broker_connected++;
        if (u.accounts.length === 0) stats.no_account++;
        if (u.accounts.length > 1) stats.multi_provider++;

        u.accounts.forEach(a => {
            if (a.provider === 'google') stats.google++;
            if (a.provider === 'resend') stats.resend++;
        });
    });

    console.log('\nGeneral Stats:');
    console.table(stats);

    console.log('\nUsers Detail (Anonymized Email):');
    const userTable = users.map(u => ({
        id: u.id,
        email: u.email?.split('@')[0].slice(0, 3) + '...@' + u.email?.split('@')[1],
        providers: u.accounts.map(a => a.provider).join(', '),
        broker: u.snapTradeUserId ? 'YES' : 'NO',
        brokerAccounts: u._count.brokerAccounts,
        sessions: u._count.sessions
    }));
    console.table(userTable);
}

main().catch(console.error);
