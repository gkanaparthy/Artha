---
name: nextjs-saas-launch-checklist
description: Comprehensive checklist for launching a Next.js SaaS application with proper SEO, GEO (AI search optimization), and social media preview configuration.
---

# Next.js SaaS Launch Checklist

This skill documents essential configurations learned from building Artha that should be applied to every new SaaS project.

---

## Table of Contents

1. [SEO](#1-seo)
2. [GEO (AI Engine Optimization)](#2-geo-ai-engine-optimization)
3. [OG/Twitter Previews](#3-ogtwitter-previews)
4. [Stripe Billing](#4-stripe-billing)
5. [Authentication](#5-authentication)
6. [Dark Mode](#6-dark-mode)
7. [Security](#7-security)
8. [Performance](#8-performance)
9. [Infrastructure](#9-infrastructure)
10. [Promotional Videos](#10-promotional-videos)
11. [Pre-Launch Checklist](#11-pre-launch-checklist)

---

## 1. SEO

### 1.1 robots.txt

Create `public/robots.txt`:

```txt
User-agent: *
Allow: /

# Block admin and API routes
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/

# Sitemap
Sitemap: https://your-domain.com/sitemap.xml
```

### 1.2 sitemap.xml

Use Next.js App Router's built-in sitemap generation:

```tsx
// app/sitemap.ts
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://your-domain.com';
  
  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ];
  
  // Dynamic pages (e.g., blog posts)
  const posts = await getBlogPosts();
  const blogPages = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));
  
  return [...staticPages, ...blogPages];
}
```

### 1.3 JSON-LD Structured Data

Create `components/seo/json-ld.tsx`:

```tsx
export function generateJsonLd() {
  return [
    // Organization
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Your Product",
      url: "https://your-domain.com",
      logo: "https://your-domain.com/logo.png",
      sameAs: ["https://x.com/handle"],
    },
    
    // SoftwareApplication
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Your Product",
      operatingSystem: "Web",
      applicationCategory: "FinanceApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    
    // FAQPage (helps with featured snippets)
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does it work?",
          acceptedAnswer: { "@type": "Answer", text: "..." },
        },
      ],
    },
  ];
}
```

### 1.4 Root Layout Metadata

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://your-domain.com"),
  title: { default: "Product - Tagline", template: "%s | Product" },
  description: "Under 160 characters",
  keywords: ["keyword1", "keyword2"],
  authors: [{ name: "Your Name" }],
  robots: { index: true, follow: true },
};
```

### 1.5 Screen-Reader Only H1s

Every page should have exactly ONE `<h1>`. For marketing pages, use visually hidden H1s:

```tsx
<h1 className="sr-only">Artha - Modern Stock Trading Journal</h1>
// Visible content uses h2, h3, etc.
```

### 1.6 Middleware Route Exclusions

Exclude static assets and API routes from middleware processing:

```tsx
// middleware.ts
export const config = {
  matcher: [
    // Skip static files, images, and API routes
    '/((?!_next/static|_next/image|favicon.ico|logo.png|og-image.png|api/).*)',
  ],
};
```

---

## 2. GEO (AI Engine Optimization)

GEO optimizes content for AI search engines (ChatGPT, Claude, Perplexity).

### 2.1 Key Principles

| Strategy | Why It Works |
|----------|--------------|
| **Cite sources** | AI engines prioritize factual, verifiable content |
| **Use quotations** | Direct quotes from experts add credibility |
| **Structure with FAQs** | Matches how users query AI assistants |
| **Include statistics** | Numbers and data get cited more often |
| **Write naturally** | Conversational content performs better |

### 2.2 Content Patterns

```markdown
## What is [Topic]?

[Direct answer to the question in 1-2 sentences]

According to [Authority/Study], "[Direct quote with statistic]."

### Key Benefits:
- Benefit 1 with specific metric
- Benefit 2 with comparison
- Benefit 3 with use case
```

### 2.3 FAQ Schema

Every landing page should include FAQ structured data:

```tsx
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(faq => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
}
```

### 2.4 Reference

See full GEO details: `.agent/skills/geo-fundamentals/SKILL.md`

---

## 3. OG/Twitter Previews

### 3.1 Image Requirements

| Platform | Dimensions | Ratio | Max Size |
|----------|------------|-------|----------|
| Twitter | 1200×630 | 1.91:1 | 5MB |
| Facebook | 1200×630 | 1.91:1 | 8MB |
| LinkedIn | 1200×627 | 1.91:1 | 5MB |

### 3.2 Critical: Use Static Images

**❌ NEVER use dynamic image routes:**
```
app/opengraph-image.tsx   ← DELETE THIS
app/twitter-image.tsx     ← DELETE THIS
```

These get served as HTML on Vercel edge runtime!

**✅ ALWAYS use static images with absolute URLs:**
```tsx
openGraph: {
  images: [{
    url: "https://your-domain.com/og-image.png",  // In /public
    width: 1200,
    height: 630,
  }],
},
twitter: {
  card: "summary_large_image",
  images: ["https://your-domain.com/og-image.png"],
},
```

### 3.3 Image Content Checklist

- [ ] Logo visible
- [ ] Product name prominent
- [ ] Value proposition/tagline
- [ ] Website URL at bottom
- [ ] Readable at thumbnail size
- [ ] No misleading claims ("Free" if you have paid tiers)

### 3.4 Testing Tools

| Tool | URL |
|------|-----|
| Twitter Card Validator | https://cards-dev.twitter.com/validator |
| Facebook Debugger | https://developers.facebook.com/tools/debug |
| LinkedIn Inspector | https://www.linkedin.com/post-inspector |
| Metatags.io | https://metatags.io |

---

## 4. Stripe Billing

### 4.1 Webhook Event Handling

```tsx
// api/stripe/webhook/route.ts
const relevantEvents = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
];

// Always verify webhook signature
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

// Log events for debugging
await prisma.subscriptionEvent.create({
  data: { userId, eventType: event.type, eventData: event.data.object },
});
```

### 4.2 Subscription State Machine

```
NONE → TRIALING → ACTIVE → CANCELLED → EXPIRED
                    ↓
                PAST_DUE → CANCELLED
                    
LIFETIME (one-time purchase, never expires)
GRANDFATHERED (free forever for early adopters)
```

### 4.3 Access Control Pattern

```tsx
// lib/subscription.ts
export function canAccessPro(user: User): boolean {
  const activeStatuses = ['ACTIVE', 'TRIALING', 'LIFETIME', 'GRANDFATHERED'];
  return activeStatuses.includes(user.subscriptionStatus);
}

// In API routes
if (!canAccessPro(user)) {
  return Response.json({ error: 'Pro subscription required' }, { status: 403 });
}
```

### 4.4 Paywall UX

- Show trial banner with days remaining
- Graceful downgrade (read-only mode, not complete lockout)
- Clear upgrade CTAs without being pushy
- Customer portal for self-service billing management

### 4.5 Reference

See full details: `.agent/skills/stripe-subscription/SKILL.md`

---

## 5. Authentication

### 5.1 OAuth + Magic Links (NextAuth.js)

```tsx
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({ clientId, clientSecret }),
    EmailProvider({ server: process.env.EMAIL_SERVER }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Create user record if new
      await prisma.user.upsert({ ... });
      return true;
    },
    async session({ session, token }) {
      session.user.id = token.sub;
      return session;
    },
  },
};
```

### 5.2 Middleware Route Protection

```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('next-auth.session-token');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');
  
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

### 5.3 Session Handling

- Always check session in API routes: `const session = await auth();`
- Use `useSession()` hook for client-side auth state
- Handle loading states to prevent flash of unauthenticated content

---

## 6. Dark Mode

### 6.1 Tailwind Configuration

```tsx
// tailwind.config.ts
module.exports = {
  darkMode: 'class',  // Use class-based dark mode
  // ...
};
```

### 6.2 Theme Provider Setup

```tsx
// Using next-themes
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### 6.3 Common Patterns

```tsx
// Use dark: prefix for dark mode styles
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

// For borders
<div className="border border-gray-200 dark:border-gray-700">

// For hover states
<button className="hover:bg-gray-100 dark:hover:bg-gray-800">
```

### 6.4 Common Gotchas

| Issue | Solution |
|-------|----------|
| Flash of wrong theme | Use `suppressHydrationWarning` on `<html>` |
| Charts not updating | Re-render charts on theme change |
| Images not adapting | Use CSS `filter` or provide dark/light variants |
| OG images | Test previews on both Twitter dark and light mode |

### 6.5 Testing Checklist

- [ ] Test all pages in both themes
- [ ] Check contrast ratios meet WCAG AA
- [ ] Verify charts and graphs are readable
- [ ] Test images/icons in both modes

---

## 7. Security

### 7.1 Row Level Security (RLS) + Backend Proxy

Never expose database directly. Always use API routes:

```tsx
// ❌ BAD: Direct Supabase client calls from frontend
const { data } = await supabase.from('trades').select();

// ✅ GOOD: Backend API route with session validation
// api/trades/route.ts
const session = await auth();
if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

const trades = await prisma.trade.findMany({
  where: { userId: session.user.id },  // Enforce user scope
});
```

### 7.2 Encryption

```tsx
// For sensitive data (API keys, tokens)
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  // ...
}
```

### 7.3 Rate Limiting

```tsx
// Use Upstash Redis rate limiter
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),  // 10 requests per 10 seconds
});

// In API route
const { success } = await ratelimit.limit(userId);
if (!success) {
  return Response.json({ error: 'Too many requests' }, { status: 429 });
}
```

### 7.4 Input Validation

```tsx
// Use Zod for runtime validation
import { z } from 'zod';

const TradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  quantity: z.number().positive(),
  price: z.number().positive(),
});

// In API route
const parsed = TradeSchema.safeParse(body);
if (!parsed.success) {
  return Response.json({ error: parsed.error.issues }, { status: 400 });
}
```

### 7.5 Admin Route Protection

```tsx
const ADMIN_EMAILS = ['admin@example.com'];

if (!ADMIN_EMAILS.includes(session.user.email)) {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

## 8. Performance

### 8.1 Redis Caching

```tsx
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const CACHE_TTL = 60 * 5; // 5 minutes

export async function getCachedData(key: string, fetcher: () => Promise<any>) {
  const cached = await redis.get(key);
  if (cached) return cached;
  
  const fresh = await fetcher();
  await redis.set(key, fresh, { ex: CACHE_TTL });
  return fresh;
}
```

### 8.2 Client-Side Filtering

Fetch data once, filter on client for responsiveness:

```tsx
// Fetch all data once
const { data: allTrades } = useSWR('/api/trades');

// Filter client-side for instant UI updates
const filteredTrades = useMemo(() => {
  return allTrades?.filter(t => 
    t.symbol.includes(filter.symbol) &&
    t.date >= filter.startDate
  );
}, [allTrades, filter]);
```

### 8.3 Timeout Handling

```tsx
// For external API calls
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

try {
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  return res.json();
} catch (error) {
  if (error.name === 'AbortError') {
    throw new Error('Request timed out');
  }
  throw error;
}
```

### 8.4 Image Optimization

- Use Next.js `<Image>` component for automatic optimization
- Serve WebP format when possible
- Lazy load below-fold images
- Set explicit width/height to prevent layout shift

---

## 9. Infrastructure

### 9.1 Cron Jobs (Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-trades",
      "schedule": "0 */6 * * *"  // Every 6 hours
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 0 * * *"    // Daily at midnight
    }
  ]
}
```

```tsx
// api/cron/sync-trades/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Run job
  await syncAllUserTrades();
  return Response.json({ success: true });
}
```

### 9.2 Environment Variables

**Development:** `.env.local`
**Production:** Vercel Dashboard → Settings → Environment Variables

Required variables:
```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_*=

# External APIs
SNAPTRADE_CLIENT_ID=
SNAPTRADE_CONSUMER_KEY=

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Encryption
ENCRYPTION_KEY=

# Cron
CRON_SECRET=
```

### 9.3 Prisma Patterns

```tsx
// Schema best practices
model User {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Index foreign keys
  @@index([email])
}

// Use transactions for multi-step operations
await prisma.$transaction([
  prisma.trade.create({ data: tradeData }),
  prisma.position.update({ where: { id: positionId }, data: updateData }),
]);

// Soft deletes for audit trails
model Trade {
  deletedAt DateTime?
  
  @@index([deletedAt])  // For efficient filtering
}
```

---

## 10. Promotional Videos

### 10.1 Remotion Setup

Create videos programmatically with React using Remotion in a subdirectory:

```bash
mkdir video && cd video
npm init -y
npm install remotion @remotion/cli @remotion/renderer react react-dom
npm install -D @types/react @types/react-dom typescript
```

File structure:
```
video/
├── src/
│   ├── index.ts      # Entry point
│   ├── Root.tsx      # Register compositions
│   └── Showcase.tsx  # Your video component
└── package.json
```

### 10.2 Composition Basics

```tsx
// Root.tsx
import { Composition } from 'remotion';
import { Showcase } from './Showcase';

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Showcase"
    component={Showcase}
    durationInFrames={300}  // 10 seconds at 30fps
    fps={30}
    width={1920}
    height={1080}
  />
);
```

### 10.3 Animation Patterns

```tsx
import { useCurrentFrame, interpolate, Sequence } from 'remotion';

export const Showcase: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Fade in over 30 frames (1 second)
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  return (
    <div style={{ opacity }}>
      {/* Sequence components for timing */}
      <Sequence from={0} durationInFrames={90}>
        <TitleCard />
      </Sequence>
      <Sequence from={90} durationInFrames={120}>
        <DemoSection />
      </Sequence>
    </div>
  );
};
```

### 10.4 Rendering Commands

```bash
# Preview in browser
npx remotion preview src/index.ts

# Render to MP4
npx remotion render src/index.ts Showcase out/showcase.mp4

# Render with custom settings
npx remotion render src/index.ts Showcase out/showcase.mp4 --codec=h264 --crf=18
```

### 10.5 Hero Video Integration

For landing page hero videos:

```tsx
// Using HTML5 video (best for short loops)
<video
  autoPlay
  loop
  muted
  playsInline
  className="w-full rounded-xl shadow-2xl"
>
  <source src="/showcase.mp4" type="video/mp4" />
</video>

// With poster fallback for slow connections
<video
  autoPlay
  loop
  muted
  playsInline
  poster="/dashboard-preview.png"
  className="w-full rounded-xl shadow-2xl"
>
  <source src="/showcase.mp4" type="video/mp4" />
</video>
```

### 10.6 Video Hosting Options

| Option | Best For | Notes |
|--------|----------|-------|
| `/public` folder | Small videos (<5MB) | Simple, no external deps |
| Vercel Blob | Medium videos | Built-in CDN |
| Cloudinary | Large videos | Transcoding, adaptive |
| YouTube embed | Long demos | SEO benefits via schema |

### 10.7 Performance Tips

- **Keep hero videos short** (5-15 seconds)
- **Use WebM + MP4** for browser compatibility
- **Compress aggressively** (CRF 23-28 for web)
- **Add `poster` attribute** for instant visual
- **Use `preload="metadata"`** for large videos

### 10.8 Video Checklist

- [ ] Hero video renders correctly
- [ ] Video autoplay works (must be muted)
- [ ] Fallback poster image configured
- [ ] Video compressed for web (<5MB ideal)
- [ ] Both mobile and desktop tested
- [ ] Loading state doesn't cause layout shift

### 10.9 Reference

See full Remotion details: `.agent/skills/remotion/SKILL.md`

---

## 11. Pre-Launch Checklist

### SEO & Discoverability
- [ ] robots.txt configured
- [ ] sitemap.xml generated and accessible
- [ ] JSON-LD structured data valid
- [ ] All pages have unique title/description
- [ ] Google Search Console configured
- [ ] Bing Webmaster Tools configured

### Social Media
- [ ] OG image displays in Twitter Card Validator
- [ ] Facebook Debugger shows correct preview
- [ ] LinkedIn Inspector shows correct preview
- [ ] All image URLs are absolute

### Authentication
- [ ] OAuth providers configured
- [ ] Email magic links working
- [ ] Protected routes redirect to login
- [ ] Session persists across refreshes

### Billing
- [ ] Stripe webhooks receiving events
- [ ] Trial flow working end-to-end
- [ ] Subscription upgrades/downgrades work
- [ ] Customer portal accessible
- [ ] Cancelled users get correct access

### Security
- [ ] All API routes check authentication
- [ ] Admin routes check authorization
- [ ] Rate limiting on sensitive endpoints
- [ ] No secrets in client-side code
- [ ] HTTPS enforced

### Performance
- [ ] Core Web Vitals are green
- [ ] Images optimized
- [ ] No console errors
- [ ] Error monitoring configured (Sentry)

### Video
- [ ] Hero video renders and autoplays
- [ ] Video has poster fallback
- [ ] Compressed for web performance
- [ ] Mobile playback tested

### Infrastructure
- [ ] Cron jobs scheduled and tested
- [ ] Environment variables set in production
- [ ] Database migrations applied
- [ ] Redis cache working

---

## Version History

| Date | Changes |
|------|---------|
| 2026-02-07 | Initial creation from Artha learnings |
| 2026-02-07 | Expanded with all 9 topic areas |
