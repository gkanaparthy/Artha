import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple in-memory rate limiting (in production, use Redis or similar)
const emailRateLimits = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_EMAILS_PER_WINDOW = 3; // Max 3 emails per hour per address

function checkRateLimit(email: string): { allowed: boolean; remainingAttempts: number } {
    const now = Date.now();
    const normalizedEmail = email.toLowerCase().trim();
    const existing = emailRateLimits.get(normalizedEmail);

    if (!existing) {
        emailRateLimits.set(normalizedEmail, { count: 1, firstAttempt: now });
        return { allowed: true, remainingAttempts: MAX_EMAILS_PER_WINDOW - 1 };
    }

    // Reset if window has passed
    if (now - existing.firstAttempt > RATE_LIMIT_WINDOW_MS) {
        emailRateLimits.set(normalizedEmail, { count: 1, firstAttempt: now });
        return { allowed: true, remainingAttempts: MAX_EMAILS_PER_WINDOW - 1 };
    }

    // Check if within limit
    if (existing.count >= MAX_EMAILS_PER_WINDOW) {
        return { allowed: false, remainingAttempts: 0 };
    }

    existing.count++;
    return { allowed: true, remainingAttempts: MAX_EMAILS_PER_WINDOW - existing.count };
}

// Clean up old entries periodically (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [email, data] of emailRateLimits.entries()) {
        if (now - data.firstAttempt > RATE_LIMIT_WINDOW_MS) {
            emailRateLimits.delete(email);
        }
    }
}, 10 * 60 * 1000);

interface SendVerificationRequestParams {
    identifier: string;
    url: string;
    provider: {
        from?: string;
    };
    request?: Request;
}

export async function sendVerificationRequest({
    identifier: email,
    url,
    provider,
    request,
}: SendVerificationRequestParams) {
    const from = provider.from || process.env.RESEND_FROM_EMAIL || "Artha <login@arthatrades.com>";
    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting check
    const rateCheck = checkRateLimit(normalizedEmail);
    if (!rateCheck.allowed) {
        console.warn(`[Security] Rate limit exceeded for email: ${normalizedEmail.substring(0, 3)}***`);
        // Don't reveal rate limiting to prevent enumeration - just silently succeed
        // The user won't get an email but won't know why
        return;
    }

    // Log for security audit (mask email for privacy)
    const maskedEmail = normalizedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    const ipAddress = request?.headers?.get('x-forwarded-for') || 'unknown';
    console.log(`[Auth] Magic link requested for ${maskedEmail} from IP: ${ipAddress}`);

    try {
        await resend.emails.send({
            from,
            to: normalizedEmail,
            subject: 'Sign in to Artha Trading Journal',
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to Artha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFBF6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFBF6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(46, 74, 59, 0.08);">
                    <!-- Header with Logo -->
                    <tr>
                        <td style="background-color: #2E4A3B; padding: 32px 40px; text-align: center;">
                            <img src="https://www.arthatrades.com/logo.png" alt="Artha" width="48" height="48" style="display: inline-block; vertical-align: middle;" />
                            <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 28px; font-weight: 700; color: #ffffff; font-family: Georgia, serif;">Artha</span>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 48px 40px;">
                            <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #2E4A3B; font-family: Georgia, serif;">
                                Sign in to your account
                            </h1>
                            <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #2E4A3B; opacity: 0.7;">
                                Click the button below to securely sign in to your Artha Trading Journal. This link will expire in 1 hour and can only be used once.
                            </p>
                            
                            <!-- Sign In Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${url}" style="display: inline-block; padding: 16px 48px; background-color: #2E4A3B; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 74, 59, 0.25);">
                                            Sign in to Artha
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Security Notice -->
                            <div style="margin-top: 32px; padding: 16px; background-color: #F5F7F2; border-radius: 8px; border-left: 4px solid #2E4A3B;">
                                <p style="margin: 0; font-size: 13px; color: #2E4A3B; opacity: 0.8;">
                                    <strong>Security tip:</strong> Never share this link with anyone. Our team will never ask for your sign-in link.
                                </p>
                            </div>
                            
                            <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #2E4A3B; opacity: 0.5;">
                                If you didn't request this email, you can safely ignore it. Someone may have entered your email by mistake.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #F5F7F2; border-top: 1px solid #E8EFE0;">
                            <p style="margin: 0; font-size: 12px; color: #2E4A3B; opacity: 0.5; text-align: center;">
                                © ${new Date().getFullYear()} Artha Trading Journal · <a href="https://www.arthatrades.com" style="color: #2E4A3B;">arthatrades.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Link fallback -->
                <table width="100%" style="max-width: 480px; margin-top: 24px;">
                    <tr>
                        <td style="text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #2E4A3B; opacity: 0.4;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="margin: 8px 0 0; font-size: 12px; color: #2E4A3B; opacity: 0.4; word-break: break-all;">
                                ${url}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
        });

        console.log(`[Auth] Magic link sent successfully to ${maskedEmail}`);
    } catch (error) {
        // Log error but don't expose details to prevent information leakage
        console.error('[Auth] Failed to send magic link:', error instanceof Error ? error.message : 'Unknown error');
        // Re-throw to let NextAuth handle it, but the error message is generic
        throw new Error('Failed to send verification email. Please try again later.');
    }
}
