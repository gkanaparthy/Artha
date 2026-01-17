# P&L Calculator Script

A reusable FIFO-based P&L calculator for the Artha trading journal. This script uses the same FIFO lot matching engine as the metrics API to ensure accurate P&L calculations.

## Features

- ✅ **FIFO lot matching** with proper contract multipliers for options (100x) and stocks (1x)
- ✅ **Flexible user identification** by email, name, or ID
- ✅ **Customizable date ranges** (defaults to YTD if not specified)
- ✅ **JSON output** for backend integration
- ✅ **Comprehensive reporting** including monthly breakdown, top winners/losers
- ✅ **Automatic deduplication** using SnapTrade trade IDs
- ✅ **Expired options handling** with auto-close at $0

## Usage

### Basic YTD P&L Calculation

```bash
# By user name (partial match)
npx tsx scripts/calculate-ytd-pnl.ts --user "suman"

# By email
npx tsx scripts/calculate-ytd-pnl.ts --user "spulusu@gmail.com"

# By user ID
npx tsx scripts/calculate-ytd-pnl.ts --user "cmkhti6uu0000111l52rekv5x"
```

### Custom Date Range

```bash
# Calculate P&L for January 2026
npx tsx scripts/calculate-ytd-pnl.ts --user "suman" --startDate "2026-01-01" --endDate "2026-01-31"

# Calculate P&L for all of 2025
npx tsx scripts/calculate-ytd-pnl.ts --user "suman" --startDate "2025-01-01" --endDate "2025-12-31"
```

### JSON Output (for backend integration)

```bash
# Get JSON output
npx tsx scripts/calculate-ytd-pnl.ts --user "suman" --json

# Custom date range with JSON
npx tsx scripts/calculate-ytd-pnl.ts --user "suman" --startDate "2026-01-01" --endDate "2026-01-10" --json
```

## Command-Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--user` | `-u` | User identifier (email, name, or ID) | **Required** |
| `--startDate` | `-s` | Start date (YYYY-MM-DD format) | Start of current year |
| `--endDate` | `-e` | End date (YYYY-MM-DD format) | Today |
| `--json` | `-j` | Output as JSON instead of human-readable format | `false` |
| `--help` | `-h` | Show help message | - |

## Output Format

### Human-Readable Output

```
═══════════════════════════════════════════════════════════
  P&L REPORT FOR SUMAN PULUSU
  YTD 2026
═══════════════════════════════════════════════════════════

💰 Total P&L: $9793.07
   📈 Stock P&L:  $0.00 (0 trades)
   📊 Option P&L: $9793.07 (209 trades)
   🔢 Total Trades: 209

📅 Monthly Breakdown:
───────────────────────────────────────────────────────────
   ✅ 2026-01: $9793.07

🏆 Top 5 Winners:
───────────────────────────────────────────────────────────
   1. SPXW  260106C06930000: $1111.78 (Closed: 2026-01-06)
   2. SPXW  260107C06960000: $989.72 (Closed: 2026-01-07)
   ...

💔 Top 5 Losers:
───────────────────────────────────────────────────────────
   1. SPXW  260102C06900000: $-1902.05 (Closed: 2026-01-02)
   2. SPXW  260113C06980000: $-1802.05 (Closed: 2026-01-13)
   ...
```

### JSON Output

```json
{
  "user": {
    "id": "cmkhti6uu0000111l52rekv5x",
    "name": "suman pulusu",
    "email": "spulusu@gmail.com"
  },
  "period": {
    "startDate": "2026-01-01",
    "endDate": "2026-01-17",
    "label": "YTD 2026"
  },
  "summary": {
    "totalPnL": 9793.07,
    "stockPnL": 0,
    "optionPnL": 9793.07,
    "totalTrades": 209,
    "stockTrades": 0,
    "optionTrades": 209
  },
  "monthly": [
    {
      "month": "2026-01",
      "pnl": 9793.07
    }
  ],
  "topWinners": [
    {
      "symbol": "SPXW  260106C06930000",
      "pnl": 1111.78,
      "closedAt": "2026-01-06"
    }
  ],
  "topLosers": [
    {
      "symbol": "SPXW  260102C06900000",
      "pnl": -1902.05,
      "closedAt": "2026-01-02"
    }
  ]
}
```

## Integration with Backend

You can call this script from your backend code to generate P&L reports:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getUserPnL(userIdentifier: string, startDate?: string, endDate?: string) {
  let command = `npx tsx scripts/calculate-ytd-pnl.ts --user "${userIdentifier}" --json`;
  
  if (startDate) command += ` --startDate "${startDate}"`;
  if (endDate) command += ` --endDate "${endDate}"`;
  
  const { stdout } = await execAsync(command);
  return JSON.parse(stdout);
}

// Usage
const report = await getUserPnL('suman@example.com');
console.log(`Total P&L: $${report.summary.totalPnL}`);
```

## How It Works

1. **User Lookup**: Searches for the user by email, name (partial match), or ID
2. **Trade Fetching**: Retrieves ALL trades for the user (FIFO requires complete history)
3. **FIFO Processing**: Matches trades using First-In-First-Out lot matching
4. **Date Filtering**: Filters closed trades by the specified date range
5. **Aggregation**: Calculates totals, breakdowns by asset type, monthly performance, etc.
6. **Output**: Returns either JSON or human-readable format

## Notes

- The script uses the same FIFO logic as `/api/metrics` to ensure consistency
- Contract multipliers are automatically detected (100 for options, 1 for stocks)
- Expired options are automatically closed at $0
- Trades are deduplicated using `snapTradeTradeId`
- Only trades with valid `snapTradeTradeId` are included in calculations
