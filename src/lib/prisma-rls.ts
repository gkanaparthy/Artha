import { PrismaClient } from '@prisma/client';

/**
 * Creates a Prisma client that sets the RLS context before each query.
 * 
 * This enables Row Level Security (RLS) by passing the current user's ID
 * to PostgreSQL via a session variable that RLS policies can check.
 * 
 * Usage:
 *   const db = createRLSClient(session.user.id);
 *   const trades = await db.trade.findMany(); // Only returns user's trades
 */

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Base Prisma client (shared instance for performance)
const basePrisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
    });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

/**
 * Creates a Prisma client with RLS context set for the given user.
 * 
 * @param userId - The authenticated user's ID (from NextAuth session)
 * @returns Extended Prisma client that sets RLS context before queries
 */
export function createRLSClient(userId: string) {
    return basePrisma.$extends({
        query: {
            async $allOperations({ args, query, operation }) {
                // Skip RLS for raw queries (they handle their own context)
                if (operation.startsWith('$')) {
                    return query(args);
                }

                // Set the RLS context for this request
                // Use parameterized query to prevent SQL injection
                await basePrisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;

                return query(args);
            },
        },
    });
}

/**
 * Type for the RLS-enabled Prisma client
 */
export type RLSClient = ReturnType<typeof createRLSClient>;

/**
 * Creates a Prisma client that bypasses RLS (for admin/cron operations).
 * 
 * WARNING: Only use this for trusted server-side operations like cron jobs
 * where you need to access all users' data.
 * 
 * @returns Base Prisma client without RLS context
 */
export function createServiceClient(): PrismaClient {
    return basePrisma;
}

// Export base client for cases where RLS is handled manually
export { basePrisma as prisma };
