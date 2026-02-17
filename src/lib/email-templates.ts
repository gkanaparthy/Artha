
export const EMAIL_TEMPLATES = {
  BROKER_CONNECTION_NUDGE: {
    subject: "See your first trading leak — AI found $7,513 for one trader",
    title: "You're One Step Away",
    content: `
      Hi {firstName},<br/><br/>
      You signed up for Artha but haven't connected your broker yet. That means your AI coach is sitting idle — and your trading data is going unanalyzed.<br/><br/>
      One of our early users discovered a <strong>$7,513 leak</strong> in their first week. It was a pattern they'd never noticed: holding losers 3x longer than winners.<br/><br/>
      Connecting takes under 2 minutes. We use <strong>SnapTrade</strong> for 256-bit encrypted, <strong>read-only access</strong> — we never see your login credentials and can never place trades on your behalf.<br/><br/>
      Your edge is hiding in your data. Let's find it.
    `,
    buttonText: "Connect My Broker →",
    buttonUrl: "https://www.arthatrades.com/dashboard?connect=true"
  },
  ONBOARDING_CHECK_IN: {
    subject: "Stuck? I'm here to help — Gautham from Artha",
    title: "Quick check-in",
    content: `
      Hi {firstName},<br/><br/>
      I noticed you signed up for Artha a few days ago but haven't connected a broker yet. I wanted to personally check in — is everything okay?<br/><br/>
      If you ran into a technical issue, had questions about security, or just weren't sure which broker to connect — reply to this email and I'll help you get set up in minutes.<br/><br/>
      A few things that might help:<br/>
      • <strong>Read-only access</strong> — we can never place trades or move money<br/>
      • <strong>OAuth login</strong> — we never see or store your broker password<br/>
      • <strong>SnapTrade (SOC2)</strong> — enterprise-grade encryption for your data<br/><br/>
      I built Artha because I was tired of not knowing where my edge was. I'd love to help you find yours.<br/><br/>
      Best,<br/>
      Gautham
    `,
    buttonText: "Go to Dashboard",
    buttonUrl: "https://www.arthatrades.com/dashboard"
  }
};
