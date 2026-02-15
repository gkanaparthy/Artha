import 'dotenv/config';
import { Resend } from 'resend';
import { createBrandedEmail } from '../src/lib/email';
import { prisma } from '../src/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendCheckIn(email: string, name: string) {
    const firstName = name ? name.split(' ')[0] : 'there';

    console.log(`Sending check-in email to ${email}...`);

    const html = createBrandedEmail({
        title: "Is everything going okay?",
        content: `
            Hi ${firstName},<br/><br/>
            I noticed you signed up for Artha recently but haven't had a chance to finish your setup or connect your brokerage yet.<br/><br/>
            I'm reaching out to see if everything is going okay or if you need any help getting started. Whether it's a technical issue or just a question about how Artha works, feel free to reply to this email and I'll get back to you personally.<br/><br/>
            Artha is designed to help you find the "behavioral alpha" in your trading by identifying patterns you might be missing. We'd love to help you get your first set of trades synced so you can see the insights for yourself.
        `,
        buttonText: "Go to Dashboard",
        buttonUrl: "https://www.arthatrades.com/dashboard"
    });

    try {
        await resend.emails.send({
            from: "Gautham from Artha <kgauthamprasad@gmail.com>",
            to: email,
            subject: "Checking in - everything okay?",
            html: html,
            replyTo: "kgauthamprasad@gmail.com"
        });
        console.log(`✅ Sent to ${email}`);
    } catch (error) {
        console.error(`❌ Failed to send to ${email}:`, error);
    }
}

async function main() {
    const users = [
        { email: 'sethgc92992@gmail.com', name: 'Seth' },
        { email: 'jadhavpiyush395@gmail.com', name: 'Piyush' }
    ];

    for (const user of users) {
        await sendCheckIn(user.email, user.name);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
