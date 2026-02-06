import { prisma } from '../src/lib/prisma';
import { sendGrandfatherAnnouncementEmail } from '../src/lib/email';

async function main() {
    console.log('--- Sending Grandfather Announcement Emails ---');

    if (!process.env.RESEND_API_KEY) {
        console.error('ERROR: RESEND_API_KEY is not set in environment variables.');
        process.exit(1);
    }

    // 1. Find all users who are grandfathered
    const users = await prisma.user.findMany({
        where: {
            subscriptionStatus: 'GRANDFATHERED',
            isGrandfathered: true
        },
        select: {
            id: true,
            email: true,
            name: true
        }
    });

    console.log(`Found ${users.length} grandfathered users.`);

    if (users.length === 0) {
        console.log('No users to email. Exiting.');
        return;
    }

    let sentCount = 0;
    let failCount = 0;

    for (const user of users) {
        if (!user.email) continue;

        try {
            console.log(`Sending to ${user.email}...`);
            await sendGrandfatherAnnouncementEmail(user.email, user.name?.split(' ')[0]);
            sentCount++;

            // Add a small delay to avoid hitting Resend rate limits if running at scale
            // (though for ~23 users it's fine)
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            console.error(`Failed to send to ${user.email}:`, error);
            failCount++;
        }
    }

    console.log(`\nResults:`);
    console.log(`✓ Sent: ${sentCount}`);
    console.log(`✗ Failed: ${failCount}`);
    console.log('--- Process Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
