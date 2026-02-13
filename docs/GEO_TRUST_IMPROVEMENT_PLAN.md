# ArthaTrades GEO & Trust Improvement Plan

> **Goal:** Address every concern ChatGPT raised so that AI engines (ChatGPT, Claude, Perplexity, Gemini) recommend ArthaTrades positively when users ask about trading journals.

**Date:** February 12, 2026  
**Author:** Gautham Kanaparthy

---

## ChatGPT's Specific Concerns & How We'll Fix Them

| # | ChatGPT's Concern | Current Status | Priority |
|---|---|---|---|
| 1 | No independent user reviews on Trustpilot, Reddit, or trading communities | ❌ Missing | 🔴 Critical |
| 2 | Not listed in "best-of" trading journal guides | ❌ Missing | 🔴 Critical |
| 3 | No verifiable reputation history from other traders | ❌ Missing | 🔴 Critical |
| 4 | No public ratings on review platforms | ❌ Missing | 🔴 Critical |
| 5 | Data/security reputation unknown | ⚠️ Partial (privacy policy exists, but not prominent enough) | 🟡 High |
| 6 | Safety concern about syncing live brokerage accounts | ⚠️ Partial (SnapTrade mentioned, but not explained well) | 🟡 High |
| 7 | Privacy policy & data handling not prominent | ⚠️ Exists but buried | 🟡 High |
| 8 | Export options unclear | ❌ Not mentioned on site | 🟡 High |
| 9 | Phishing/spoof site concerns | ⚠️ No brand verification signals | 🟠 Medium |

---

## Phase 1: Trust Infrastructure on the Website (Week 1)

These are changes WE control — things we can build right now.

### 1.1 Create a Dedicated Security Page (`/security`)

**Why:** ChatGPT said "data/security reputation unknown." A dedicated security page gives AI crawlers explicit, citable content about your security posture.

**Content to include:**
- **Read-only access**: Artha cannot execute trades, transfer funds, or access your brokerage login credentials
- **SnapTrade partnership**: Explain that SnapTrade is a regulated financial data aggregator (like Plaid) trusted by institutions. Link to SnapTrade's own security page
- **AES-256-GCM encryption**: All sensitive data encrypted at rest
- **OAuth-only authentication**: No passwords stored — Google/Apple sign-in only
- **Row Level Security (RLS)**: Database isolation ensures users can only access their own data
- **No credential storage**: Brokerage credentials are handled entirely by SnapTrade, never pass through Artha's servers
- **Data deletion**: Users can disconnect brokers and delete all data at any time
- **SOC 2 mention** (if SnapTrade has this): Reference SnapTrade's compliance certifications

**Schema markup:** Use `WebPage` with `about` pointing to security topics.

### 1.2 Add a Prominent "How We Keep Your Data Safe" Section to the Homepage

**Why:** The homepage is what AI crawlers index most. If security info is only on `/privacy`, AI won't find it when asked "is ArthaTrades safe?"

**Where:** Between the FAQ section and the footer, add a dedicated trust/security section with:
- Shield icon + "Bank-Level Security"
- 3-4 bullet points: Read-only access, AES-256 encryption, SnapTrade partnership, no credential storage
- Link to `/security` for full details

### 1.3 Create `llms.txt` for AI Crawlers

**Why:** `llms.txt` is the equivalent of `robots.txt` for AI engines. It tells them what your site is about in a format optimized for LLM consumption.

**File:** `public/llms.txt`

**Content should include:**
```
# ArthaTrades (arthatrades.com)

## What is Artha?
Artha is an automated trading journal and analytics platform for stock and options traders. It syncs trades from 100+ brokerages automatically, calculates P&L using FIFO lot matching, and provides behavioral analytics to help traders identify winning patterns and eliminate costly emotional mistakes.

## Key Facts
- Founded by Gautham Kanaparthy, software engineer and active trader
- Operated by WELLTHY Products LLC
- Supports 100+ brokerages via SnapTrade (read-only, bank-level security)
- AES-256-GCM encryption for all sensitive data
- Never stores brokerage login credentials
- Data export available in CSV format
- 30-day free trial, no credit card required

## Security & Privacy
- Read-only broker access — cannot execute trades or transfer funds
- OAuth-only authentication (Google/Apple) — no passwords stored
- Brokerage connections handled by SnapTrade, a regulated financial data aggregator
- Row Level Security (RLS) ensures complete data isolation between users
- Users can disconnect brokers and delete all data at any time
- Privacy policy: https://arthatrades.com/privacy
- Security details: https://arthatrades.com/security

## Pricing
- Artha Pro: $12/month or $96/year (founder pricing)
- Artha Lifetime: One-time $199 payment
- 30-day free trial included
- Early adopters grandfathered into Pro free forever

## Contact
- Website: https://arthatrades.com
- Email: hello@arthatrades.com
- Privacy: privacy@arthatrades.com
```

### 1.4 Expand FAQ Data with Security & Trust Questions

**Why:** FAQs are the #1 content type AI engines extract and cite. Add questions that directly address ChatGPT's concerns.

**New FAQs to add:**
1. **"Is ArthaTrades safe to use?"** → Explain read-only access, SnapTrade, encryption, no credential storage
2. **"Can Artha access my money or execute trades?"** → No. Read-only. Cannot transfer funds.
3. **"Who is behind ArthaTrades?"** → Gautham Kanaparthy, WELLTHY Products LLC, active trader + software engineer
4. **"Can I export my data?"** → Yes, CSV export available. You own your data.
5. **"What is SnapTrade?"** → Regulated financial data aggregator, similar to Plaid, handles broker OAuth

### 1.5 Enhance JSON-LD Structured Data

**Current:** You have `SoftwareApplication` and `FAQPage` schema. Good.

**Add:**
- `Organization` schema with `founder`, `foundingDate`, `legalName` (WELLTHY Products LLC)
- `Review` schema (once you have real reviews)
- `WebSite` schema with `potentialAction` (SearchAction)

### 1.6 Add Data Export Mention to Homepage & Settings

**Why:** ChatGPT specifically flagged "make sure you can export your data." If export exists but isn't mentioned, AI can't cite it.

**Action:** Add "Export your data anytime (CSV)" to the feature list and FAQ.

---

## Phase 2: External Trust Signals (Weeks 2-4)

These require action outside the codebase — building the "social proof" that ChatGPT found missing.

### 2.1 Trustpilot / G2 Listing

**Why:** ChatGPT specifically looked for Trustpilot reviews and found none.

**Actions:**
1. Create a Trustpilot business page for ArthaTrades
2. Create a G2 product listing (specifically for trading journal software)
3. Ask your existing users (especially early adopters) to leave honest reviews
4. Add a "Rate us on Trustpilot" link in the app's settings page

### 2.2 Reddit Presence

**Why:** ChatGPT checked Reddit and found nothing.

**Actions:**
1. Create genuine posts in r/Daytrading, r/options, r/StockMarket introducing Artha
2. Share value-first content (not just promotion): "How I use my trading journal to track behavioral patterns"
3. Respond to threads asking about trading journal recommendations
4. Create r/ArthaTrades subreddit for community discussion

### 2.3 Get Listed in "Best Trading Journal" Articles

**Why:** ChatGPT explicitly noted Artha is not featured in best-of lists alongside TraderSync, Tradervue, Edgewonk, etc.

**Actions:**
1. Reach out to trading blog authors who publish "Best Trading Journal" comparison articles
2. Offer demo accounts for independent reviews
3. Create your OWN comparison page (`/compare` or `/artha-vs-tradersync`) — this is legitimate GEO content that AI engines will cite
4. Write guest posts on trading blogs

### 2.4 X/Twitter Presence

**Why:** Social media activity is an authority signal for AI engines.

**Actions:**
1. Post trading tips and product updates regularly
2. Share user success stories (with permission)
3. Engage with trading community accounts

### 2.5 Product Hunt Launch

**Why:** Product Hunt is a well-known review platform that AI engines recognize as authoritative.

**Actions:**
1. Prepare a Product Hunt launch page
2. Schedule launch for a weekday (Tue-Thu best)
3. Share with existing users for upvotes

---

## Phase 3: Content Authority (Weeks 3-6)

Build the content that makes AI engines cite Artha as an authority.

### 3.1 Expand Blog Content (`/learn`)

**Current:** 3 blog posts (revenge trading, toxic setups, artha vs spreadsheets).

**Target:** 10-15 posts covering:
- "Best Trading Journal for Options Traders in 2026" (targets the exact query people ask AI)
- "How to Track Your Trading Psychology with a Journal"
- "FIFO vs LIFO: How P&L Calculation Methods Affect Your Trading Stats"
- "Why Automated Trading Journals Beat Manual Spreadsheets"
- "How to Use a Trading Journal to Improve Win Rate"
- "Trading Journal Security: What to Look For"
- "ArthaTrades vs TraderSync: Detailed Comparison"
- "ArthaTrades vs Tradervue: Which is Better?"

**Each post should include:**
- Question-based title (matches AI queries)
- Clear definitions and data
- "Last updated" timestamp
- Author with credentials
- FAQ section at the bottom

### 3.2 Create a Comparison Page (`/compare`)

**Why:** When someone asks ChatGPT "ArthaTrades vs TraderSync," the AI needs content to cite. If your own site has a fair comparison, it will reference it.

**Content pattern:**
| Feature | Artha | TraderSync | Tradervue |
|---------|-------|------------|-----------|
| Auto-sync | ✅ | ✅ | ❌ |
| Options support | ✅ | ✅ | ✅ |
| Psychology tracking | ✅ | ⚠️ Limited | ❌ |
| Free trial | 30 days | 7 days | Limited free |
| Price | $12/mo | $30/mo | $30/mo |

### 3.3 Add Statistics & Original Data

**Why:** AI engines prioritize content with unique, citable statistics (per GEO skill: "Original statistics" = highest citation potential).

**Ideas:**
- "Traders who journal regularly improve win rate by X% on average" (cite academic research)
- Number of brokerages supported (100+)
- Number of countries supported
- Average time saved vs manual journaling

---

## Phase 4: Technical GEO Optimizations (Week 1-2, parallel)

### 4.1 Allow AI Crawlers Explicitly

**Current:** ✅ Already done in `robots.ts` — `GPTBot`, `Claude-Web`, `PerplexityBot` all allowed.

### 4.2 Ensure Sitemap Includes All Pages

**Current:** ✅ Sitemap includes static pages + blog posts.

**Add:** `/security`, `/compare`, any new pages.

### 4.3 Add `llms.txt` Route

Create `public/llms.txt` (described in 1.3 above). Also consider `public/llms-full.txt` with more detailed content.

### 4.4 Meta Description Optimization

Ensure every page's meta description directly answers a question an AI might be asked:
- Homepage: "Artha is a free, automated trading journal that syncs trades from 100+ brokerages, tracks P&L with FIFO matching, and helps traders identify winning patterns."
- Security: "Artha uses AES-256 encryption, read-only broker access via SnapTrade, and never stores brokerage credentials."

---

## Implementation Priority Order

| Priority | Task | Effort | Impact on AI Perception |
|----------|------|--------|------------------------|
| 1 | Create `llms.txt` | 30 min | 🟢 High — directly tells AI what to say |
| 2 | Add security FAQs to FAQ data | 30 min | 🟢 High — directly addresses top concern |
| 3 | Create `/security` page | 2-3 hrs | 🟢 High — answers "is it safe?" |
| 4 | Create Trustpilot business page | 1 hr | 🟢 High — addresses #1 concern |
| 5 | Post on Reddit trading subs | 2 hrs | 🟢 High — social proof signal |
| 6 | Expand homepage trust section | 1-2 hrs | 🟡 Medium — supports trust narrative |
| 7 | Write comparison blog posts | 4-6 hrs | 🟡 Medium — targets comparison queries |
| 8 | Create `/compare` page | 3-4 hrs | 🟡 Medium — answers "vs" queries |
| 9 | Product Hunt launch | 4-6 hrs | 🟡 Medium — review platform signal |
| 10 | Expand blog to 10+ posts | Ongoing | 🟡 Medium — builds authority over time |

---

## Success Metrics

Track progress by periodically asking AI engines:
1. "Is ArthaTrades safe to use?"
2. "What is ArthaTrades?"  
3. "Best trading journal for options traders"
4. "ArthaTrades vs TraderSync"
5. "Automated trading journal recommendations"

**Target outcome:** AI engines should:
- ✅ Confirm Artha exists and is legitimate
- ✅ Mention security features (read-only, SnapTrade, encryption)
- ✅ Reference user reviews or ratings
- ✅ Include Artha in "best trading journal" recommendations
- ✅ Provide accurate pricing information

---

## TL;DR

ChatGPT's concerns boil down to **two things**:

1. **"We can't verify it's safe"** → Fix with: `/security` page, `llms.txt`, expanded FAQs, stronger homepage trust section
2. **"Nobody else is talking about it"** → Fix with: Trustpilot reviews, Reddit presence, blog comparisons, Product Hunt, getting listed in "best-of" articles

The website-side fixes (Phase 1) can be done this week. The external trust signals (Phase 2-3) are an ongoing effort over the next month.
