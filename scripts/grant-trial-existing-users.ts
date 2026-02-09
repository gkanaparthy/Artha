import { prisma } from '../src/lib/prisma';
import { createBrandedEmail } from '../src/lib/email';

const TRIAL_DAYS = 30;
const DRY_RUN = process.argv.includes('--dry-run');

async function sendTrialGrantEmail(email: string, firstName?: string) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL || "Artha <hello@arthatrades.com>";
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://arthatrades.com';

    const html = createBrandedEmail({
        title: `You've got 30 days of Pro${firstName ? `, ${firstName}` : ''}!`,
        content: `
            <p>We've been working hard on Artha, and we want you to experience the full product.</p>
            <p><strong>Starting today, you have 30 days of free Artha Pro access.</strong> No credit card needed.</p>
            <p>Here's what's now unlocked for you:</p>
            <ul>
                <li>Automatic trade sync from 25+ brokers</li>
                <li>AI-powered performance coaching</li>
                <li>Advanced analytics and P&L tracking</li>
                <li>Export to CSV/Excel</li>
            </ul>
            <p>Connect your broker and let Artha do the rest. When your trial ends, you can choose a plan or stay on the free tier — your data is always yours.</p>
        `,
        buttonText: 'Start Trading',
        buttonUrl: `${appUrl}/dashboard`
    });

    await resend.emails.send({
        from,
        to: email,
        subject: 'You now have 30 days of Artha Pro — free',
        html,
    });
}

async function main() {
    console.log(`--- Grant Trial to Existing Users ${DRY_RUN ? '(DRY RUN)' : ''} ---`);

    // Find users with NONE status who don't already have a paid/active subscription
    // Skip: GRANDFATHERED, ACTIVE, LIFETIME, TRIALING, PAST_DUE (already have access)
    // Skip: FREE (already went through a trial)
    const users = await prisma.user.findMany({
        where: {
            subscriptionStatus: 'NONE',
        },
        select: {
            id: true,
            email: true,
            name: true,
            subscriptionStatus: true,
            trialStartedAt: true,
        }
    });

    console.log(`Found ${users.length} users with NONE status.`);

    if (users.length === 0) {
        console.log('No users to update.');
        return;
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    let updated = 0;
    let emailed = 0;
    let skipped = 0;

    for (const user of users) {
        // Extra safety: skip if they somehow already had a trial
        if (user.trialStartedAt) {
            console.log(`  Skipping ${user.email} (already had trial started at ${user.trialStartedAt.toISOString()})`);
            skipped++;
            continue;
        }

        if (DRY_RUN) {
            console.log(`  [DRY RUN] Would grant trial to ${user.email}`);
            updated++;
            continue;
        }

        try {
            // Grant 30-day trial
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    subscriptionStatus: 'TRIALING',
                    trialStartedAt: now,
                    trialEndsAt: trialEndsAt,
                },
            });
            updated++;
            console.log(`  ✓ Trial granted to ${user.email} (ends ${trialEndsAt.toISOString()})`);

            // Send email notification
            if (user.email) {
                try {
                    await sendTrialGrantEmail(user.email, user.name?.split(' ')[0]);
                    emailed++;
                    console.log(`  ✉ Email sent to ${user.email}`);
                } catch (emailErr) {
                    console.error(`  ✗ Email failed for ${user.email}:`, emailErr);
                }

                // Rate limit: wait 200ms between emails to avoid hitting Resend limits
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        } catch (error) {
            console.error(`  ✗ Failed to update ${user.email}:`, error);
        }
    }

    console.log(`\n--- Results ---`);
    console.log(`  Total NONE users found: ${users.length}`);
    console.log(`  Skipped (already had trial): ${skipped}`);
    console.log(`  Trials granted: ${updated}`);
    console.log(`  Emails sent: ${emailed}`);
    console.log(`  Trial ends at: ${trialEndsAt.toISOString()}`);
    console.log(`--- Complete ---`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
