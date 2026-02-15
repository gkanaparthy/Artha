
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
    },
    ONBOARDING_CHECK_IN: {
        subject: "Checking in - everything okay?",
        title: "Is everything going okay?",
        content: `
      Hi {firstName},<br/><br/>
      I noticed you signed up for Artha recently but haven't had a chance to finish your setup or connect your brokerage yet.<br/><br/>
      I'm reaching out to see if everything is going okay or if you need any help getting started. Whether it's a technical issue or just a question about how Artha works, feel free to reply to this email or reach me directly at kgauthamprasad@gmail.com.<br/><br/>
      Artha is designed to help you find the "behavioral alpha" in your trading by identifying patterns you might be missing. We'd love to help you get your first set of trades synced so you can see the insights for yourself.<br/><br/>
      Best,<br/>
      Gautham
    `,
        buttonText: "Go to Dashboard",
        buttonUrl: "https://www.arthatrades.com/dashboard"
    }
};
