# Claude Code Skills - Artha Trading Journal

This document catalogs all available skills for the Artha project and provides guidance on when to use them.

## Overview

Skills are specialized agents that provide domain-specific guidance and code review. They can be invoked manually via `/skill-name` or automatically when working on relevant tasks.

## Current Skills

### 1. vercel-react-best-practices
**Location:** `.claude/skills/vercel-react-best-practices/`
**Trigger:** `/vercel-react-best-practices`

**Purpose:**
Performance optimization for React and Next.js code. Contains 45 rules across 8 categories (async waterfalls, bundle size, server performance, re-renders, etc.).

**When to Use:**
- Writing new React components or Next.js pages
- Implementing data fetching (client or server-side)
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
- Optimizing bundle size or load times

**Example:**
```bash
/vercel-react-best-practices src/app/(dashboard)/journal/page.tsx
```

---

### 2. web-design-guidelines
**Location:** `.claude/skills/web-design-guidelines/`
**Trigger:** `/web-design-guidelines <file-or-pattern>`

**Purpose:**
Review UI code for Web Interface Guidelines compliance. Checks accessibility, UX patterns, and design best practices.

**When to Use:**
- Reviewing UI components for accessibility
- Auditing design patterns
- Checking for UX anti-patterns
- Before launching new features

**Example:**
```bash
/web-design-guidelines src/components/ui/**/*.tsx
```

---

## Proposed Skills

Based on the Artha codebase patterns and risks, here are recommended skills to add:

### 3. artha-security-audit (RECOMMENDED)
**Priority:** HIGH
**Status:** Not yet implemented

**Purpose:**
Security-focused code review for the Artha trading journal:
- Verify RLS policies are enabled on all tables
- Check API routes use `auth()` and filter by `session.user.id`
- Validate encryption usage for sensitive data (SnapTrade secrets)
- Check for SQL injection, XSS, command injection risks
- Verify CRON endpoints use Bearer token auth
- Check middleware protection on sensitive routes

**Trigger Pattern:**
```typescript
name: artha-security-audit
description: Security audit for Artha API routes, database access, and sensitive data handling
argument-hint: <file-or-pattern>
```

**When to Use:**
- Before deploying new API endpoints
- When modifying database schema or RLS policies
- When handling user credentials or encryption
- During security reviews

**Implementation Notes:**
Create `.claude/skills/artha-security-audit/SKILL.md` with rules:
- `auth-check`: Every API route must call `auth()` and verify `session.user.id`
- `rls-enabled`: All Prisma models must have RLS enabled
- `user-filter`: All Prisma queries must filter by `userId`
- `encryption-check`: SnapTrade secrets must use `safeEncrypt()`/`safeDecrypt()`
- `cron-auth`: Cron endpoints must verify `CRON_SECRET` Bearer token
- `no-user-enumeration`: Errors must not leak account/data existence

---

### 4. snaptrade-integration-validator (RECOMMENDED)
**Priority:** MEDIUM-HIGH
**Status:** Not yet implemented

**Purpose:**
Validate proper SnapTrade SDK usage patterns specific to Artha:
- Check for snake_case field access (not camelCase)
- Verify proper option vs stock detection using `trade.option_symbol`
- Validate contract multiplier logic (100 for standard, 10 for mini)
- Check for proper authorization vs account relationship handling
- Verify disabled connection handling

**Trigger Pattern:**
```typescript
name: snaptrade-integration-validator
description: Validate SnapTrade SDK usage patterns and field access
argument-hint: <file-or-pattern>
```

**When to Use:**
- When modifying `src/lib/services/snaptrade.service.ts`
- When adding new SnapTrade API calls
- When working with trade sync or account connection logic
- When debugging SnapTrade integration issues

**Key Rules:**
```typescript
// ❌ INCORRECT (camelCase)
trade.optionSymbol
trade.tradeDate
trade.settlementDate

// ✅ CORRECT (snake_case)
trade.option_symbol
trade.trade_date
trade.settlement_date

// ✅ Proper option detection
const isOption = !!trade.option_symbol;
const multiplier = isOption ? (trade.option_symbol.is_mini_option ? 10 : 100) : 1;

// ✅ Proper authorization-to-account matching
const account = accounts.find(acc => acc.brokerage_authorization === auth.id);
// ❌ WRONG: const account = accounts.find(acc => acc.broker_name === auth.brokerage.name);
```

---

### 5. database-migration-safety (RECOMMENDED)
**Priority:** HIGH
**Status:** Not yet implemented

**Purpose:**
Prevent destructive database operations and ensure safe migrations:
- Block dangerous commands (`prisma migrate reset`, `db push --force-reset`)
- Verify migrations don't drop columns with data
- Check for proper indexes on query-heavy columns
- Validate RLS policies after schema changes
- Ensure proper `@@map` and `@@index` usage

**Trigger Pattern:**
```typescript
name: database-migration-safety
description: Validate database migrations and prevent destructive operations
argument-hint: <file-or-migration>
```

**When to Use:**
- Before running any Prisma migration
- When modifying `prisma/schema.prisma`
- When adding new tables or columns
- Before running any database commands

**Blocked Commands:**
```bash
# NEVER allow these:
npx prisma migrate reset
npx prisma db push --force-reset
DROP TABLE
TRUNCATE TABLE
DELETE FROM (without WHERE clause)
```

**Example Output:**
```
❌ DANGER: prisma migrate reset detected
   This will DESTROY ALL DATA in the database

   If you need to modify the schema:
   1. Create a new migration: npx prisma migrate dev --name <change-description>
   2. Review the generated SQL
   3. Get approval before running

🛑 BLOCKED - Migration safety check failed
```

---

### 6. fifo-pnl-validator (OPTIONAL)
**Priority:** MEDIUM
**Status:** Not yet implemented

**Purpose:**
Validate FIFO P&L calculation logic:
- Check lot matching logic (FIFO order preservation)
- Verify account isolation (no cross-account matching)
- Validate option expiration handling
- Check contract multiplier usage
- Verify date filtering happens AFTER matching

**Trigger Pattern:**
```typescript
name: fifo-pnl-validator
description: Validate FIFO lot matching and P&L calculation logic
argument-hint: src/app/api/metrics/route.ts
```

**When to Use:**
- When modifying P&L calculation logic
- When adding new trade types (futures, crypto, etc.)
- When debugging P&L discrepancies
- During financial accuracy reviews

---

### 7. api-rate-limiting-audit (OPTIONAL)
**Priority:** LOW-MEDIUM
**Status:** Not yet implemented

**Purpose:**
Ensure all public API endpoints have proper rate limiting:
- Check for Upstash Redis rate limiter usage
- Verify appropriate limits per endpoint type
- Check for IP-based vs user-based limiting
- Validate error handling for rate limit exceeded

**Trigger Pattern:**
```typescript
name: api-rate-limiting-audit
description: Audit API endpoints for rate limiting protection
argument-hint: src/app/api/**/*
```

**When to Use:**
- Before deploying new API endpoints
- During security audits
- When experiencing abuse or DoS attempts

---

## Skill Priority Matrix

| Skill | Priority | Status | Effort | Impact |
|-------|----------|--------|--------|--------|
| vercel-react-best-practices | ✅ ACTIVE | Implemented | N/A | High (Performance) |
| web-design-guidelines | ✅ ACTIVE | Implemented | N/A | Medium (UX/A11y) |
| **artha-security-audit** | 🔴 HIGH | Proposed | Medium | CRITICAL (Security) |
| **snaptrade-integration-validator** | 🟡 MEDIUM | Proposed | Low | High (Correctness) |
| **database-migration-safety** | 🔴 HIGH | Proposed | Low | CRITICAL (Data Loss Prevention) |
| fifo-pnl-validator | 🟢 LOW | Proposed | High | Medium (Financial Accuracy) |
| api-rate-limiting-audit | 🟢 LOW | Proposed | Low | Low (DoS Prevention) |

---

## How to Create a New Skill

### Step 1: Create Directory Structure
```bash
mkdir -p .claude/skills/<skill-name>
cd .claude/skills/<skill-name>
```

### Step 2: Create SKILL.md
```markdown
---
name: skill-name
description: Brief description of what this skill does
argument-hint: <file-or-pattern>
---

# Skill Name

Purpose and overview...

## When to Use

- Scenario 1
- Scenario 2

## Rules

### rule-1
Description and examples...
```

### Step 3: Create metadata.json (Optional)
```json
{
  "name": "skill-name",
  "version": "1.0.0",
  "author": "Artha Team",
  "triggers": ["keyword1", "keyword2"]
}
```

### Step 4: Test the Skill
```bash
# Invoke manually
/skill-name src/path/to/file.ts
```

---

## Skill Development Guidelines

### Good Practices
1. **Be Specific**: Rules should be clear and actionable
2. **Provide Examples**: Show correct and incorrect patterns
3. **Context-Aware**: Skills should understand project-specific patterns
4. **Automated**: Skills should run checks automatically, not require manual interpretation

### Anti-Patterns
1. ❌ Generic advice that applies to any codebase
2. ❌ Recommendations without clear rationale
3. ❌ Rules that conflict with existing project patterns
4. ❌ Skills that require manual work to interpret results

---

## Maintenance

### Updating Existing Skills
1. Review skill effectiveness quarterly
2. Update rules based on codebase evolution
3. Add examples from actual code reviews
4. Remove outdated or irrelevant rules

### Deprecating Skills
If a skill becomes obsolete:
1. Mark as deprecated in this document
2. Add migration guide to replacement skill
3. Keep files for 1 quarter before deletion

---

## Quick Reference

### Invoke Skills
```bash
# General syntax
/<skill-name> <file-or-pattern>

# Examples
/vercel-react-best-practices src/app/(dashboard)/**/*.tsx
/web-design-guidelines src/components/ui/button.tsx
/artha-security-audit src/app/api/trades/sync/route.ts
```

### List Available Skills
```bash
ls -la .claude/skills/
```

### View Skill Documentation
```bash
cat .claude/skills/<skill-name>/SKILL.md
```

---

## Next Steps

### Immediate Actions
1. ✅ Document existing skills (this file)
2. 🔲 Implement `artha-security-audit` skill (HIGH PRIORITY)
3. 🔲 Implement `database-migration-safety` skill (HIGH PRIORITY)
4. 🔲 Implement `snaptrade-integration-validator` skill (MEDIUM PRIORITY)

### Future Enhancements
1. Create skill templates for easy creation
2. Add automated skill testing framework
3. Integrate skills into CI/CD pipeline
4. Create skill usage analytics

---

**Last Updated:** 2026-01-25
**Maintained By:** Artha Development Team
**Version:** 1.0
