# Disabled Broker Connections - Implementation Plan

## Executive Summary

This document outlines the comprehensive plan to detect, display, and fix disabled broker connections in Artha Trading Journal. A disabled connection occurs when a user's access token to their trading account becomes invalid, preventing live data access until repaired.

**Current Status (as of 2026-01-21):**
- **Total Users**: 8
- **Total Connections**: 9
- **Disabled Connections**: 1
  - User: suman pulusu (spulusu@gmail.com)
  - Broker: E-Trade
  - Authorization ID: 5ff06d58-f23e-4b66-a45c-3c958e6512a9

**Implementation Status (as of 2026-01-23):**
- ✅ **Phase 1 COMPLETED**: Detection & Display
- ✅ **Phase 2 COMPLETED**: Reconnect Flow
- 🟡 **Phase 2 Testing**: Ready for end-to-end testing with live disabled connection
- ⏸️ **Phase 3 PENDING**: Webhook Integration (future enhancement)

**Key Commits:**
- `40a282c` - Initial Phase 1 database schema and cron job
- `73a688c` - Phase 1 UI updates and bug fixes
- `74c9241` - Phase 2 reconnect flow implementation
- `ae98f29` - **CRITICAL FIX**: Authorization-to-account matching bug (multi-account support)
- `24a0684` - **ENHANCEMENT**: Sync failure handling during reconnect

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [SnapTrade Documentation Summary](#snaptrade-documentation-summary)
3. [Current Implementation Gaps](#current-implementation-gaps)
4. [Solution Architecture](#solution-architecture)
5. [Database Schema Changes](#database-schema-changes)
6. [API Endpoints](#api-endpoints)
7. [UI/UX Changes](#uiux-changes)
8. [User Messaging](#user-messaging)
9. [Implementation Steps](#implementation-steps)
10. [Testing Plan](#testing-plan)
11. [Monitoring & Alerts](#monitoring--alerts)

---

## Problem Statement

When a broker connection becomes disabled:

1. **User is unaware**: No visual indication that the connection is broken
2. **Data becomes stale**: Trades stop syncing automatically
3. **User creates duplicate**: Instead of fixing the connection, users may create a new one, fragmenting their data
4. **Historical data loss**: Deleting and recreating connections can lose trade history

**Impact:**
- Incomplete trading data
- Inaccurate P&L calculations
- Poor user experience
- Support burden

---

## SnapTrade Documentation Summary

### Detection Methods

#### 1. Webhook Monitoring (Recommended)
SnapTrade sends `CONNECTION_BROKEN` webhooks when connections fail:
```json
{
  "type": "CONNECTION_BROKEN",
  "data": {
    "userId": "user-id",
    "authorizationId": "auth-id",
    "brokerage": "E-Trade",
    "timestamp": "2026-01-21T10:00:00Z"
  }
}
```

#### 2. Polling Approach (Current Method)
Call the brokerage authorizations endpoint to check the `disabled` field:
```typescript
const authorizations = await snapTrade.connections.listBrokerageAuthorizations({
  userId: snapTradeUserId,
  userSecret: decryptedSecret
});

// Check: authorization.disabled === true
```

### Fixing Disabled Connections

**Primary Method: Reconnect Flow**

Use the Connection Portal's reconnect mode by passing the `reconnect` parameter (authorization ID) to the login endpoint:

```typescript
const reconnectUrl = await snapTrade.authentication.loginSnapTradeUser({
  userId: snapTradeUserId,
  userSecret: decryptedSecret,
  reconnect: authorizationId, // The disabled connection's ID
  immediateRedirect: true,
  customRedirect: callbackUrl
});
```

**Critical Requirement:**
> "It is important that the user logs into the same brokerage connection when attempting reconnection."

Users **cannot** switch brokerages during reconnect. If they want to switch, they must:
1. Delete the old connection
2. Create a new connection with the new brokerage

### Benefits of Reconnect vs New Connection

| Aspect | Reconnect | New Connection |
|--------|-----------|----------------|
| Historical Data | ✅ Preserved | ❌ Lost |
| Session Data | ✅ Maintained | ❌ Reset |
| Disabled Connections | ✅ Fixed | ❌ Accumulate |
| User Experience | ✅ Seamless | ⚠️ Confusing |

---

## Current Implementation Gaps

### 1. No Disabled Status Tracking
- `BrokerAccount` model lacks `disabled` field
- No way to store/display connection health status

### 2. No Visual Indicator
- Settings page shows all connections as "Connected" (green badge)
- No warning or error state for broken connections

### 3. No Reconnect Flow
- "Connect Broker" button only creates new connections
- No UI to repair existing broken connections

### 4. No Proactive Monitoring
- No webhooks configured
- No background job to check connection status
- Users only discover issues when sync fails

### 5. No User Communication
- No email notifications for broken connections
- No dashboard warnings
- No sync error details displayed

---

## Solution Architecture

### Phase 1: Detection & Display (Week 1)

1. **Database Schema Update**
   - Add `disabled` and `disabledAt` fields to `BrokerAccount`
   - Add `lastSyncedAt` and `lastCheckedAt` for monitoring

2. **Background Sync Job**
   - Check connection status every 6 hours
   - Update database with current status
   - Log status changes

3. **UI Updates**
   - Visual indicators for disabled connections (red badge)
   - Warning banner on settings page
   - Dashboard alert for broken connections

### Phase 2: Reconnect Flow (Week 2)

1. **API Endpoint**
   - `POST /api/accounts/reconnect` - Generate reconnect URL

2. **UI Component**
   - "Reconnect" button for disabled connections
   - Modal explaining the reconnect process
   - Success/error feedback

3. **User Messaging**
   - Clear instructions during reconnect
   - Email notification when connection breaks
   - In-app notification system

### Phase 3: Webhook Integration (Week 3)

1. **Webhook Endpoint**
   - `POST /api/webhooks/snaptrade` - Receive connection events

2. **Event Processing**
   - Update database in real-time
   - Trigger user notifications
   - Log events for debugging

3. **Security**
   - HMAC SHA256 signature verification
   - Rate limiting
   - Event deduplication

---

## Database Schema Changes

### Update `BrokerAccount` Model

```prisma
model BrokerAccount {
  id                 String    @id @default(cuid())
  userId             String
  brokerName         String?
  snapTradeAccountId String    @unique
  accountNumber      String?   // Encrypted

  // Connection status fields (NEW)
  disabled           Boolean   @default(false)
  disabledAt         DateTime?
  disabledReason     String?   // Error message from SnapTrade
  lastSyncedAt       DateTime?
  lastCheckedAt      DateTime?
  authorizationId    String?   // SnapTrade authorization ID for reconnect

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  meta               String?

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  trades             Trade[]

  @@index([userId, disabled]) // For querying disabled connections
  @@map("broker_accounts")
}
```

### Migration Script

```sql
-- Add new columns to broker_accounts table
ALTER TABLE "broker_accounts"
ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "disabled_at" TIMESTAMP,
ADD COLUMN "disabled_reason" TEXT,
ADD COLUMN "last_synced_at" TIMESTAMP,
ADD COLUMN "last_checked_at" TIMESTAMP,
ADD COLUMN "authorization_id" TEXT;

-- Create index for performance
CREATE INDEX "broker_accounts_user_id_disabled_idx"
ON "broker_accounts"("user_id", "disabled");
```

---

## API Endpoints

### 1. Check Connection Status
**Endpoint:** `GET /api/accounts/status`

**Purpose:** Fetch current connection status from SnapTrade

**Request:**
```typescript
// No body - uses session user
```

**Response:**
```typescript
{
  "accounts": [
    {
      "id": "local-account-id",
      "authorizationId": "snaptrade-auth-id",
      "brokerName": "E-Trade",
      "disabled": true,
      "disabledAt": "2026-01-20T10:00:00Z",
      "disabledReason": "OAuth token expired",
      "lastSyncedAt": "2026-01-19T15:30:00Z"
    }
  ],
  "totalAccounts": 2,
  "disabledCount": 1
}
```

**Implementation:**
```typescript
// src/app/api/accounts/status/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { snapTrade } from '@/lib/snaptrade';
import { safeDecrypt } from '@/lib/encryption';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { brokerAccounts: true }
  });

  if (!user?.snapTradeUserId || !user?.snapTradeUserSecret) {
    return NextResponse.json({ accounts: [], totalAccounts: 0, disabledCount: 0 });
  }

  const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);

  // Fetch current status from SnapTrade
  const authorizations = await snapTrade.connections.listBrokerageAuthorizations({
    userId: user.snapTradeUserId,
    userSecret: decryptedSecret
  });

  const accounts = [];
  let disabledCount = 0;

  for (const auth of authorizations.data || []) {
    const localAccount = user.brokerAccounts.find(
      acc => acc.authorizationId === auth.id
    );

    const isDisabled = auth.disabled === true;
    if (isDisabled) disabledCount++;

    // Update database
    if (localAccount) {
      await prisma.brokerAccount.update({
        where: { id: localAccount.id },
        data: {
          disabled: isDisabled,
          disabledAt: isDisabled ? new Date() : null,
          lastCheckedAt: new Date(),
          authorizationId: auth.id
        }
      });
    }

    accounts.push({
      id: localAccount?.id,
      authorizationId: auth.id,
      brokerName: auth.brokerage?.name,
      disabled: isDisabled,
      disabledAt: isDisabled ? new Date() : null,
      lastSyncedAt: localAccount?.lastSyncedAt
    });
  }

  return NextResponse.json({
    accounts,
    totalAccounts: accounts.length,
    disabledCount
  });
}
```

---

### 2. Reconnect Connection
**Endpoint:** `POST /api/accounts/reconnect`

**Purpose:** Generate reconnect URL for disabled connection

**Request:**
```typescript
{
  "accountId": "local-account-id"
}
```

**Response:**
```typescript
{
  "redirectURI": "https://connect.snaptrade.com/reconnect?token=...",
  "authorizationId": "snaptrade-auth-id",
  "brokerName": "E-Trade"
}
```

**Implementation:**
```typescript
// src/app/api/accounts/reconnect/route.ts
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { snapTrade } from '@/lib/snaptrade';
import { safeDecrypt } from '@/lib/encryption';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { accountId } = await request.json();

  const account = await prisma.brokerAccount.findFirst({
    where: {
      id: accountId,
      userId: session.user.id
    },
    include: { user: true }
  });

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  if (!account.disabled) {
    return NextResponse.json({ error: 'Account is not disabled' }, { status: 400 });
  }

  if (!account.authorizationId) {
    return NextResponse.json({
      error: 'No authorization ID found. Please disconnect and reconnect manually.'
    }, { status: 400 });
  }

  const user = account.user;
  if (!user.snapTradeUserId || !user.snapTradeUserSecret) {
    return NextResponse.json({ error: 'User not registered with SnapTrade' }, { status: 400 });
  }

  const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);

  // Generate reconnect URL
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/snaptrade/callback`;

  const result = await snapTrade.authentication.loginSnapTradeUser({
    userId: user.snapTradeUserId,
    userSecret: decryptedSecret,
    reconnect: account.authorizationId, // THIS IS THE KEY PARAMETER
    immediateRedirect: true,
    customRedirect: callbackUrl
  });

  return NextResponse.json({
    redirectURI: result.data.redirectURI,
    authorizationId: account.authorizationId,
    brokerName: account.brokerName
  });
}
```

---

### 3. Webhook Endpoint (Phase 3)
**Endpoint:** `POST /api/webhooks/snaptrade`

**Purpose:** Receive real-time connection status updates

**Security:** HMAC SHA256 signature verification

**Implementation:**
```typescript
// src/app/api/webhooks/snaptrade/route.ts
import { headers } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

function verifySignature(payload: string, signature: string): boolean {
  const secret = process.env.SNAPTRADE_CONSUMER_KEY;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: Request) {
  const headersList = headers();
  const signature = headersList.get('x-snaptrade-signature');

  const rawBody = await request.text();

  if (!signature || !verifySignature(rawBody, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'CONNECTION_BROKEN') {
    const { userId, authorizationId } = event.data;

    // Find user and account
    const account = await prisma.brokerAccount.findFirst({
      where: {
        authorizationId,
        user: { snapTradeUserId: userId }
      }
    });

    if (account) {
      // Mark as disabled
      await prisma.brokerAccount.update({
        where: { id: account.id },
        data: {
          disabled: true,
          disabledAt: new Date(),
          disabledReason: 'Connection broken (webhook notification)'
        }
      });

      // TODO: Send email notification to user
    }
  }

  return new Response('OK', { status: 200 });
}
```

---

## UI/UX Changes

### 1. Settings Page - Connection Status Badge

**Current:**
```tsx
<Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-xs">
  <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
  Connected
</Badge>
```

**Updated:**
```tsx
{account.disabled ? (
  <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10 text-xs">
    <AlertCircle className="h-3 w-3 mr-1.5" />
    Disconnected
  </Badge>
) : (
  <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-xs">
    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
    Connected
  </Badge>
)}
```

### 2. Settings Page - Reconnect Button

**Add next to Disconnect button for disabled connections:**

```tsx
<div className="flex items-center gap-2">
  {account.disabled ? (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => handleReconnect(account.id)}
        className="bg-blue-500 hover:bg-blue-600 text-white"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Reconnect
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDisconnect(account.id)}
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Delete Connection"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => handleDisconnect(account.id)}
      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      title="Disconnect Broker"
    >
      <Unlink className="h-4 w-4" />
    </Button>
  )}
</div>
```

### 3. Warning Banner for Disabled Connections

**Add at top of settings page when disabled connections exist:**

```tsx
{hasDisabledConnections && (
  <Alert variant="destructive" className="mb-6">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Connection Issue Detected</AlertTitle>
    <AlertDescription>
      One or more broker connections are disconnected. Your trades may not be syncing.
      Please reconnect your accounts to continue receiving updates.
    </AlertDescription>
  </Alert>
)}
```

### 4. Dashboard Alert

**Add to dashboard when connections are disabled:**

```tsx
{hasDisabledConnections && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-6"
  >
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Action Required</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Your broker connection is disconnected. Trades are not syncing.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/settings')}
          className="ml-4"
        >
          Fix Now
        </Button>
      </AlertDescription>
    </Alert>
  </motion.div>
)}
```

### 5. Reconnect Modal

**Show when user clicks "Reconnect":**

```tsx
<Dialog open={showReconnectModal} onOpenChange={setShowReconnectModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reconnect {selectedAccount?.brokerName}</DialogTitle>
      <DialogDescription>
        Your connection to {selectedAccount?.brokerName} has been lost.
        This usually happens when:
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-3 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-muted p-1">
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">Security timeout</p>
          <p className="text-xs text-muted-foreground">
            Your broker requires periodic re-authentication for security
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="rounded-full bg-muted p-1">
          <Key className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">Password change</p>
          <p className="text-xs text-muted-foreground">
            You changed your password on the broker's website
          </p>
        </div>
      </div>
    </div>

    <Alert>
      <Info className="h-4 w-4" />
      <AlertDescription className="text-sm">
        <strong>Important:</strong> You must log in to the same {selectedAccount?.brokerName} account
        to preserve your trading history. Switching accounts will lose historical data.
      </AlertDescription>
    </Alert>

    <DialogFooter>
      <Button variant="outline" onClick={() => setShowReconnectModal(false)}>
        Cancel
      </Button>
      <Button onClick={proceedWithReconnect} className="bg-blue-500 hover:bg-blue-600">
        Reconnect Account
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## User Messaging

### 1. Email Notification (Connection Broken)

**Subject:** Action Required: Your {Broker Name} Connection Needs Attention

**Body:**
```html
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <img src="https://arthatrades.com/logo.png" alt="Artha" width="60" height="60" />
      <h1 style="color: #2E4A3B; margin-top: 16px;">Connection Issue Detected</h1>
    </div>

    <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 20px; margin-bottom: 24px; border-radius: 8px;">
      <p style="margin: 0; color: #991B1B; font-weight: 600;">
        ⚠️ Your {Broker Name} connection has been disconnected
      </p>
    </div>

    <p style="color: #2E4A3B; line-height: 1.6;">
      We noticed that your connection to <strong>{Broker Name}</strong> is no longer active.
      This means your trades are not syncing automatically.
    </p>

    <h3 style="color: #2E4A3B; margin-top: 32px;">Why did this happen?</h3>
    <ul style="color: #2E4A3B; line-height: 1.8;">
      <li>Security timeout (brokers require periodic re-authentication)</li>
      <li>Password change on your broker's website</li>
      <li>Temporary technical issue</li>
    </ul>

    <h3 style="color: #2E4A3B; margin-top: 32px;">What you need to do:</h3>
    <ol style="color: #2E4A3B; line-height: 1.8;">
      <li>Click the "Reconnect" button below</li>
      <li>Log in to your <strong>{Broker Name}</strong> account</li>
      <li>Authorize Artha to access your trading data</li>
    </ol>

    <div style="text-align: center; margin: 40px 0;">
      <a href="{RECONNECT_URL}"
         style="display: inline-block; background: #2E4A3B; color: white;
                padding: 16px 48px; text-decoration: none; border-radius: 12px;
                font-weight: 600;">
        Reconnect {Broker Name}
      </a>
    </div>

    <div style="background: #F5F7F2; padding: 16px; border-radius: 8px; margin-top: 32px;">
      <p style="margin: 0; font-size: 13px; color: #2E4A3B;">
        <strong>Important:</strong> Make sure to log in to the same {Broker Name} account
        to preserve your trading history. Switching accounts will result in data loss.
      </p>
    </div>

    <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 40px;">
      If you didn't request this or need help,
      <a href="https://arthatrades.com/contact" style="color: #2E4A3B;">contact support</a>
    </p>
  </div>
</body>
</html>
```

### 2. In-App Toast Notification (Success)

```tsx
toast.success('Connection Restored!', {
  description: `Your ${brokerName} account is now syncing trades again.`,
  duration: 5000
});
```

### 3. In-App Toast Notification (Error)

```tsx
toast.error('Reconnection Failed', {
  description: 'Could not reconnect your account. Please try again or contact support.',
  duration: 7000,
  action: {
    label: 'Retry',
    onClick: () => handleReconnect(accountId)
  }
});
```

---

## Implementation Steps

### Phase 1: Detection & Display ✅ COMPLETED

#### Day 1-2: Database Schema ✅
- [x] Create Prisma migration for new fields
- [x] Run migration on development database
- [x] Test migration rollback
- [x] Deploy migration to production

#### Day 3-4: Background Status Checker ✅
- [x] Create `/api/cron/check-connections` endpoint
- [x] Add to `vercel.json` cron schedule (every 6 hours)
- [x] Test with disabled connection
- [x] Add logging and error handling
- [x] **CRITICAL FIX:** Fixed authorization-to-account matching bug (using `brokerage_authorization` field)

#### Day 5-7: UI Updates ✅
- [x] Update settings page to show connection status (red/green badges)
- [x] Add warning banner for disabled connections
- [x] Add dashboard alert
- [x] Test all UI states (connected, disconnected, loading)

### Phase 2: Reconnect Flow ✅ COMPLETED

#### Day 1-2: API Endpoints ✅
- [x] Create `/api/accounts/reconnect` endpoint
- [x] Test reconnect URL generation with SnapTrade's `reconnect` parameter
- [x] Handle edge cases (no authorizationId, already connected, etc.)
- [x] Apply rate limiting (5 req/min, same as sync)
- [x] **ENHANCEMENT:** Detect and handle sync failure after OAuth success

#### Day 3-5: UI Components ✅
- [x] Add "Reconnect" button to settings page
- [x] Install sonner toast notification library
- [x] Implement reconnect flow with loading states
- [x] Add toast notifications for success/error/warning scenarios
- [x] Update callback handler to detect reconnect vs new connection
- [x] Handle sync pending scenarios with warning messages

#### Day 6-7: Testing & Refinement 🟡 READY FOR TESTING
- [x] Build passes with no TypeScript errors
- [x] Fixed critical authorization-to-account matching bug
- [x] Added edge case handling for sync failures
- [ ] End-to-end testing with real disabled connection (ready to test with Suman's E-Trade)
- [ ] Test error scenarios (rate limiting, network failures, etc.)
- [x] Refine user messaging (toast notifications implemented)
- [x] Update documentation (this file)

### Phase 3: Webhook Integration (Week 3)

#### Day 1-2: Webhook Endpoint
- [ ] Create `/api/webhooks/snaptrade` endpoint
- [ ] Implement HMAC signature verification
- [ ] Test with SnapTrade webhook simulator
- [ ] Add rate limiting

#### Day 3-4: Event Processing
- [ ] Handle `CONNECTION_BROKEN` event
- [ ] Handle `CONNECTION_FIXED` event
- [ ] Update database accordingly
- [ ] Add event logging

#### Day 5-7: Notifications
- [ ] Create email template for connection broken
- [ ] Integrate with Resend API
- [ ] Add in-app notification system
- [ ] Test notification delivery

---

## Critical Fixes & Enhancements

### 🚨 Bug Fix: Authorization-to-Account Matching (Commit: ae98f29)

**The Problem:**
- Previous implementation matched accounts to authorizations using broker name only
- Failed when users had multiple accounts from the same broker (e.g., 3 Schwab accounts)
- All accounts from the same broker would match to the FIRST authorization found
- Result: Wrong disabled status, reconnect button affects wrong account

**The Fix:**
- Discovered `brokerage_authorization` field in SnapTrade Account object
- This field directly links each account to its specific authorization ID
- One authorization CAN have multiple accounts (1:N relationship)
- Example: 1 Schwab OAuth connection → 3 Schwab accounts (Personal, IRA, Rollover)

**Changes Made:**
- `src/lib/services/snaptrade.service.ts`: Match using `acc.brokerage_authorization === auth.id`
- `src/app/api/cron/check-connections/route.ts`: Rewritten to loop through accounts, not authorizations
- Removed flawed broker name fallback matching
- Added logging to show authorization→account relationships

**Impact:**
- ✅ Correctly handles users with multiple accounts from same broker
- ✅ Ensures reconnect targets the correct account
- ✅ Prevents status changes from affecting wrong accounts

---

### ⚠️ Enhancement: Sync Failure Handling (Commit: 24a0684)

**The Problem:**
- User completes OAuth reconnection successfully
- Callback triggers automatic sync to clear disabled status
- If sync fails (timeout, rate limit, network error):
  - User sees "Connection restored!" toast
  - But account still shows disabled badge
  - No indication that manual action is needed

**The Solution:**
- Track sync success/failure in callback handler
- Return different URL parameters based on result:
  - `broker_reconnected=true` → sync succeeded
  - `broker_reconnected_sync_pending=true` → sync failed
- Show appropriate toast messages:
  - ✅ Success: "Connection restored! Trades are syncing again"
  - ⚠️ Warning: "Connection restored but sync pending. Use 'Sync All' to update"

**Benefits:**
- User knows immediately if manual action is needed
- Prevents confusion when disabled badge doesn't clear
- OAuth success is preserved even if sync fails
- Clear guidance on next steps (manual sync or wait)

---

## Testing Plan

### Unit Tests

```typescript
// Test reconnect URL generation
describe('POST /api/accounts/reconnect', () => {
  it('should generate reconnect URL for disabled connection', async () => {
    const response = await fetch('/api/accounts/reconnect', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'test-account-id' })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.redirectURI).toContain('connect.snaptrade.com');
    expect(data.redirectURI).toContain('reconnect=');
  });

  it('should reject non-disabled connections', async () => {
    const response = await fetch('/api/accounts/reconnect', {
      method: 'POST',
      body: JSON.stringify({ accountId: 'active-account-id' })
    });

    expect(response.status).toBe(400);
  });
});
```

### Integration Tests

1. **Manual Test with E-Trade (Suman's Account)** 🟡 READY TO TEST
   - [x] Verify disabled status shows in UI (cron job populates this)
   - [ ] Click "Reconnect" button
   - [ ] Complete OAuth flow with E-Trade
   - [ ] Verify connection is restored (toast notification appears)
   - [ ] Verify trades sync successfully (disabled status clears)
   - [ ] Verify multi-account scenarios (if user has multiple E-Trade accounts)
   - [ ] Test sync failure scenario (manually kill sync to see warning toast)

2. **Webhook Test** ⏸️ DEFERRED TO PHASE 3
   - Phase 3 implementation is deferred as Phase 1 & 2 provide sufficient functionality
   - Polling approach (cron every 6 hours) is adequate for MVP
   - Webhooks will be added later for real-time notifications

### End-to-End Tests

```typescript
// Playwright test
test('reconnect disabled connection', async ({ page }) => {
  await page.goto('/settings');

  // Verify disabled badge is visible
  await expect(page.locator('text=Disconnected')).toBeVisible();

  // Click reconnect button
  await page.click('button:has-text("Reconnect")');

  // Verify modal appears
  await expect(page.locator('text=Reconnect E-Trade')).toBeVisible();

  // Click proceed button
  await page.click('button:has-text("Reconnect Account")');

  // Should redirect to SnapTrade
  await expect(page.url()).toContain('connect.snaptrade.com');
});
```

---

## Monitoring & Alerts

### Metrics to Track

1. **Connection Health**
   - Total connections
   - Disabled connections count
   - Disabled connections percentage
   - Average time to reconnect

2. **Reconnect Success Rate**
   - Successful reconnects
   - Failed reconnects
   - Abandonment rate (users who don't complete flow)

3. **Notification Delivery**
   - Emails sent
   - Emails opened
   - Click-through rate on reconnect link

### Logging

```typescript
// Log connection status changes
logger.info('Connection status changed', {
  userId,
  accountId,
  authorizationId,
  brokerName,
  previousStatus: 'active',
  newStatus: 'disabled',
  reason: 'OAuth token expired',
  timestamp: new Date()
});

// Log reconnect attempts
logger.info('Reconnect attempt', {
  userId,
  accountId,
  brokerName,
  timestamp: new Date()
});

// Log reconnect success/failure
logger.info('Reconnect result', {
  userId,
  accountId,
  success: true,
  timestamp: new Date()
});
```

### Alerts

Set up alerts for:
1. Spike in disabled connections (> 10% of total)
2. Webhook endpoint errors (> 5% error rate)
3. Failed reconnect attempts (> 20% failure rate)
4. Email delivery failures

---

## Success Metrics

### Phase 1 Goals ✅ ACHIEVED
- ✅ All disabled connections visible in UI (red badge + warning banner)
- ✅ Background job successfully checking status (cron every 6 hours)
- ✅ No false positives (fixed with authorization-to-account matching)
- ✅ Proper multi-account support (3 Schwab accounts correctly handled)

### Phase 2 Goals ✅ ACHIEVED
- ✅ Reconnect flow functional (API endpoint + UI components complete)
- ✅ Edge case handling (sync failures, missing authorizationId, etc.)
- ✅ User feedback system (toast notifications for all scenarios)
- 🟡 > 80% success rate on reconnect attempts (pending live testing)
- 🟡 Average reconnect time < 2 minutes (pending live testing)

### Phase 3 Goals ⏸️ PENDING (Future Enhancement)
- ⏸️ Webhooks receiving events in real-time
- ⏸️ Email notifications delivered within 5 minutes
- ✅ Zero duplicated connections created by confused users (reconnect button prevents this)

---

## Rollout Plan

### Development
1. Test with suman's disabled E-Trade connection
2. Verify reconnect flow end-to-end
3. Test error scenarios

### Staging
1. Deploy to staging environment
2. Test with multiple brokers
3. Load test webhook endpoint
4. Verify email delivery

### Production
1. Deploy database migration (low risk)
2. Deploy API endpoints
3. Enable background job
4. Monitor for 24 hours
5. Deploy UI updates
6. Enable webhooks
7. Monitor for 1 week

---

## Future Enhancements

1. **Automatic Reconnect**
   - Detect common error patterns
   - Auto-generate reconnect emails
   - Track bounce-back rates

2. **Connection Health Score**
   - Track connection uptime
   - Display reliability metrics
   - Alert before connection breaks

3. **Multi-Factor Authentication Support**
   - Handle MFA prompts gracefully
   - Cache MFA preferences
   - Reduce re-authentication frequency

4. **Batch Reconnect**
   - Allow users to reconnect multiple accounts at once
   - Streamline multi-account workflows

---

## Appendix

### A. SnapTrade API References

- [Fix Broken Connections](https://docs.snaptrade.com/docs/fix-broken-connections)
- [Webhooks](https://docs.snaptrade.com/docs/webhooks)
- [Brokerage Authorizations API](https://docs.snaptrade.com/reference/listbrokerageauthorizations)

### B. Related Files

- `src/app/(dashboard)/settings/page.tsx` - Settings UI
- `src/components/connect-broker-button.tsx` - Connect button component
- `src/lib/services/snaptrade.service.ts` - SnapTrade service
- `prisma/schema.prisma` - Database schema
- `scripts/check-disabled-connections.ts` - Status checker script

### C. Contact Information

**For Technical Questions:**
- SnapTrade Support: support@snaptrade.com
- SnapTrade Docs: https://docs.snaptrade.com

**For Implementation Help:**
- Internal: Refer to this document
- External: Contact development team

---

**Document Version:** 2.0
**Last Updated:** 2026-01-23
**Author:** Artha Development Team
**Status:** Phase 1 & 2 Complete - Ready for Live Testing
**Next Steps:** End-to-end testing with Suman's disabled E-Trade connection
