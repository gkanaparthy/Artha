import { Resend } from 'resend';

// Initialize Resend lazily to prevent crash if key is missing
let resendInstance: Resend | null = null;
function getResend() {
    if (!resendInstance) {
        resendInstance = new Resend(process.env.RESEND_API_KEY || 'missing_key');
    }
    return resendInstance;
}

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

interface BrandedEmailParams {
    title: string;
    previewText?: string;
    content: string;
    buttonText?: string;
    buttonUrl?: string;
}

/**
 * Creates a branded HTML email template for Artha
 */
export function createBrandedEmail({
    title,
    content,
    buttonText,
    buttonUrl
}: BrandedEmailParams) {
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
                                ${title}
                            </h1>
                            <div style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #2E4A3B; opacity: 0.7;">
                                ${content}
                            </div>
                            
                            <!-- Action Button -->
                            ${buttonText && buttonUrl ? `
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <a href="${buttonUrl}" style="display: inline-block; padding: 16px 48px; background-color: #2E4A3B; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 74, 59, 0.25);">
                                            ${buttonText}
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background-color: #F5F7F2; border-top: 1px solid #E8EFE0;">
                            <p style="margin: 0; font-size: 12px; color: #2E4A3B; opacity: 0.5; text-align: center;">
                                © ${year} Artha Trading Journal · <a href="https://www.arthatrades.com" style="color: #2E4A3B;">arthatrades.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
                
                ${buttonUrl ? `
                <!-- Link fallback -->
                <table width="100%" style="max-width: 480px; margin-top: 24px;">
                    <tr>
                        <td style="text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #2E4A3B; opacity: 0.4;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="margin: 8px 0 0; font-size: 12px; color: #2E4A3B; opacity: 0.4; word-break: break-all;">
                                ${buttonUrl}
                            </p>
                        </td>
                    </tr>
                </table>
                ` : ''}
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}

interface SendVerificationRequestParams {
    identifier: string;
    url: string;
    provider: {
        from?: string;
    };
    request?: Request;
}

/**
 * NextAuth magic link email
 */
export async function sendVerificationRequest({
    identifier: email,
    url,
    provider,
}: SendVerificationRequestParams) {
    const from = provider.from || process.env.RESEND_FROM_EMAIL || "Artha <login@arthatrades.com>";
    const normalizedEmail = email.toLowerCase().trim();

    if (!process.env.RESEND_API_KEY) {
        console.error('[Email] RESEND_API_KEY is missing');
        throw new Error('Email service configuration error');
    }

    const rateCheck = checkRateLimit(normalizedEmail);
    if (!rateCheck.allowed) return;

    try {
        const html = createBrandedEmail({
            title: 'Sign in to your account',
            content: 'Click the button below to securely sign in to your Artha Trading Journal. This link will expire in 1 hour and can only be used once.',
            buttonText: 'Sign in to Artha',
            buttonUrl: url
        });

        await getResend().emails.send({
            from,
            to: normalizedEmail,
            subject: 'Sign in to Artha',
            html,
        });

        const masked = normalizedEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');
        console.log(`[Email] Magic link sent successfully to ${masked}`);
    } catch (error) {
        console.error('[Email] Failed to send magic link:', error);
        throw new Error('Failed to send verification email');
    }
}

/**
 * Send welcome email for new trial
 */
export async function sendTrialWelcomeEmail(email: string, firstName?: string) {
    const from = process.env.RESEND_FROM_EMAIL || "Artha <hello@arthatrades.com>";

    try {
        const html = createBrandedEmail({
            title: `Welcome to Artha${firstName ? `, ${firstName}` : ''}!`,
            content: `
                <p>Your 30-day free trial of Artha Pro has officially started.</p>
                <p>You now have full access to:</p>
                <ul>
                    <li>Automated trade synchronization</li>
                    <li>AI Behavioral Insights</li>
                    <li>Performance analytics and tag tracking</li>
                </ul>
                <p>Your first payment will be processed in 30 days. You can cancel anytime before then from your settings.</p>
            `,
            buttonText: 'Go to Dashboard',
            buttonUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://arthatrades.com'}/dashboard`
        });

        await getResend().emails.send({
            from,
            to: email,
            subject: 'Welcome to Artha Pro - Your trial has started!',
            html,
        });
    } catch (error) {
        console.error('[Email] Trial welcome error:', error);
    }
}

/**
 * Send welcome email for Lifetime purchase
 */
export async function sendLifetimeWelcomeEmail(email: string, firstName?: string) {
    const from = process.env.RESEND_FROM_EMAIL || "Artha <hello@arthatrades.com>";

    try {
        const html = createBrandedEmail({
            title: 'You\'re in for life!',
            content: `
                <p>Thank you for becoming a Lifetime Founder of Artha.</p>
                <p>You now have unlimited access to every Artha Pro feature—current and future—forever. No more subscriptions, just pure trading insights.</p>
                <p>Your support as an early founder means the world to us.</p>
            `,
            buttonText: 'Start Trading',
            buttonUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://arthatrades.com'}/dashboard`
        });

        await getResend().emails.send({
            from,
            to: email,
            subject: 'Lifetime Access Confirmed - Welcome to Artha',
            html,
        });
    } catch (error) {
        console.error('[Email] Lifetime welcome error:', error);
    }
}

/**
 * Send payment failed notification
 */
export async function sendPaymentFailedEmail(email: string, amount: number) {
    const from = process.env.RESEND_FROM_EMAIL || "Artha <billing@arthatrades.com>";

    try {
        const html = createBrandedEmail({
            title: 'Payment Failed',
            content: `
                <p>We were unable to process your recent payment of $${amount.toFixed(2)} for your Artha Pro subscription.</p>
                <p>Don't worry, your access hasn't been interrupted yet. Stripe will retry the payment automatically, but you may want to update your payment method to avoid any service interruption.</p>
            `,
            buttonText: 'Update Billing',
            buttonUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://arthatrades.com'}/settings`
        });

        await getResend().emails.send({
            from,
            to: email,
            subject: 'Action Required: Payment failed for Artha Pro',
            html,
        });
    } catch (error) {
        console.error('[Email] Payment failed email error:', error);
    }
}

/**
 * Send grandfather announcement email
 */
export async function sendGrandfatherAnnouncementEmail(email: string, firstName?: string) {
    const from = process.env.RESEND_FROM_EMAIL || "Artha <hello@arthatrades.com>";

    try {
        const html = createBrandedEmail({
            title: 'A Gift for Your Early Support 🎁',
            content: `
                <p>Hi ${firstName || 'there'},</p>
                <p>We recently launched Artha Pro, our premium suite of behavioral trading tools. While we're moving to a paid model for new users, we haven't forgotten who helped us get here.</p>
                <p>As a thank you for being one of our earliest users, <strong>you have been grandfathered into Artha Pro for free, forever.</strong></p>
                <p>You don't need to do anything. Your account has already been upgraded. You'll never see a subscription fee from us.</p>
                <p>Thank you for being part of the Artha journey.</p>
            `,
            buttonText: 'Explore Pro Features',
            buttonUrl: `${process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://arthatrades.com'}/dashboard`
        });

        await getResend().emails.send({
            from,
            to: email,
            subject: 'You\'ve been Grandfathered into Artha Pro!',
            html,
        });
    } catch (error) {
        console.error('[Email] Grandfather announcement error:', error);
    }
}
