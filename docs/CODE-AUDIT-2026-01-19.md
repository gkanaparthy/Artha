# Code Audit: Incomplete Code & Potential Issues

**Date:** 2026-01-19  
**Auditor:** AI Code Review  
**Scope:** /Users/gautham/AI/Pravaha/src/

---

## 1. CRITICAL ISSUES

### 1.1 ❌ Inconsistent Broker Callback URLs (JUST FIXED)
**Files:** 
- `src/components/connect-broker-button.tsx` → uses `/auth/callback`
- `src/app/(dashboard)/settings/page.tsx` → uses `/api/auth/snaptrade/callback`

**Issue:** Two different callback mechanisms exist, which could cause confusion and inconsistent behavior.

**Status:** Partially fixed - settings page now has proper callback, but there are two callback systems.

**Recommendation:** Consider consolidating to a single callback approach.

---

### 1.2 ⚠️ Admin Routes Without Auth Verification
**File:** `src/app/api/admin/data-health-check/route.ts`

**Issue:** This admin endpoint is publicly accessible without any authentication check!
```typescript
export async function GET() {
    // NO AUTH CHECK!
    const users = await prisma.user.findMany({...});  // Exposes ALL users
}
```

**Impact:** Any user can access this endpoint and see all user emails and trade data quality issues.

**Recommendation:** Add authentication and admin email verification:
```typescript
const session = await auth();
if (!session?.user?.id || session.user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

### 1.3 ⚠️ Debug Routes Accessible in Production
**Files:** 
- `src/app/api/debug/resend-test/route.ts` - Exposes API key prefix
- `src/app/api/debug/dashboard-data/route.ts` - Exposes user data
- `src/app/api/debug/accounts/route.ts` - Lists all accounts

**Issue:** Debug endpoints should be disabled in production or protected.

**Current Protection:** Middleware allows `/api/debug/*` routes (added during this session for testing).

**Recommendation:** 
1. Remove or protect these routes before production
2. Add environment check: `if (process.env.NODE_ENV === 'production') return 404`
3. Or restrict to admin users only

---

## 2. MEDIUM ISSUES

### 2.1 ⚠️ Missing ADMIN_EMAIL Validation in Some Admin Routes
**File:** `src/app/api/admin/cleanup-duplicates/route.ts`

**Issue:** Uses regular `auth()` check, not admin-specific. Any logged-in user can cleanup duplicates.
```typescript
const session = await auth();
if (!session?.user?.id) {  // Only checks if logged in!
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Impact:** Any authenticated user can delete "duplicate" trades from the database.

**Recommendation:** Add admin email check like in `migrate-secrets/route.ts`

---

### 2.2 ⚠️ No Rate Limiting on API Routes
**Files:** All `/api/*` routes

**Issue:** No rate limiting implemented on sensitive API routes like:
- `/api/trades/sync` - Could be abuse to trigger excessive SnapTrade API calls
- `/api/auth/snaptrade/register` - Could register many users
- `/api/trades/cleanup` - DELETE operation without cooldown

**Recommendation:** Implement rate limiting using:
- Vercel Edge Middleware with rate limiting
- Or use Upstash Redis for distributed rate limiting

---

### 2.3 ⚠️ CRON_SECRET Missing from Environment Template
**File:** `src/app/api/cron/sync-all/route.ts`

**Issue:** If `CRON_SECRET` is not set:
```typescript
if (!cronSecret) {
    console.error("[Cron Sync] CRON_SECRET not configured");
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 });
}
```

But this error response exposes that the cron endpoint exists. Better to return 401 or 404.

---

### 2.4 ⚠️ safeDecrypt Silently Returns Original Value
**File:** `src/lib/encryption.ts` (lines 97-111)

**Issue:** If decryption fails, it returns the original value without clear indication:
```typescript
if (isEncrypted(value)) {
    try {
        return decrypt(value);
    } catch (e) {
        console.error('Failed to decrypt value, returning as-is:', e);
        return value;  // Returns unencrypted data - could be a security issue
    }
}
return value;  // Not encrypted, return as-is
```

**Impact:** In an attack scenario, a malicious value that looks encrypted but fails decryption would be returned as-is, potentially causing issues.

**Recommendation:** Throw error or return null on decryption failure instead of original value.

---

## 3. LOW/MINOR ISSUES

### 3.1 Empty Object Passed to API (Pattern Found)
**Files:** Multiple files pass empty objects to APIs

**Example:** Previously in settings page:
```typescript
body: JSON.stringify({})  // Empty body - relies on default behavior
```

**Status:** Fixed in settings page, but check other instances.

---

### 3.2 Generic Error Messages Hide Root Cause
**Files:** Multiple API routes

**Example:** `src/app/api/trades/cleanup/route.ts`:
```typescript
catch (error) {
    console.error("[API] Delete trades error:", error);
    return NextResponse.json(
        { error: "Failed to delete trades" },  // Generic message
        { status: 500 }
    );
}
```

**Recommendation:** In development, include error details; in production, log but show generic message.

---

### 3.3 No Input Validation on API Parameters
**Files:** Various API routes accept query parameters without validation

**Example:** `src/app/api/trades/route.ts`:
```typescript
const id = searchParams.get("id");
// No validation that `id` is a valid UUID format
```

---

### 3.4 ESLint Disables for React Hooks
**Files:**
- `src/components/layout/demo-mobile-nav.tsx`
- `src/components/layout/mobile-nav.tsx`
- `src/components/theme-toggle.tsx`
- `src/app/auth/callback/callback-client.tsx`

**Issue:** Multiple `eslint-disable-next-line react-hooks/set-state-in-effect` comments.

**Recommendation:** Refactor to avoid setting state directly in effects where possible.

---

### 3.5 TypeScript `any` Types in SnapTrade Service
**File:** `src/lib/services/snaptrade.service.ts`

**Lines:** 169, 406

**Issue:** Using `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

**Recommendation:** Define proper types for SnapTrade API responses.

---

## 4. SECURITY CHECKLIST

| Check | Status | Notes |
|-------|--------|-------|
| All API routes have auth | ⚠️ | Some admin routes missing proper checks |
| Debug routes protected | ❌ | Currently accessible (needs fix) |
| Admin routes verify admin email | ⚠️ | Some routes only check auth() |
| Environment variables validated | ✅ | Most have checks |
| Encryption key validation | ✅ | Good length check |
| Rate limiting | ❌ | Not implemented |
| CORS configuration | ✅ | Handled by Next.js |
| Input validation | ⚠️ | Minimal |
| Error messages don't leak info | ⚠️ | Some expose details |

---

## 5. PRIORITY FIXES

### Immediate (Do Now):
1. **Protect `/api/admin/data-health-check`** - Add auth + admin email check
2. **Protect `/api/admin/cleanup-duplicates`** - Add admin email check
3. **Protect or remove debug routes** in production

### Soon (This Week):
4. Implement rate limiting on sync endpoints
5. Consolidate broker callback systems
6. Add input validation to API parameters

### Later (Tech Debt):
7. Replace TypeScript `any` types with proper types
8. Standardize error handling across API routes
9. Refactor React hooks to avoid eslint disables

---

## 6. FILES REVIEWED

- ✅ All API routes in `/src/app/api/**`
- ✅ Auth configuration in `/src/lib/auth.ts`
- ✅ Encryption library `/src/lib/encryption.ts`
- ✅ SnapTrade service `/src/lib/services/snaptrade.service.ts`
- ✅ Middleware `/src/middleware.ts`
- ✅ Settings page `/src/app/(dashboard)/settings/page.tsx`
- ✅ Connect broker button `/src/components/connect-broker-button.tsx`

---

*Generated by code audit on 2026-01-19*
