import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Clear any stale cached client
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma) {
    // Check if the client has the expected models (in case schema changed)
    if (!('account' in globalForPrisma.prisma)) {
        globalForPrisma.prisma = undefined;
    }
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
