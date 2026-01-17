# Cron Job Schedule

## Trade Sync (`/api/cron/sync-all`)

**Schedule**: `15 0 * * 2-6` (Vercel Cron, UTC timezone)

### Translated Times:
- **UTC**: 12:15 AM Tuesday-Saturday
- **ET (Eastern Time)**: 7:15 PM Monday-Friday
- **CT (Central Time)**: 6:15 PM Monday-Friday
- **PT (Pacific Time)**: 4:15 PM Monday-Friday

### Why This Time?

**Market Close:**
- US stock market closes at 4:00 PM ET

**Broker Settlement:**
- Most brokers (Schwab, Robinhood, E-Trade) make trade data available 1-3 hours after market close
- Conservative estimate: 7:00 PM ET (midnight UTC)

**Our Schedule:**
- Runs at **7:15 PM ET** (12:15 AM UTC)
- **15 minutes** after the latest brokers typically settle trades
- Ensures all trades from the day are available in SnapTrade

### Why Tuesday-Saturday in UTC?
- 12:15 AM UTC on Tuesday = 7:15 PM ET on Monday
- 12:15 AM UTC on Saturday = 7:15 PM ET on Friday
- This captures all weekday trading sessions (Mon-Fri) in US Eastern Time

### Testing Locally:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-all
```

### Security:
Protected by `CRON_SECRET` environment variable in Vercel.
