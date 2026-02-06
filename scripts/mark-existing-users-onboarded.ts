/**
 * One-time migration script: Mark all existing users as having completed onboarding.
 * Run this BEFORE deploying the middleware redirect to avoid forcing existing users
 * through the onboarding wizard.
 *
 * Usage: pnpm tsx scripts/mark-existing-users-onboarded.ts
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.user.updateMany({
        where: { onboardingCompleted: false },
        data: { onboardingCompleted: true },
    });

    console.log(`Marked ${result.count} existing users as onboarding completed.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
