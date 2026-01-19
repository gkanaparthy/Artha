# Broker Connection Debugging Guide

## Issue Reported by Jagan

**Date:** 2026-01-19  
**User:** Jagan Aluguri  
**Error:** "Failed to connect broker. Please try again."

## Investigation Summary

The error message was generic and didn't provide specific details about why the connection failed. This could be caused by several issues:

### Possible Root Causes

1. **SnapTrade API Issues**
   - SnapTrade service might be down or experiencing issues
   - API credentials (CLIENT_ID, CONSUMER_KEY) might be invalid
   - Rate limiting from SnapTrade

2. **Authentication Issues**
   - User session might have expired
   - NextAuth middleware blocking the request
   - Missing user ID in session

3. **Database Issues**
   - Failed to save SnapTrade user registration
   - Database connection timeout
   - Encryption key issues

4. **Network Issues**
   - Connection timeout to SnapTrade API
   - Proxy or firewall blocking requests
   - CORS issues (unlikely for server-side calls)

## Changes Made

### 1. Enhanced Client-Side Error Logging (`settings/page.tsx`)

Added detailed console logs for each step of the broker connection process:

```typescript
// Step 1: Registration
console.log('[ConnectBroker] Step 1: Registering user with SnapTrade');

// Step 2: Get connection link
console.log('[ConnectBroker] Step 2: Getting connection link');

// Error details
console.error('[ConnectBroker] Error:', e);
alert(`Failed to connect broker: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
```

**Benefits:**
- Users now see the specific error message in the alert
- Browser console shows which step failed
- Easier to diagnose from user screenshots

### 2. Enhanced Server-Side Error Logging

#### Register Endpoint (`/api/auth/snaptrade/register`)
```typescript
console.log('[SnapTrade Register] Registering user:', session.user.id);
console.error('[SnapTrade Register] Error details:', { message, stack });
```

#### Login Endpoint (`/api/auth/snaptrade/login`)
```typescript
console.log('[SnapTrade Login] Generating connection link for user:', session.user.id);
console.error('[SnapTrade Login] Error details:', { message, stack });
```

**Benefits:**
- Vercel logs now show detailed error messages and stack traces
- Can identify exactly which API call to SnapTrade failed
- Session/auth issues are logged clearly

## How to Debug Future Issues

### For Users Experiencing This Error

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for `[ConnectBroker]` log messages
   - Take a screenshot of any errors

2. **Try These Steps:**
   - Sign out and sign back in
   - Clear browser cache and cookies
   - Try a different browser
   - Check if other features work (Dashboard, Trades, etc.)

### For Developers

1. **Check Vercel Production Logs:**
   ```
   Vercel Dashboard → Project → Logs → Filter by time of error
   ```

2. **Look for These Log Patterns:**

   | Log Message | Meaning | Solution |
   |------------|---------|----------|
   | `[SnapTrade Register] No session or user ID` | Auth issue | User needs to sign out/in |
   | `[SnapTrade Register] Error: *` | SnapTrade API error | Check SnapTrade status, API keys |
   | `[SnapTrade Login] No session or user ID` | Auth issue | User needs to sign out/in |
   | `Failed to decrypt SnapTrade secret` | Encryption error | Check DATA_ENCRYPTION_KEY |
   | `User not registered with SnapTrade` | Registration didn't complete | Retry registration |

3. **Check Environment Variables:**
   ```bash
   # In Vercel Dashboard
   SNAPTRADE_CLIENT_ID=WELLTHY-PRODUCTS-LLC-HFMLJ
   SNAPTRADE_CONSUMER_KEY=wJEiuqDxWYB9tpyzw9OUid1RDgpzgxCPLCOL9JIJnPIOSovbPr
   DATA_ENCRYPTION_KEY=4ec03e34e9f1a8476bc934048952963885b987c346cc0ba3fbd96beac62853cb
   ```

4. **Test SnapTrade API Directly:**
   ```bash
   curl -X POST https://api.snaptrade.com/api/v1/snapTrade/registerUser \
     -H "clientId: YOUR_CLIENT_ID" \
     -H "consumerKey: YOUR_CONSUMER_KEY" \
     -H "Content-Type: application/json" \
     -d '{"userId": "test-user-123"}'
   ```

## Next Steps if Issue Persists

1. **Collect Information:**
   - Browser console screenshots
   - Vercel logs (with timestamps)
   - User's email/ID (for database lookup)
   - Time of error occurrence

2. **Check SnapTrade Status:**
   - Visit SnapTrade status page (if available)
   - Contact SnapTrade support if API is down

3. **Database Check:**
   ```sql
   -- Check if user exists and has SnapTrade credentials
   SELECT id, email, "snapTradeUserId", 
          CASE WHEN "snapTradeUserSecret" IS NOT NULL THEN 'encrypted' ELSE 'null' END as secret_status
   FROM "User"
   WHERE email = 'user@example.com';
   ```

4. **Manual Re-registration:**
   - Delete user's SnapTrade registration in database
   - Ask user to try connecting again
   - This forces a fresh registration with SnapTrade

## Testing the Fix

Once deployed, test by:

1. Visit production site: https://arthatrades.com/settings
2. Click "Connect Broker"  
3. **If it fails:**
   - Check browser console for `[ConnectBroker]` logs
   - Check Vercel logs for `[SnapTrade Register]` or `[SnapTrade Login]` logs
   - The error message will now be specific (not generic)

## Related Files

- `/src/app/(dashboard)/settings/page.tsx` - UI with Connect Broker button
- `/src/app/api/auth/snaptrade/register/route.ts` - Registration endpoint
- `/src/app/api/auth/snaptrade/login/route.ts` - Connection link endpoint
- `/src/lib/services/snaptrade.service.ts` - SnapTrade service implementation
- `/src/lib/snaptrade.ts` - SnapTrade SDK client configuration

## Deployment

Changes deployed to production:
- Commit: `036bf06` - "Add detailed error logging for broker connection debugging"
- Date: 2026-01-19
- Status: ✅ Deployed

## Follow-up

**Action Items:**
- [ ] Ask Jagan to try again and share:
  - Browser console screenshot
  - Specific error message in the alert
  - Time of attempt (for Vercel log lookup)
- [ ] Monitor Vercel logs for similar errors from other  users
- [ ] Consider adding a "Report Issue" button that auto-captures logs

---

*This document will be updated as we learn more about the broker connection failures.*
