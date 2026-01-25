# Claude Code Skills - Artha Trading Journal

This project uses specialized Claude Code skills to enforce best practices, security patterns, and integration correctness.

**Full Documentation:** See [`.claude/SKILLS.md`](./.claude/SKILLS.md) and [`.claude/README.md`](./.claude/README.md)

## Available Skills

### 🔴 CRITICAL Priority

#### 1. artha-security-audit
**Location:** `.claude/skills/artha-security-audit/`
**When to use:** Before deploying API routes, modifying auth, or handling sensitive data

Enforces Artha's strict "Deny-All" RLS + Backend Proxy security pattern:
- Verifies all API routes call `auth()` and filter by `session.user.id`
- Checks RLS policies are enabled on all tables
- Validates encryption usage for SnapTrade secrets
- Prevents SQL injection, XSS, user enumeration
- Verifies CRON endpoint authentication

**Usage:**
```bash
/artha-security-audit src/app/api/trades/sync/route.ts
/artha-security-audit src/app/api/**/*.ts
```

---

#### 2. database-migration-safety (Planned)
**Status:** Not yet implemented
**Priority:** CRITICAL

Prevents destructive database operations:
- Blocks `prisma migrate reset`, `db push --force-reset`
- Validates migrations don't drop columns with data
- Ensures RLS policies after schema changes

---

### 🟡 HIGH Priority

#### 3. snaptrade-integration-validator
**Location:** `.claude/skills/snaptrade-integration-validator/`
**When to use:** Working with SnapTrade SDK or trade sync logic

Validates proper SnapTrade SDK usage:
- Enforces snake_case field access (not camelCase)
- Checks proper option vs stock detection
- Validates contract multiplier logic (100 for standard, 10 for mini)
- Verifies authorization-to-account mapping
- Ensures trade deduplication

**Usage:**
```bash
/snaptrade-integration-validator src/lib/services/snaptrade.service.ts
/snaptrade-integration-validator src/app/api/trades/sync/route.ts
```

**Common mistakes caught:**
```typescript
// ❌ WRONG
trade.optionSymbol      // Field doesn't exist
trade.tradeDate         // Field doesn't exist

// ✅ CORRECT
trade.option_symbol     // Snake case!
trade.trade_date        // Snake case!

// ❌ WRONG - Matches wrong account for multi-account users
const auth = authorizations.find(a => a.brokerage.name === 'Schwab');

// ✅ CORRECT - Direct authorization ID
const auth = authorizations.find(a => a.id === account.brokerage_authorization);
```

---

### 🟢 ACTIVE

#### 4. vercel-react-best-practices
**Location:** `.claude/skills/vercel-react-best-practices/`
**When to use:** Writing or reviewing React/Next.js code

Contains 45 performance rules across 8 categories:
- Async waterfalls (Promise.all usage)
- Bundle size optimization
- Server-side performance
- Re-render optimization

**Usage:**
```bash
/vercel-react-best-practices src/app/(dashboard)/journal/page.tsx
```

---

#### 5. web-design-guidelines
**Location:** `.claude/skills/web-design-guidelines/`
**When to use:** Reviewing UI components for accessibility and UX

Checks against Web Interface Guidelines:
- Accessibility (WCAG compliance)
- UX anti-patterns
- Design consistency

**Usage:**
```bash
/web-design-guidelines src/components/ui/button.tsx
```

---

## Skill Priority Matrix

| Skill | Priority | Status | Use Before |
|-------|----------|--------|------------|
| artha-security-audit | 🔴 CRITICAL | ✅ Active | Production deployment |
| snaptrade-integration-validator | 🟡 HIGH | ✅ Active | SnapTrade changes |
| database-migration-safety | 🔴 CRITICAL | 📋 Planned | Schema changes |
| vercel-react-best-practices | 🟢 ACTIVE | ✅ Active | Component work |
| web-design-guidelines | 🟢 ACTIVE | ✅ Active | UI changes |

---

## Quick Reference

### Pre-deployment Checklist
```bash
# 1. Security audit (CRITICAL)
/artha-security-audit src/app/api/**/*.ts

# 2. Integration validation
/snaptrade-integration-validator src/lib/services/snaptrade.service.ts

# 3. Performance review
/vercel-react-best-practices src/app/(dashboard)/**/*.tsx

# 4. Accessibility check
/web-design-guidelines src/components/**/*.tsx
```

### Common Workflows

**New API Endpoint:**
```bash
/artha-security-audit src/app/api/new-endpoint/route.ts
```

**SnapTrade Changes:**
```bash
/snaptrade-integration-validator src/lib/services/snaptrade.service.ts
```

**UI Component:**
```bash
/web-design-guidelines src/components/new-component.tsx
/vercel-react-best-practices src/components/new-component.tsx
```

---

## Key Knowledge Areas

### FIFO P&L Engine
**Location:** `src/app/api/metrics/route.ts`

Critical patterns:
- Groups trades by canonical key: `{accountId}:{universalSymbolId}`
- Matches BUY with SELL orders using FIFO within each account
- Supports long/short positions, options (standard + mini)
- Uses contract multiplier: 100 for standard options, 10 for mini
- Date filters applied AFTER FIFO matching (not before)

**Validation:**
- Run `artha-security-audit` on any FIFO changes
- Ensure account isolation (no cross-account matching)
- Verify option expiration handling

---

### SnapTrade Integration
**Location:** `src/lib/services/snaptrade.service.ts`

Critical patterns:
- **ALWAYS use snake_case:** `trade.option_symbol`, `trade.trade_date`
- **Option detection:** `const isOption = !!trade.option_symbol`
- **Contract multiplier:** `isOption ? (trade.option_symbol.is_mini_option ? 10 : 100) : 1`
- **Authorization mapping:** `account.brokerage_authorization === auth.id`
- **Trade deduplication:** Use `snapTradeTradeId` and content hash

**Validation:**
- Run `snaptrade-integration-validator` on all changes
- Test with multiple accounts from same broker
- Verify mini option handling

---

### Security & RLS
**Pattern:** Strict "Deny-All" RLS + Backend Proxy

Critical requirements:
- **Every API route** must call `auth()` and verify `session.user.id`
- **Every Prisma query** must filter by `userId: session.user.id`
- **All sensitive data** (SnapTrade secrets) must use `safeEncrypt()`/`safeDecrypt()`
- **All tables** must have RLS enabled in Supabase
- **CRON endpoints** must verify `CRON_SECRET` Bearer token

**Validation:**
- Run `artha-security-audit` before every deployment
- Never trust `userId` from request body/params
- Use generic 403 errors (prevent user enumeration)

---

### Infrastructure

**Database:**
- Supabase PostgreSQL with RLS
- Prisma ORM with service_role bypass
- PgBouncer connection pooling

**Authentication:**
- NextAuth with JWT session strategy
- Google & Apple OAuth providers
- Session encryption with `AUTH_SECRET`

**Deployment:**
- Vercel Edge for API routes
- Serverless functions for cron jobs
- Environment variables for secrets

---

## Creating New Skills

See [`.claude/SKILLS.md`](./.claude/SKILLS.md#how-to-create-a-new-skill) for detailed instructions.

**Quick start:**
```bash
mkdir -p .claude/skills/my-skill
# Create SKILL.md with frontmatter
# Create metadata.json
# Test with: /my-skill <file-path>
```

---

## Resources

- **Full Documentation:** [`.claude/SKILLS.md`](./.claude/SKILLS.md)
- **Quick Start:** [`.claude/README.md`](./.claude/README.md)
- **Project Guidance:** [`CLAUDE.md`](./CLAUDE.md)
- **Disabled Connections Plan:** [`docs/DISABLED_CONNECTIONS_PLAN.md`](./docs/DISABLED_CONNECTIONS_PLAN.md)

---

**Last Updated:** 2026-01-25
**Maintained By:** Artha Development Team
