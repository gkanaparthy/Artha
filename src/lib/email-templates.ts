
export const EMAIL_TEMPLATES = {
    BROKER_CONNECTION_NUDGE: {
        subject: "Ready to see your trading insights, {name}?",
        title: "Complete Your Setup",
        content: `
      Hi {firstName},<br/><br/>
      We noticed you've finished your onboarding but haven't connected a broker yet. To start seeing your P&L, trade analytics, and AI-driven insights, simply connect your brokerage account.<br/><br/>
      Artha helps you identify patterns in your trading that you might be missing. Whether it's emotional exits or setup consistency, we've got you covered.<br/><br/>
      It only takes a minute, and we use SnapTrade for 256-bit encrypted, read-only access—we never see your login credentials.
    `,
        buttonText: "Connect My Broker",
        buttonUrl: "https://www.arthatrades.com/dashboard?connect=true"
    }
};
