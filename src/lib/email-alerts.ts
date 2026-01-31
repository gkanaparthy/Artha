import { Resend } from 'resend';

// Re-use the rate limiter logic or just instantiate Resend directly
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConnectionAlert(
    email: string,
    name: string,
    brokerName: string,
    issueType: 'Connection Broken' | 'Connection Removed'
) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('Skipping alert email - RESEND_API_KEY missing');
        return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arthatrades.com';

    try {
        await resend.emails.send({
            from: "Artha Alerts <alerts@arthatrades.com>",
            to: email,
            subject: `Action Required: ${brokerName} connection needs attention`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; color: #333; line-height: 1.5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fee2e2; padding: 16px; border-radius: 8px; margin-bottom: 24px; color: #991b1b; }
        .button { background: #2E4A3B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <strong>⚠️ Connection Alert</strong>
        </div>
        
        <h2>Hello ${name},</h2>
        
        <p>We detected an issue with your <strong>${brokerName}</strong> connection.</p>
        
        <p><strong>Status:</strong> ${issueType}</p>
        
        <p>This typically happens when:</p>
        <ul>
            <li>Password changed at your broker</li>
            <li>Security settings updated</li>
            <li>Connection expired (standard 90-day renewal)</li>
        </ul>

        <p>Please reconnect your account to ensure your trading journal stays up to date.</p>

        <a href="${appUrl}/settings" class="button">Reconnect ${brokerName}</a>
        
        <p style="margin-top: 32px; font-size: 14px; color: #666;">
            If you have questions, reply to this email.
        </p>
    </div>
</body>
</html>
            `
        });
        console.log(`[Alerts] Sent connection alert to ${email}`);
    } catch (err) {
        console.error(`[Alerts] Failed to send email: ${err}`);
        throw err;
    }
}
