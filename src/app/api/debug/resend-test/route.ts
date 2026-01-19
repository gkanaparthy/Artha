import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        // Admin-only debug endpoint
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminEmail = process.env.ADMIN_EMAIL;
        if (!adminEmail || session.user.email !== adminEmail) {
            return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        }

        // Check if env vars are available
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL;

        if (!apiKey) {
            return NextResponse.json({
                success: false,
                error: 'RESEND_API_KEY environment variable is missing',
                env: {
                    hasApiKey: false,
                    hasFromEmail: !!fromEmail,
                }
            }, { status: 500 });
        }

        // Initialize Resend
        const resend = new Resend(apiKey);

        // Try to send a test email
        const result = await resend.emails.send({
            from: fromEmail || 'Artha <noreply@send.arthatrades.com>',
            to: 'test@example.com', // This will fail but will show if Resend API works
            subject: 'Test Email from Artha',
            html: '<p>This is a test email</p>',
        });

        return NextResponse.json({
            success: true,
            message: 'Resend API called successfully',
            result: result,
            env: {
                hasApiKey: true,
                hasFromEmail: !!fromEmail,
                fromEmail: fromEmail,
                apiKeyPrefix: apiKey.substring(0, 8) + '...',
            }
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorDetails: error,
            env: {
                hasApiKey: !!process.env.RESEND_API_KEY,
                hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
            }
        }, { status: 500 });
    }
}
