# Proactive Data Quality Monitoring System

## Overview

A comprehensive monitoring system that **proactively detects** data quality issues (like phantom positions) **before** users report them, with automated daily scans and admin dashboard for quick triage.

---

## Components

### 1. **Health Check API** 
**Endpoint:** `GET /api/admin/data-health-check`

Scans all users for data quality issues and returns a detailed report.

**Detection Heuristics:**

| Issue Type | Detection Logic | Severity |
|-----------|----------------|----------|
| **Phantom Positions** | Has sells, no buys, net negative quantity | High |
| **Old Open Positions** | Trades > 2 years old (>20 trades) | Medium |
| **Extreme Symbol Count** | > 100 unique symbols | Medium |

**Response Example:**
```json
{
  "scannedUsers": 45,
  "usersWithIssues": 3,
  "issues": [
    {
      "userId": "user_123",
      "userName": "Ashwini Kanaparthy",
      "email": "ashwini@example.com",
      "issues": {
        "phantomPositions": {
          "count": 6,
          "symbols": ["TSLA", "ARKK", "QQQ", "SPY", "FNGU", "UPRO"]
        }
      },
      "severity": "high"
    }
  ],
  "summary": {
    "critical": 1,
    "medium": 2,
    "low": 0
  }
}
```

### 2. **Automated Daily Cron**
**Endpoint:** `GET /api/cron/data-quality`  
**Schedule:** Daily at 2:00 AM UTC

Automatically scans all users and logs issues found. This runs **without manual intervention**.

**Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/data-quality",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Logs Example:**
```
[Cron: Data Quality] Starting daily health check...
[Cron: Data Quality] Scanned 45 users
[Cron: Data Quality] Found 3 users with phantom positions
[Cron: Data Quality] Users with issues: [
  {
    "userId": "user_123",
    "userName": "Ashwini Kanaparthy",
    "phantomCount": 6,
    "symbols": ["TSLA", "ARKK", "QQQ", "SPY", "FNGU", "UPRO"]
  }
]
```

### 3. **Admin Dashboard**
**URL:** `/admin/data-health`

Visual interface for admins to:
- Run health checks on-demand
- View all users with data quality issues
- See severity classification
- Understand issue details (which symbols, how many, etc.)

**Features:**
- ✅ Real-time health check execution
- ✅ Severity indicators (High/Medium/Low)
- ✅ Detailed issue breakdown per user
- ✅ Summary metrics dashboard
- ✅ Last scan timestamp

---

## How It Works

### Detection: Phantom Positions

```typescript
// For each user's trades grouped by symbol:
const hasBuys = trades.some(t => action.includes('BUY'));
const hasSells = trades.some(t => action.includes('SELL'));

let netQty = 0;
for (const trade of trades) {
    if (isBuy) netQty += qty;
    else if (isSell) netQty -= qty;
}

// Phantom if: sells without buys + net short
if (!hasBuys && hasSells && netQty < 0) {
    // This is a phantom position!
    phantomSymbols.push(symbol);
}
```

**Why This Works:**
- Real short positions have BUY trades (to open short)
- Phantom positions only have SELLs (from liquidation)
- Net negative + no buys = missing historical data

---

## Usage

### For Admins

**Run On-Demand Check:**
1. Go to `/admin/data-health`
2. Click "Run Health Check"
3. Review issues found

**View Automated Reports:**
- Check Vercel logs daily at 2 AM UTC
- Search for `[Cron: Data Quality]`

**Manual API Call:**
```bash
curl https://your-app.vercel.app/api/admin/data-health-check
```

### For Developers

**Add New Detection Heuristic:**

Edit `/api/admin/data-health-check/route.ts`:
```typescript
// Add new check
const duplicateTrades = symbolTrades.filter((t, i, arr) => 
    arr.findIndex(x => x.snapTradeTradeId === t.snapTradeTradeId) !== i
);

if (duplicateTrades.length > 0) {
    issues.duplicateTrades = {
        count: duplicateTrades.length
    };
    severity = 'high';
}
```

**Test Locally:**
```bash
# Run health check
npx tsx scripts/diagnose-orphaned-trades.ts "Username"

# Verify live positions
npx tsx scripts/verify-live-positions.ts "Username"
```

---

## Handling Issues

### When Phantom Positions Detected

**Option 1: Already Fixed (Current)**
The FIFO engine now **automatically filters** phantom positions. They won't show in:
- Dashboard open positions
- P&L calculations
- Positions table

**Option 2: Manual Cleanup (Future)**
Add admin button to:
- Mark phantom positions as "archived"
- Create synthetic closing trades at $0
- Add to permanent blocklist

**Option 3: User Notification**
Notify user:
> "We detected incomplete trade history for your account. Some positions from before [DATE] are excluded from calculations. For complete history, please manually add opening trades or contact support."

---

## Monitoring & Alerts

### Current State
✅ Daily automated scans  
✅ Issue logging  
✅ Admin dashboard  

### Future Enhancements

**Email Alerts (TODO):**
```typescript
if (issues.length > 5) {
    await sendEmail({
        to: 'admin@yourapp.com',
        subject: 'Data Quality Alert: High Issue Count',
        body: `Found ${issues.length} users with critical data issues`
    });
}
```

**Slack Notifications (TODO):**
```typescript
await fetch('https://hooks.slack.com/...', {
    method: 'POST',
    body: JSON.stringify({
        text: `🚨 Data Quality Alert: ${issues.length} users need review`
    })
});
```

---

## Configuration

### Environment Variables

Add to `.env`:
```bash
# Required for cron authentication
CRON_SECRET=your-secret-key-here

# Optional: Email alerts
RESEND_API_KEY=your-resend-key

# Optional: Slack alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Vercel Cron Setup

Set environment variable in Vercel project:
```
CRON_SECRET=<generate-random-secret>
```

Verify cron is scheduled:
```bash
vercel env ls
```

---

## Testing

**Manual Health Check:**
```bash
# Test endpoint locally
curl http://localhost:3000/api/admin/data-health-check

# Test in production
curl https://your-app.vercel.app/api/admin/data-health-check
```

**Test Cron Locally:**
```bash
# Set auth header
export AUTHORIZATION="Bearer your-cron-secret"

# Call endpoint
curl -H "Authorization: $AUTHORIZATION" \
  http://localhost:3000/api/cron/data-quality
```

**Verify Cron Execution:**
Check Vercel logs after 2 AM UTC for:
```
[Cron: Data Quality] Starting daily health check...
```

---

## Metrics

Track these over time:

| Metric | Target | Status |
|--------|--------|--------|
| Users scanned daily | 100% | ✅ |
| Critical issues | < 5% | Monitor |
| Medium issues | < 10% | Monitor |
| Response time | < 30s | ✅ |

---

## Summary

**Before:** Reactive - wait for user complaints  
**After:** Proactive - detect and log issues automatically

**Benefits:**
1. ✅ Early detection (before user notices)
2. ✅ Automated monitoring (no manual work)
3. ✅ Admin visibility (clear dashboard)
4. ✅ Severity classification (prioritize critical issues)
5. ✅ Audit trail (logs for debugging)

**Next Steps:**
1. Monitor for 1 week, review daily logs
2. Add email alerts for critical issues (>5 users)
3. Build auto-fix workflow for phantom positions
4. Create user-facing data quality report
