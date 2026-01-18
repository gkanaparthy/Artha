# Broker Connection Performance Fix

## Problem Statement

When new users connect their broker account, they experience frustratingly long wait times (25+ seconds) that cause many to abandon the process. This happens because the system attempts to synchronously fetch and process 3 years of trade history immediately after broker authorization.

## Root Cause Analysis

### The Blocking Flow (Before)

1. User completes OAuth with broker
2. Redirected to `/auth/callback`
3. Callback **blocks** while calling `/api/trades/sync` synchronously
4. Sync fetches 3 years of trade history from SnapTrade
5. Each trade is processed and saved to database individually
6. User sees "Syncing your trades..." spinner for 25+ seconds
7. Often hits 25-second timeout on Vercel, causing errors

### Why 3 Years?

The sync window was extended from 1 year to 3 years to prevent "orphaned trades" - situations where a user has open positions but the opening trade falls outside the sync window. This ensures accurate FIFO P&L calculations.

### Performance Impact

For an active trader:
- **1,000 trades** = ~25-30 seconds
- **3,000+ trades** = Timeout (Vercel limit: 30s, our limit: 25s)
- **User Experience** = Frustration → Abandonment

## Solution: Async Background Sync

### New Non-Blocking Flow

1. User completes OAuth with broker
2. Redirected to `/auth/callback`
3. Callback calls `/api/trades/sync-async` (returns immediately)
4. User sees: "Broker connected! Your trades are syncing in the background..."
5. Window closes after 3 seconds
6. Trades continue syncing in background
7. User can navigate dashboard and see trades appear gradually

### Implementation

#### 1. New Async Endpoint: `/api/trades/sync-async/route.ts`

```typescript
export async function POST() {
    const session = await auth();
    
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Start sync in background (non-blocking)
    snapTradeService.syncTrades(session.user.id)
        .then((result) => {
            console.log('[Async Sync] Completed:', result);
        })
        .catch((error) => {
            console.error('[Async Sync] Failed:', error);
        });

    // Return immediately
    return NextResponse.json({
        status: 'started',
        message: 'Trade sync started in background.',
    });
}
```

#### 2. Updated Callback Client

Changed from:
```typescript
// OLD: Waits for sync to complete
const syncRes = await fetch("/api/trades/sync", { method: "POST" });
let result = await syncRes.json();
```

To:
```typescript
// NEW: Returns immediately
const syncRes = await fetch("/api/trades/sync-async", { method: "POST" });
setMessage("Broker connected! Your trades are syncing in background...");
```

## Benefits

### User Experience
- ✅ **Instant feedback** (< 1 second instead of 25+ seconds)
- ✅ **No timeouts** (sync can run as long as needed)
- ✅ **Clear messaging** (users know what's happening)
- ✅ **Progressive loading** (trades appear as they sync)

### Technical
- ✅ **No Vercel timeout issues** (30s limit no longer a problem)
- ✅ **Better resource utilization** (frees up user's browser)
- ✅ **Scalable** (handles any number of trades)
- ✅ **Backwards compatible** (sync endpoint still exists for manual sync)

## Testing

### Happy Path
1. New user connects broker → Success message appears immediately
2. Navigate to dashboard → Trades appear within 30-60 seconds
3. Refresh dashboard → More trades appear as sync continues

### Edge Cases
1. **Sync fails** → User still sees broker connected, can manually retry with "Sync Trades" button
2. **Large history** → Sync continues beyond 30s without timeout
3. **Multiple accounts** → All accounts sync in parallel

## Migration Notes

### Keep Both Endpoints

We maintain **both** sync endpoints:

1. **`/api/trades/sync`** (Synchronous)
   - Used for manual "Sync Trades" button
   - Has 25-second timeout
   - Returns detailed results
   
2. **`/api/trades/sync-async`** (Asynchronous)
   - Used for initial broker connection
   - No timeout
   - Returns immediately

### No Database Changes Required

This is a pure API/UX improvement - no schema changes needed.

## Monitoring

Look for these log patterns:

```
[Async Sync] Completed for user <USER_ID> Result: { synced: 1247, accounts: 2 }
```

Or failures:
```
[Async Sync] Failed for user <USER_ID> <ERROR>
```

## Future Enhancements

### Real-time Progress Updates (Optional)

Could add WebSocket or polling to show live progress:
- "Syncing 2024 trades... (234/512)"
- "Syncing 2023 trades... (128/892)"

### Incremental Sync (Optimization)

Instead of always fetching 3 years, could track `lastSyncDate` per account and only fetch new trades. Would require additional database fields:

```prisma
model BrokerAccount {
  // ... existing fields
  lastSyncDate DateTime? // Track most recent trade synced
}
```

## Rollback Plan

If issues arise, simply revert the callback client to use `/api/trades/sync`:

```typescript
// Revert to:
const syncRes = await fetch("/api/trades/sync", { method: "POST" });
```

The synchronous endpoint remains fully functional.
