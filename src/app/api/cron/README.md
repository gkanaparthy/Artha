# Cron Job Schedule

## Unified Daily Cron (`/api/cron/daily`)

**Schedule**: `0 14 * * *` (Vercel Cron, UTC timezone)

### Translated Times:
- **UTC**: 2:00 PM Daily
- **CT (Central Time)**: 8:00 AM Daily
- **ET (Eastern Time)**: 9:00 AM Daily
- **PT (Pacific Time)**: 6:00 AM Daily

### Functions:
1. **Connection Health Check**: Verifies all broker connections and sends email alerts for broken ones.
2. **Full Trade Sync**: Deep synchronization of all trade history for all users.

### Realtime Sync
Recent orders are now synced in realtime using the `/api/trades/sync-recent` endpoint, triggered by the Dashboard every 2 minutes.

### Testing Locally:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

### Security:
Protected by `CRON_SECRET` environment variable in Vercel.
