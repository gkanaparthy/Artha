---
name: artha-security-audit
description: Security audit for Artha API routes, database access, and sensitive data handling. Checks auth, RLS, encryption, and prevents common vulnerabilities.
argument-hint: <file-or-pattern>
---

# Artha Security Audit

Comprehensive security review for the Artha Trading Journal. This skill enforces the strict "Deny-All" RLS + Backend Proxy pattern and validates security-critical code patterns.

## When to Use

**ALWAYS run this skill when:**
- Creating or modifying API routes (`src/app/api/**/*`)
- Modifying Prisma schema (`prisma/schema.prisma`)
- Handling user authentication or session data
- Working with encryption/decryption
- Modifying middleware (`src/middleware.ts`)
- Accessing or modifying the database

**Invoke manually:**
```bash
/artha-security-audit src/app/api/trades/sync/route.ts
/artha-security-audit src/app/api/**/*.ts
/artha-security-audit prisma/schema.prisma
```

## Security Rules

### Rule 1: API Authentication Check
**Severity:** CRITICAL 🔴

Every API route MUST verify the user session using `auth()` from `@/lib/auth`.

**✅ CORRECT:**
```typescript
// src/app/api/trades/route.ts
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Proceed with authenticated logic...
}
```

**❌ INCORRECT:**
```typescript
// Missing auth check - VULNERABLE!
export async function GET(request: Request) {
  const trades = await prisma.trade.findMany(); // NO AUTH!
  return NextResponse.json(trades);
}
```

**Exceptions:**
- `/api/auth/*` - Auth callback routes
- `/api/cron/*` - Cron routes (must verify `CRON_SECRET` instead)
- `/api/health` - Health check endpoint
- Public demo routes (must explicitly verify it's demo mode)

---

### Rule 2: User Data Isolation
**Severity:** CRITICAL 🔴

All Prisma queries MUST filter by the authenticated user's ID. Never trust `userId` from request body or URL params.

**✅ CORRECT:**
```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// ALWAYS filter by session.user.id
const trades = await prisma.trade.findMany({
  where: {
    userId: session.user.id, // ✅ Safe
  },
});
```

**❌ INCORRECT:**
```typescript
const { userId } = await request.json(); // ❌ Never trust client input!

const trades = await prisma.trade.findMany({
  where: {
    userId, // ❌ VULNERABLE - users can access other users' data!
  },
});
```

**❌ ALSO INCORRECT:**
```typescript
// Missing where clause - returns ALL users' data!
const trades = await prisma.trade.findMany(); // ❌ CRITICAL VULNERABILITY
```

---

### Rule 3: RLS Must Be Enabled
**Severity:** CRITICAL 🔴

All Prisma models MUST have RLS (Row Level Security) enabled in Supabase. The backend uses `service_role` key to bypass RLS after verifying identity.

**✅ CORRECT:**
```prisma
model Trade {
  id        String   @id @default(cuid())
  userId    String   // ✅ Required for RLS
  symbol    String
  // ... other fields

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId]) // ✅ Index for performance
  @@map("trades")
}
```

**SQL RLS Policy (Supabase):**
```sql
-- MUST be applied to each table
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Default deny policy (no public access)
CREATE POLICY "Deny all direct access to trades"
ON trades
FOR ALL
USING (false);
```

**❌ INCORRECT:**
```prisma
model Trade {
  id     String @id
  symbol String
  // ❌ MISSING userId field - no RLS possible!

  @@map("trades")
}
```

**Verification:**
Run this SQL to check RLS status:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- Should return ZERO rows (all tables must have RLS enabled)
```

---

### Rule 4: Sensitive Data Encryption
**Severity:** CRITICAL 🔴

SnapTrade user secrets MUST be encrypted using `safeEncrypt()` before storing in the database.

**✅ CORRECT:**
```typescript
import { safeEncrypt, safeDecrypt } from '@/lib/encryption';

// Storing secret
await prisma.user.update({
  where: { id: userId },
  data: {
    snapTradeUserSecret: safeEncrypt(secret), // ✅ Encrypted
  },
});

// Retrieving secret
const user = await prisma.user.findUnique({ where: { id: userId } });
const decryptedSecret = safeDecrypt(user.snapTradeUserSecret); // ✅ Decrypted
```

**❌ INCORRECT:**
```typescript
// Storing plaintext secret - CRITICAL VULNERABILITY!
await prisma.user.update({
  where: { id: userId },
  data: {
    snapTradeUserSecret: secret, // ❌ PLAINTEXT!
  },
});
```

**Environment Variable Required:**
```bash
DATA_ENCRYPTION_KEY=<strong-random-key> # MUST be set in .env
```

---

### Rule 5: Cron Job Authentication
**Severity:** HIGH 🟡

Cron endpoints (`/api/cron/*`) MUST verify the `CRON_SECRET` Bearer token.

**✅ CORRECT:**
```typescript
// src/app/api/cron/sync-all/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Proceed with cron job logic...
}
```

**❌ INCORRECT:**
```typescript
// No authentication - ANYONE can trigger this!
export async function GET(request: Request) {
  // ❌ Missing CRON_SECRET check
  await syncAllUsers();
  return NextResponse.json({ success: true });
}
```

**Vercel Cron Configuration:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-all",
    "schedule": "0 */6 * * *"
  }]
}
```

---

### Rule 6: No User Enumeration
**Severity:** MEDIUM 🟡

Error messages MUST NOT reveal whether accounts or data exist. Always return generic 403 Forbidden.

**✅ CORRECT:**
```typescript
const account = await prisma.brokerAccount.findFirst({
  where: {
    id: accountId,
    userId: session.user.id,
  },
});

if (!account) {
  // ✅ Generic error - doesn't reveal if account exists
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**❌ INCORRECT:**
```typescript
const account = await prisma.brokerAccount.findFirst({
  where: { id: accountId },
});

if (!account) {
  // ❌ Reveals account doesn't exist
  return NextResponse.json({ error: 'Account not found' }, { status: 404 });
}

if (account.userId !== session.user.id) {
  // ❌ Reveals account exists but belongs to someone else
  return NextResponse.json({ error: 'Not your account' }, { status: 403 });
}
```

---

### Rule 7: SQL Injection Prevention
**Severity:** CRITICAL 🔴

ALWAYS use Prisma's parameterized queries. NEVER concatenate user input into raw SQL.

**✅ CORRECT:**
```typescript
// Prisma automatically parameterizes queries
const trades = await prisma.trade.findMany({
  where: {
    symbol: userInput, // ✅ Safe - automatically parameterized
  },
});
```

**❌ INCORRECT:**
```typescript
// Raw SQL with string concatenation - VULNERABLE!
await prisma.$executeRaw`
  SELECT * FROM trades WHERE symbol = '${userInput}'
`;
// ❌ SQL INJECTION RISK!
```

**If raw SQL is necessary:**
```typescript
// Use Prisma.sql template tag for safe interpolation
import { Prisma } from '@prisma/client';

await prisma.$executeRaw(
  Prisma.sql`SELECT * FROM trades WHERE symbol = ${userInput}`
);
// ✅ Safe - parameterized
```

---

### Rule 8: XSS Prevention
**Severity:** HIGH 🟡

User-generated content MUST be sanitized before rendering. Next.js automatically escapes JSX, but be careful with:
- `dangerouslySetInnerHTML`
- Direct DOM manipulation
- Rendering user input in attributes

**✅ CORRECT:**
```typescript
// Next.js automatically escapes
<div>{userInput}</div> // ✅ Safe

// Sanitize before using dangerouslySetInnerHTML
import DOMPurify from 'isomorphic-dompurify';

<div
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(userInput) // ✅ Sanitized
  }}
/>
```

**❌ INCORRECT:**
```typescript
// Unsanitized HTML - XSS RISK!
<div dangerouslySetInnerHTML={{ __html: userInput }} />
// ❌ VULNERABLE!
```

---

### Rule 9: Rate Limiting
**Severity:** MEDIUM 🟡

Public API endpoints SHOULD have rate limiting to prevent abuse.

**✅ CORRECT:**
```typescript
import { ratelimit } from '@/lib/ratelimit';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit: 5 requests per minute
  const { success, remaining } = await ratelimit.limit(
    `sync:${session.user.id}`
  );

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Proceed with logic...
}
```

**Current Rate Limits:**
- Trade sync: 5 req/min per user
- Account operations: 5 req/min per user
- Metrics: 10 req/min per user

---

### Rule 10: Dangerous Commands Guard
**Severity:** CRITICAL 🔴

NEVER allow destructive database operations without explicit user approval.

**🚫 BLOCKED COMMANDS:**
```bash
npx prisma migrate reset          # ❌ DESTROYS ALL DATA
npx prisma db push --force-reset  # ❌ DESTROYS ALL DATA
prisma migrate reset              # ❌ DESTROYS ALL DATA
prisma db push --force-reset      # ❌ DESTROYS ALL DATA

# SQL Commands
DROP TABLE ...                    # ❌ DESTROYS TABLE
TRUNCATE TABLE ...                # ❌ DESTROYS DATA
DELETE FROM ... (without WHERE)   # ❌ DESTROYS ALL ROWS
```

**✅ SAFE ALTERNATIVES:**
```bash
# Create new migration instead
npx prisma migrate dev --name <description>

# Review generated SQL
cat prisma/migrations/<timestamp>_<name>/migration.sql

# Push schema changes (dev only, non-destructive)
npx prisma db push
```

---

## Audit Checklist

When reviewing code, verify:

### API Routes (`src/app/api/**/*`)
- [ ] Calls `auth()` and checks `session.user.id`
- [ ] All Prisma queries filter by `userId: session.user.id`
- [ ] Errors are generic (no user enumeration)
- [ ] Rate limiting is applied (if public endpoint)
- [ ] No raw SQL with string concatenation
- [ ] CRON endpoints verify `CRON_SECRET`

### Database Schema (`prisma/schema.prisma`)
- [ ] All models have `userId` field (except User model)
- [ ] All models have RLS enabled in Supabase
- [ ] Sensitive fields are encrypted (e.g., `snapTradeUserSecret`)
- [ ] Proper indexes exist for query performance
- [ ] Cascade deletes are configured correctly

### Encryption (`src/lib/encryption.ts`)
- [ ] `DATA_ENCRYPTION_KEY` environment variable exists
- [ ] All secrets use `safeEncrypt()` before storage
- [ ] All secrets use `safeDecrypt()` before use
- [ ] No plaintext secrets in logs or responses

### Authentication (`src/lib/auth.ts`, `src/middleware.ts`)
- [ ] Protected routes enforce authentication
- [ ] Public routes are explicitly listed in middleware
- [ ] Demo routes explicitly check for demo mode
- [ ] Session secrets are secure and rotated

---

## Common Vulnerabilities Found

### 1. Missing User Filter (CRITICAL)
```typescript
// ❌ BEFORE (VULNERABLE)
export async function GET() {
  const trades = await prisma.trade.findMany();
  return NextResponse.json(trades);
}

// ✅ AFTER (SECURE)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id },
  });
  return NextResponse.json(trades);
}
```

### 2. User Enumeration via Error Messages
```typescript
// ❌ BEFORE (LEAKS INFO)
if (!account) {
  return NextResponse.json({ error: 'Account not found' }, { status: 404 });
}
if (account.userId !== session.user.id) {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
}

// ✅ AFTER (SECURE)
const account = await prisma.brokerAccount.findFirst({
  where: {
    id: accountId,
    userId: session.user.id,
  },
});

if (!account) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 3. Plaintext Secrets
```typescript
// ❌ BEFORE (CRITICAL VULNERABILITY)
await prisma.user.update({
  data: { snapTradeUserSecret: secret },
});

// ✅ AFTER (SECURE)
import { safeEncrypt } from '@/lib/encryption';

await prisma.user.update({
  data: { snapTradeUserSecret: safeEncrypt(secret) },
});
```

---

## Testing Security

### Manual Testing
```bash
# Test unauthorized access
curl -X GET http://localhost:3000/api/trades
# Should return 401 Unauthorized

# Test with valid session
curl -X GET http://localhost:3000/api/trades \
  -H "Cookie: next-auth.session-token=<valid-token>"
# Should return only current user's trades

# Test CRON endpoint without token
curl -X GET http://localhost:3000/api/cron/sync-all
# Should return 401 Unauthorized

# Test CRON endpoint with valid token
curl -X GET http://localhost:3000/api/cron/sync-all \
  -H "Authorization: Bearer ${CRON_SECRET}"
# Should succeed
```

### Automated Security Checks
```bash
# Check for missing auth() calls
grep -r "export async function" src/app/api/ | \
  grep -v "auth()" | \
  grep -v "/api/auth/" | \
  grep -v "/api/health"

# Check for missing userId filters
grep -r "prisma\\..*\\.findMany" src/app/api/ | \
  grep -v "userId"

# Check for RLS status
psql $DATABASE_URL -c \
  "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false"
```

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/security)
- [Prisma Security](https://www.prisma.io/docs/guides/security)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [CLAUDE.md Security Section](../../CLAUDE.md#security--rls)

---

**Skill Version:** 1.0
**Last Updated:** 2026-01-25
**Maintained By:** Artha Security Team
