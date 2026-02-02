---
name: product-strategy
description: Strategic knowledge regarding Artha's market position, competitive landscape, pricing strategy, and product roadmap.
---

# Product Strategy & Market Intelligence

This skill contains the "business brain" of the Artha project, capturing research on competitors, pricing, and long-term vision.

## 1. Competitive Landscape

Artha competes in the premium trading journal market. The primary competitors are:

| Competitor | Basic Tier | Elite Tier | Mobile App | Main Draw |
| :--- | :--- | :--- | :--- | :--- |
| **TraderSync** | $29.95 | $79.95 | iOS/Android | Deep simulation & AI insights |
| **TradeZella** | $29.00 | $49.00 | Web Only | Replay, Playbooks, Course integration |
| **Chartlog** | $14.99 | $39.99 | Web Only | TradingView integration, chart focus |
| **Trademetria** | Free | $39.95 | Web Only | Simple multi-account management |

**Artha's Competitive Edge:**
- **Premium Aesthetics**: Using glassmorphism, rich gradients, and Framer Motion to create a "Wow" factor that signals high value.
- **Seamless Automation**: Native SnapTrade integration (often gated behind higher tiers in competitors).
- **Mobile First (Design)**: While web-based, the UI is optimized for mobile browser use, beating competitors with poor mobile responsiveness.

## 2. Pricing Strategy

**Confirmed Pricing Model (Jan 2026):**
- **Founder's Pricing**: $12/month or $120/year (First 100 users).
- **Regular Pricing**: $20/month or $200/year (Undercutting competition by ~33%).
- **Lifetime Deals**: Starting at $99 (Founder) -> $149 -> $199+ (Price Ladder).
- **Grandfather Clause**: All users in the database prior to pricing launch get free lifetime access as "Early Adopters".

**Growth Strategy (Undercutting):**
- Position as "The most beautiful, automated journal. No bloat, just clarity."
- Target users who find TraderSync/TradeZella too expensive or overly complex.

## 3. Product Roadmap

To justify "Elite" pricing ($49+), Artha should prioritize:

1. **AI Insights**: Automated analysis like "You lose money on 0DTE options on Fridays" or "Your win rate drops after 11:00 AM EST."
2. **Strategy Playbooks**: Allow users to tag trades (e.g. "Bull Flag", "Iron Condor") and track performance per strategy.
3. **Trade Replay**: Visual minute-by-minute replay of price action for a past trade.
4. **Native Mobile App**: A wrapper (Capacitor/React Native) for iOS/Android to beat 75% of competitors who are web-only.

## 4. Visual Identity (Design Tokens)

- **Dark Mode**: Primary focus.
- **Colors**:
  - Primary: `#2E4A3B` (Emerald/Forest Green)
  - Secondary: `#E59889` (Soft Coral)
  - Backdrop: Glassmorphism with `backdrop-blur`
- **Typography**: Modern, sleek (Inter/Outfit).
- **Animations**: Soft entries via `framer-motion` (PageTransition, AnimatedCard).
