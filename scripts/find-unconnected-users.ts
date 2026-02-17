import { prisma } from '../src/lib/prisma';

async function main() {
    const users = await prisma.user.findMany({
        where: {
            brokerAccounts: {
                none: {}
            }
        },
        select: {
            email: true,
            name: true,
            createdAt: true,
            onboardingCompleted: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
