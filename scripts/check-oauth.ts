
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOAuthAccounts() {
    console.log('Checking OAuth account linking...\n');

    const user = await prisma.user.findFirst({
        include: {
            accounts: true,
            sessions: true
        }
    });

    if (!user) {
        console.log('❌ No user found');
        return;
    }

    console.log(`User: ${user.name} (${user.email})`);
    console.log(`User ID: ${user.id}\n`);

    console.log(`OAuth Accounts linked to this user: ${user.accounts.length}`);
    user.accounts.forEach(acc => {
        console.log(`  Provider: ${acc.provider}`);
        console.log(`  Provider Account ID: ${acc.providerAccountId}`);
        console.log(`  Account ID: ${acc.id}`);
        console.log(`  User ID: ${acc.userId}`);
        console.log('');
    });

    if (user.accounts.length === 0) {
        console.log('❌ PROBLEM: User has NO OAuth accounts linked!');
        console.log('   When you log in, NextAuth creates a NEW user because it can\'t find the OAuth link.');
        console.log('\n   SOLUTION: We need to re-link your OAuth account to this user.');
    } else {
        console.log('✅ OAuth account exists');

        // Check if provider is correct
        const googleAccount = user.accounts.find(a => a.provider === 'google');
        const appleAccount = user.accounts.find(a => a.provider === 'apple');

        if (googleAccount) {
            console.log('✅ Google OAuth linked');
        }
        if (appleAccount) {
            console.log('✅ Apple OAuth linked');
        }
    }

    console.log(`\nSessions: ${user.sessions.length}`);
    if (user.sessions.length === 0) {
        console.log('❌ No sessions - user needs to log in (or login is failing)');
    }
}

checkOAuthAccounts()
    .catch(e => console.error('Error:', e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
