# Cron Job Schedule

## Trade Sync (`/api/cron/sync-all`)

**Schedule**: `30 13 * * *` (Vercel Cron, UTC timezone)

### Translated Times:
- **UTC**: 1:30 PM Daily
- **CT (Central Time)**: 7:30 AM Daily
- **ET (Eastern Time)**: 8:30 AM Daily
- **PT (Pacific Time)**: 5:30 AM Daily

### Why This Time?

**Broker Settlement:**
- Some brokers (especially Schwab) can have a delay in making trade executions available via API.
- Running at **7:30 AM CT / 8:30 AM ET** ensures that all trades from the previous trading day (even those settled late overnight) are fully synchronized and available before the next market open.
- This provides a fresh, updated dashboard for the start of the new trading day.

### Testing Locally:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-all
```

### Security:
Protected by `CRON_SECRET` environment variable in Vercel.
