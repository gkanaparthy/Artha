export function getTrustOnboardingEmailHtml(userName?: string | null) {
    const nameDisplay = userName ? `Hi ${userName.split(' ')[0]},` : 'Hi there,';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Securely Connect Your Brokerage</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFBF6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFBF6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(46, 74, 59, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 40px 32px; text-align: center;">
                            <div style="display: inline-block; width: 64px; height: 64px; background-color: #E8EFE0; border-radius: 16px; margin-bottom: 24px;">
                                <img src="https://www.arthatrades.com/logo.png" alt="Artha" width="40" height="40" style="margin-top: 12px;" />
                            </div>
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.02em;">
                                Securely connect your brokerage
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Intro -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #475569; text-align: center;">
                                ${nameDisplay} we noticed you haven't connected your broker yet. 
                                Artha uses <strong>SnapTrade</strong> to securely sync your performance data.
                                We never see your passwords or have access to move funds.
                            </p>
                            
                            <!-- Security Features Grid -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 40px;">
                                <tr>
                                    <td width="33%" align="center" style="padding: 0 10px;">
                                        <div style="width: 40px; height: 40px; background-color: #f8fafc; border-radius: 50%; margin-bottom: 12px; line-height: 44px;">
                                            <span style="font-size: 20px;">🔒</span>
                                        </div>
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Security</div>
                                        <div style="font-size: 10px; color: #94a3b8;">AES-256 Encryption</div>
                                    </td>
                                    <td width="33%" align="center" style="padding: 0 10px;">
                                        <div style="width: 40px; height: 40px; background-color: #f8fafc; border-radius: 50%; margin-bottom: 12px; line-height: 44px;">
                                            <span style="font-size: 20px;">🚫</span>
                                        </div>
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Read-Only</div>
                                        <div style="font-size: 10px; color: #94a3b8;">Can't place trades</div>
                                    </td>
                                    <td width="33%" align="center" style="padding: 0 10px;">
                                        <div style="width: 40px; height: 40px; background-color: #f8fafc; border-radius: 50%; margin-bottom: 12px; line-height: 44px;">
                                            <span style="font-size: 20px;">✅</span>
                                        </div>
                                        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">SOC2 II</div>
                                        <div style="font-size: 10px; color: #94a3b8;">Industry standard</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Call to Action -->
                            <div style="text-align: center;">
                                <a href="https://arthatrades.com/dashboard" style="display: inline-block; padding: 18px 36px; background-color: #2E4A3B; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 12px rgba(46, 74, 59, 0.2);">
                                    Connect Your Broker
                                </a>
                                <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8;">
                                    Support for 25+ brokers including Robinhood, Schwab, Fidelity, and IBKR.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Broker Logos Section -->
                    <tr>
                        <td style="padding: 40px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                            <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px;">Trusted by leading brokers</div>
                            <div style="color: #475569; font-weight: 700; font-size: 14px; opacity: 0.6;">
                                Robinhood • Schwab • Fidelity • Zerodha • Webull
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 40px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                                © ${new Date().getFullYear()} Artha Trading Journal<br/>
                                <a href="https://arthatrades.com" style="color: #2E4A3B; text-decoration: none;">arthatrades.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
}
