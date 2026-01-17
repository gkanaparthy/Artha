
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();
    const sessionCount = await prisma.session.count();
    const verificationTokenCount = await prisma.verificationToken.count();
    const brokerAccountCount = await prisma.brokerAccount.count();
    const tradeCount = await prisma.trade.count();
    const tagCount = await prisma.tag.count();

    console.log('Row counts:');
    console.log(`User: ${userCount}`);
    console.log(`Account: ${accountCount}`);
    console.log(`Session: ${sessionCount}`);
    console.log(`VerificationToken: ${verificationTokenCount}`);
    console.log(`BrokerAccount: ${brokerAccountCount}`);
    console.log(`Trade: ${tradeCount}`);
    console.log(`Tag: ${tagCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
