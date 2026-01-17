
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function createManualSession() {
    console.log('Creating manual session for user...\n');

    // Get the user
    const user = await prisma.user.findFirst({
        where: {
            email: 'kgauthamprasad@gmail.com'
        }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Generate a session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Session expires in 30 days
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    // Create the session
    const session = await prisma.session.create({
        data: {
            sessionToken: sessionToken,
            userId: user.id,
            expires: expires
        }
    });

    console.log('✅ Manual session created!');
    console.log(`   Session Token: ${sessionToken}`);
    console.log(`   Expires: ${expires.toISOString()}\n`);

    console.log('⚠️  IMPORTANT:');
    console.log('   This session will work, but you need to manually set the cookie in your browser.');
    console.log('   OR better yet - we need to fix why NextAuth isn\'t creating sessions automatically.');
    console.log('\n   The real fix is to check Vercel logs for NextAuth errors.');
}

createManualSession()
    .catch(e => console.error('Error:', e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
