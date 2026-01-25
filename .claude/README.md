# Claude Code Configuration - Artha Trading Journal

This directory contains configuration and skills for Claude Code when working with the Artha codebase.

## Directory Structure

```
.claude/
├── README.md              # This file
├── SKILLS.md              # Comprehensive skills documentation
├── settings.local.json    # Local Claude Code settings
└── skills/                # Custom skills directory
    ├── artha-security-audit/
    │   ├── SKILL.md
    │   └── metadata.json
    ├── snaptrade-integration-validator/
    │   ├── SKILL.md
    │   └── metadata.json
    ├── vercel-react-best-practices/
    │   ├── SKILL.md
    │   ├── README.md
    │   ├── AGENTS.md
    │   ├── metadata.json
    │   └── rules/
    └── web-design-guidelines/
        ├── SKILL.md
        └── metadata.json
```

## Available Skills

### 1. artha-security-audit (🔴 CRITICAL)
**When to use:** Before deploying API routes, modifying auth, or handling sensitive data

```bash
# Audit a single file
/artha-security-audit src/app/api/trades/sync/route.ts

# Audit all API routes
/artha-security-audit src/app/api/**/*.ts

# Audit Prisma schema
/artha-security-audit prisma/schema.prisma
```

**Checks for:**
- Missing `auth()` calls in API routes
- Missing `userId` filters in Prisma queries
- Unencrypted sensitive data
- RLS policy violations
- User enumeration risks
- SQL injection vulnerabilities

---

### 2. snaptrade-integration-validator (🟡 HIGH)
**When to use:** When working with SnapTrade SDK or trade sync logic

```bash
# Validate SnapTrade service
/snaptrade-integration-validator src/lib/services/snaptrade.service.ts

# Validate trade sync
/snaptrade-integration-validator src/app/api/trades/sync/route.ts
```

**Checks for:**
- Correct snake_case field access (not camelCase)
- Proper option vs stock detection
- Contract multiplier handling (100 for standard, 10 for mini)
- Authorization-to-account mapping
- Trade deduplication logic

---

### 3. vercel-react-best-practices (🟢 ACTIVE)
**When to use:** Writing or reviewing React/Next.js code

```bash
# Review a component
/vercel-react-best-practices src/components/journal-table.tsx

# Review all dashboard pages
/vercel-react-best-practices src/app/(dashboard)/**/*.tsx
```

**Checks for:**
- Async waterfalls (Promise.all usage)
- Bundle size optimizations
- Re-render optimization opportunities
- Server-side performance patterns

---

### 4. web-design-guidelines (🟢 ACTIVE)
**When to use:** Reviewing UI components for accessibility and UX

```bash
# Review a UI component
/web-design-guidelines src/components/ui/button.tsx

# Review all UI components
/web-design-guidelines src/components/ui/**/*.tsx
```

**Checks for:**
- Accessibility issues
- UX anti-patterns
- Design consistency
- WCAG compliance

---

## Quick Start

### Running a Skill
1. Open Claude Code in the project directory
2. Type `/` to see available skills
3. Select a skill or type its name
4. Provide file path or pattern

### Example Workflow

```bash
# 1. Before committing API changes
/artha-security-audit src/app/api/accounts/reconnect/route.ts

# 2. After modifying trade sync
/snaptrade-integration-validator src/lib/services/snaptrade.service.ts

# 3. Before deploying new UI
/web-design-guidelines src/components/connect-broker-button.tsx

# 4. Performance review
/vercel-react-best-practices src/app/(dashboard)/journal/page.tsx
```

---

## Skill Priority Guide

Use this guide to determine which skills to run:

### 🔴 CRITICAL - Must run before production
- `artha-security-audit` - Security vulnerabilities can lead to data breaches

### 🟡 HIGH - Strongly recommended
- `snaptrade-integration-validator` - Integration bugs cause data corruption

### 🟢 ACTIVE - Run regularly
- `vercel-react-best-practices` - Performance optimizations improve UX
- `web-design-guidelines` - Accessibility and UX improvements

---

## Creating New Skills

See [SKILLS.md](./SKILLS.md#how-to-create-a-new-skill) for detailed instructions.

**Quick template:**

```bash
# 1. Create directory
mkdir -p .claude/skills/my-skill

# 2. Create SKILL.md
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: Brief description
argument-hint: <file-or-pattern>
---

# My Skill

Purpose and rules...
EOF

# 3. Create metadata.json
cat > .claude/skills/my-skill/metadata.json << 'EOF'
{
  "name": "my-skill",
  "version": "1.0.0",
  "triggers": ["keyword1", "keyword2"]
}
EOF

# 4. Test it
/my-skill src/some-file.ts
```

---

## Settings

### Local Settings (`.claude/settings.local.json`)
Personal Claude Code preferences for this project.

**Common settings:**
```json
{
  "autoSaveDelay": 1000,
  "preferredModel": "sonnet",
  "enableSkills": true
}
```

### Project-wide Guidance (`/CLAUDE.md`)
Project overview, architecture, and development guidelines.

**Key sections:**
- Commands (dev, build, lint, Prisma)
- Dangerous commands (NEVER run)
- Architecture (routes, middleware, services)
- Security patterns (RLS, auth, encryption)

---

## Best Practices

### 1. Run Security Audit First
Always run `artha-security-audit` before other skills to catch critical issues.

```bash
# ✅ GOOD
/artha-security-audit src/app/api/new-endpoint/route.ts
# ... fix security issues first ...
/vercel-react-best-practices src/app/api/new-endpoint/route.ts

# ❌ BAD - Optimizing insecure code
/vercel-react-best-practices src/app/api/new-endpoint/route.ts
```

### 2. Use Pattern Matching for Large Audits
```bash
# Audit all API routes at once
/artha-security-audit src/app/api/**/*.ts

# Audit all components
/web-design-guidelines src/components/**/*.tsx
```

### 3. Re-run Skills After Major Changes
```bash
# After schema changes
/artha-security-audit prisma/schema.prisma

# After SnapTrade updates
/snaptrade-integration-validator src/lib/services/snaptrade.service.ts
```

### 4. Combine Skills for Comprehensive Review
```bash
# For new feature
/artha-security-audit src/app/api/new-feature/**/*
/snaptrade-integration-validator src/app/api/new-feature/**/*
/vercel-react-best-practices src/app/(dashboard)/new-feature/**/*
```

---

## Troubleshooting

### Skill Not Found
```bash
# Check skill exists
ls .claude/skills/

# Check SKILL.md has correct frontmatter
cat .claude/skills/my-skill/SKILL.md
```

### Skill Not Triggering Automatically
Update metadata.json triggers:
```json
{
  "triggers": ["more", "keywords", "here"]
}
```

### Skill Returns Unexpected Results
1. Verify file pattern is correct
2. Check skill rules match current codebase
3. Update skill to reflect code changes

---

## Integration with Development Workflow

### Pre-commit Hook (Recommended)
```bash
# .git/hooks/pre-commit
#!/bin/bash

# Run security audit on staged API files
STAGED_API=$(git diff --cached --name-only | grep "src/app/api/.*\.ts$")

if [ -n "$STAGED_API" ]; then
  echo "Running security audit on API routes..."
  for file in $STAGED_API; do
    # Run audit via Claude Code
    # (requires manual review in practice)
    echo "⚠️  Please run: /artha-security-audit $file"
  done
fi
```

### CI/CD Integration (Future)
```yaml
# .github/workflows/claude-audit.yml
name: Claude Skills Audit

on: [pull_request]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Future: Automated skill execution
      - run: echo "Skills audit placeholder"
```

---

## Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Review skill effectiveness | Quarterly | Dev Team |
| Update skill rules | As needed | Dev Team |
| Add new skills | As patterns emerge | Dev Team |
| Deprecate obsolete skills | Annually | Tech Lead |

---

## Resources

- [SKILLS.md](./SKILLS.md) - Comprehensive skills documentation
- [CLAUDE.md](../CLAUDE.md) - Project guidance
- [Claude Code Docs](https://docs.claude.ai/code) - Official documentation

---

**Last Updated:** 2026-01-25
**Maintained By:** Artha Development Team
