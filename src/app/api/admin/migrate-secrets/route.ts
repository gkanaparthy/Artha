import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, isEncrypted } from "@/lib/encryption";

/**
 * POST /api/admin/migrate-secrets
 * 
 * Encrypts all existing SnapTrade secrets that are currently stored in plaintext.
 * This endpoint should only be accessible to the app owner/admin.
 * 
 * Security: Checks if the requesting user's email matches the admin email.
 */
export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only allow specific admin email to run this migration
        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail) {
            return NextResponse.json({
                error: "ADMIN_EMAIL environment variable not configured"
            }, { status: 500 });
        }

        if (session.user.email !== adminEmail) {
            return NextResponse.json({
                error: "Forbidden - Admin only",
                debug: {
                    sessionEmail: session.user.email,
                    adminEmail: adminEmail,
                    match: session.user.email === adminEmail
                }
            }, { status: 403 });
        }

        // Check if encryption key is configured
        if (!process.env.DATA_ENCRYPTION_KEY) {
            return NextResponse.json({
                error: "DATA_ENCRYPTION_KEY not configured"
            }, { status: 500 });
        }

        // Find all users with SnapTrade secrets
        const users = await prisma.user.findMany({
            where: {
                snapTradeUserSecret: { not: null }
            },
            select: {
                id: true,
                email: true,
                snapTradeUserSecret: true,
            }
        });

        let encrypted = 0;
        let skipped = 0;
        let failed = 0;
        const errors: string[] = [];

        for (const user of users) {
            try {
                if (!user.snapTradeUserSecret) {
                    skipped++;
                    continue;
                }

                // Check if already encrypted
                if (isEncrypted(user.snapTradeUserSecret)) {
                    skipped++;
                    continue;
                }

                // Encrypt the secret
                const encryptedSecret = encrypt(user.snapTradeUserSecret);

                // Update in database
                await prisma.user.update({
                    where: { id: user.id },
                    data: { snapTradeUserSecret: encryptedSecret }
                });

                encrypted++;

            } catch (error) {
                failed++;
                errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return NextResponse.json({
            success: true,
            results: {
                total: users.length,
                encrypted,
                skipped,
                failed,
            },
            errors: errors.length > 0 ? errors : undefined,
        });

    } catch (error) {
        console.error("[API] Migrate secrets error:", error);
        return NextResponse.json(
            { error: "Migration failed" },
            { status: 500 }
        );
    }
}
