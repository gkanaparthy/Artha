# Cron Job Schedule

## Trade Sync (`/api/cron/sync-all`)

**Schedule**: `0 0,12 * * *` (Vercel Cron, UTC timezone)

### Translated Times:
- **UTC**: 12:00 AM and 12:00 PM Daily
- **CT (Central Time)**: 6:00 PM and 6:00 AM Daily
- **ET (Eastern Time)**: 7:00 PM and 7:00 AM Daily
- **PT (Pacific Time)**: 4:00 PM and 4:00 AM Daily

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
