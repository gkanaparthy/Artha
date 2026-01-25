---
name: snaptrade-integration-validator
description: Validate SnapTrade SDK usage patterns and field access. Checks for snake_case fields, proper option detection, contract multipliers, and authorization handling.
argument-hint: <file-or-pattern>
---

# SnapTrade Integration Validator

Validates proper usage of the SnapTrade SDK in the Artha Trading Journal. The SnapTrade API has specific patterns and gotchas that this skill helps enforce.

## When to Use

**ALWAYS run this skill when:**
- Modifying `src/lib/services/snaptrade.service.ts`
- Adding new SnapTrade API calls
- Working with trade sync logic
- Handling broker connections or authorizations
- Debugging SnapTrade integration issues

**Invoke manually:**
```bash
/snaptrade-integration-validator src/lib/services/snaptrade.service.ts
/snaptrade-integration-validator src/app/api/trades/sync/route.ts
/snaptrade-integration-validator src/app/api/accounts/**/*.ts
```

## Critical Rules

### Rule 1: Snake_Case Field Access
**Severity:** CRITICAL 🔴

The SnapTrade SDK returns `snake_case` fields, NOT `camelCase`. This is a common source of bugs.

**✅ CORRECT:**
```typescript
// Trade fields
trade.option_symbol      // ✅ Correct
trade.trade_date         // ✅ Correct
trade.settlement_date    // ✅ Correct
trade.option_type        // ✅ Correct

// Option symbol fields
trade.option_symbol.option_type        // ✅ CALL or PUT
trade.option_symbol.strike_price       // ✅ Correct
trade.option_symbol.expiration_date    // ✅ Correct
trade.option_symbol.is_mini_option     // ✅ Correct
trade.option_symbol.ticker             // ✅ OCC symbol
trade.option_symbol.underlying_symbol  // ✅ Underlying ticker

// Account fields
account.brokerage_authorization  // ✅ Authorization ID
account.sync_status              // ✅ Sync status

// Authorization fields
auth.brokerage.name    // ✅ Broker name
auth.brokerage.slug    // ✅ Broker identifier
auth.disabled          // ✅ Connection status
```

**❌ INCORRECT:**
```typescript
// These fields DO NOT EXIST in SnapTrade responses!
trade.optionSymbol      // ❌ Wrong
trade.tradeDate         // ❌ Wrong
trade.settlementDate    // ❌ Wrong
trade.optionType        // ❌ Wrong (exists in our DB, not SnapTrade)

trade.optionSymbol.optionType     // ❌ Wrong
trade.optionSymbol.strikePrice    // ❌ Wrong
trade.optionSymbol.expirationDate // ❌ Wrong
trade.optionSymbol.isMiniOption   // ❌ Wrong
```

**TypeScript Type Definitions:**
```typescript
// Always use SnapTrade's generated types
import type { Trade as SnapTradeTrade } from 'snaptrade-typescript-sdk';

// Access fields via snake_case
const processSnapTradeTrade = (trade: SnapTradeTrade) => {
  const date = trade.trade_date;        // ✅ Correct
  const symbol = trade.option_symbol;   // ✅ Correct
  // ...
};
```

---

### Rule 2: Option vs Stock Detection
**Severity:** CRITICAL 🔴

Properly detect whether a trade is an option or stock using the `option_symbol` field.

**✅ CORRECT:**
```typescript
// Detect option trade
const isOption = !!trade.option_symbol; // ✅ Correct

if (isOption) {
  const symbol = trade.option_symbol.ticker; // ✅ OCC symbol
  const optionType = trade.option_symbol.option_type; // ✅ CALL or PUT
  const strikePrice = trade.option_symbol.strike_price;
  const expiryDate = trade.option_symbol.expiration_date;
} else {
  const symbol = trade.symbol?.symbol; // ✅ Stock ticker
}
```

**❌ INCORRECT:**
```typescript
// Don't check action or type fields
const isOption = trade.option_type !== null; // ❌ Wrong field
const isOption = trade.action.includes('OPTION'); // ❌ Unreliable

// Don't assume symbol format
const isOption = trade.symbol.includes('C') || trade.symbol.includes('P'); // ❌ Wrong
```

---

### Rule 3: Contract Multiplier
**Severity:** HIGH 🟡

Options have a contract multiplier (100 for standard, 10 for mini). Stocks have multiplier 1.

**✅ CORRECT:**
```typescript
const isOption = !!trade.option_symbol;

const contractMultiplier = isOption
  ? (trade.option_symbol.is_mini_option ? 10 : 100)
  : 1;

// Calculate total value
const totalValue = trade.price * trade.units * contractMultiplier;

// Store in database
await prisma.trade.create({
  data: {
    // ... other fields
    contractMultiplier,
    totalValue,
  },
});
```

**❌ INCORRECT:**
```typescript
// Hardcoding multiplier
const contractMultiplier = 100; // ❌ Ignores mini options

// Forgetting multiplier entirely
const totalValue = trade.price * trade.units; // ❌ Wrong for options

// Using wrong field
const multiplier = trade.contract_size; // ❌ Field doesn't exist
```

**Mini Options:**
Mini options have 10 shares per contract instead of 100. Common examples:
- Mini SPX options (XSP)
- Some ETF options

```typescript
if (trade.option_symbol?.is_mini_option) {
  console.log('Mini option detected - 10x multiplier');
}
```

---

### Rule 4: Authorization vs Account Relationship
**Severity:** CRITICAL 🔴

**Key Concept:** One authorization (OAuth connection) can have MULTIPLE accounts (e.g., 3 Schwab accounts).

**✅ CORRECT:**
```typescript
// ALWAYS match accounts to authorizations using brokerage_authorization field
const matchAccountToAuthorization = (
  accounts: SnapTradeAccount[],
  auth: BrokerageAuthorization
) => {
  // ✅ Correct: Direct authorization ID match
  const matchedAccounts = accounts.filter(
    acc => acc.brokerage_authorization === auth.id
  );

  return matchedAccounts; // Can be multiple accounts!
};
```

**❌ INCORRECT:**
```typescript
// ❌ WRONG: Matching by broker name fails for multi-account users
const matchAccountToAuthorization = (
  accounts: SnapTradeAccount[],
  auth: BrokerageAuthorization
) => {
  // ❌ This matches ALL Schwab accounts to the FIRST Schwab auth
  const matchedAccount = accounts.find(
    acc => acc.institution === auth.brokerage.name
  );

  return matchedAccount; // ❌ Wrong account!
};
```

**Relationship Diagram:**
```
Authorization (OAuth Connection)
├─ Account 1 (Personal)
├─ Account 2 (IRA)
└─ Account 3 (Rollover)
   ↓
All 3 accounts share: brokerage_authorization = "auth-id-123"
```

**Example: Handling disabled connections**
```typescript
// ✅ CORRECT: Loop through accounts, not authorizations
for (const account of accounts) {
  const auth = authorizations.find(
    a => a.id === account.brokerage_authorization
  );

  if (!auth) {
    console.warn(`No authorization found for account ${account.id}`);
    continue;
  }

  if (auth.disabled) {
    await markAccountAsDisabled(account.id);
  }
}
```

---

### Rule 5: Option Action Types
**Severity:** MEDIUM 🟡

SnapTrade uses specific action types for options. Map them correctly.

**SnapTrade Option Actions:**
```typescript
// Opening positions
'BUY_TO_OPEN'   // Long call or long put
'SELL_TO_OPEN'  // Short call or short put (naked)

// Closing positions
'SELL_TO_CLOSE' // Close long position
'BUY_TO_CLOSE'  // Close short position
```

**✅ CORRECT:**
```typescript
const determinePositionSide = (action: string, optionType: string) => {
  if (action === 'BUY_TO_OPEN') {
    return optionType === 'CALL' ? 'LONG_CALL' : 'LONG_PUT';
  }
  if (action === 'SELL_TO_OPEN') {
    return optionType === 'CALL' ? 'SHORT_CALL' : 'SHORT_PUT';
  }
  if (action === 'SELL_TO_CLOSE') {
    return 'CLOSING_LONG';
  }
  if (action === 'BUY_TO_CLOSE') {
    return 'CLOSING_SHORT';
  }

  // Handle generic BUY/SELL (stock trades)
  return action;
};
```

**Special Case: Option Expiration**
```typescript
if (trade.action === 'OPTIONEXPIRATION') {
  // Negative quantity = closing long position (worthless)
  // Positive quantity = closing short position (assigned)
  const wasLong = trade.units < 0;
  const wasShort = trade.units > 0;
}
```

---

### Rule 6: OCC Symbol Fallback Detection
**Severity:** MEDIUM 🟡

Some brokers return raw OCC symbols instead of structured option data. Detect and handle this.

**OCC Symbol Format:**
```
SPXW  260105C06920000
│     │  │ │  │
│     │  │ │  └─ Strike price (6920.000)
│     │  │ └──── Option type (C=Call, P=Put)
│     │  └────── Expiration (26-01-05)
│     └────────── Year (2026)
└──────────────── Underlying (SPXW)
```

**✅ CORRECT:**
```typescript
const parseOCCSymbol = (symbol: string): boolean => {
  // OCC options are typically 18-21 characters
  // Format: TICKER + YY + MM + DD + C/P + STRIKE (8 digits)

  const occPattern = /^[A-Z]{1,6}\s*\d{6}[CP]\d{8}$/;

  if (occPattern.test(symbol.replace(/\s+/g, ''))) {
    console.log('Detected raw OCC symbol:', symbol);
    return true; // Treat as option with 100x multiplier
  }

  return false;
};

// In trade processing
if (!trade.option_symbol && parseOCCSymbol(trade.symbol?.symbol || '')) {
  // Fallback: treat as standard option
  contractMultiplier = 100;
  type = 'OPTION';
}
```

---

### Rule 7: Trade Deduplication
**Severity:** HIGH 🟡

Prevent duplicate trade syncs using `snapTradeTradeId` and content hash.

**✅ CORRECT:**
```typescript
import crypto from 'crypto';

const generateTradeHash = (trade: SnapTradeTrade): string => {
  const content = JSON.stringify({
    symbol: trade.symbol?.symbol,
    optionSymbol: trade.option_symbol?.ticker,
    action: trade.action,
    price: trade.price,
    units: trade.units,
    tradeDate: trade.trade_date,
  });

  return crypto.createHash('sha256').update(content).digest('hex');
};

// Before inserting
const existing = await prisma.trade.findFirst({
  where: {
    OR: [
      { snapTradeTradeId: trade.id },
      { contentHash: generateTradeHash(trade) },
    ],
  },
});

if (existing) {
  console.log('Duplicate trade detected, skipping:', trade.id);
  return;
}

// Insert with deduplication fields
await prisma.trade.create({
  data: {
    // ... other fields
    snapTradeTradeId: trade.id,
    contentHash: generateTradeHash(trade),
  },
});
```

---

### Rule 8: Error Handling
**Severity:** MEDIUM 🟡

Handle SnapTrade API errors gracefully and log useful context.

**✅ CORRECT:**
```typescript
try {
  const activities = await snapTrade.accountInformation.getAllUserHoldings({
    userId: snapTradeUserId,
    userSecret: decryptedSecret,
  });

  return activities.data;
} catch (error) {
  console.error('SnapTrade API error:', {
    userId: snapTradeUserId,
    endpoint: 'getAllUserHoldings',
    error: error instanceof Error ? error.message : String(error),
  });

  // Check for specific error types
  if (error?.response?.status === 401) {
    throw new Error('SnapTrade authentication failed - connection may be disabled');
  }

  if (error?.response?.status === 429) {
    throw new Error('SnapTrade rate limit exceeded');
  }

  throw error; // Re-throw for upstream handling
}
```

**❌ INCORRECT:**
```typescript
// Silent failure
try {
  await snapTrade.accountInformation.getAllUserHoldings(...);
} catch {
  return []; // ❌ Hides errors!
}

// Vague error
try {
  await snapTrade.accountInformation.getAllUserHoldings(...);
} catch (error) {
  throw new Error('API failed'); // ❌ No context!
}
```

---

## Common Mistakes

### 1. Using camelCase Instead of snake_case
```typescript
// ❌ WRONG - Field doesn't exist
const date = trade.tradeDate;

// ✅ CORRECT
const date = trade.trade_date;
```

### 2. Ignoring Mini Options
```typescript
// ❌ WRONG - All options get 100x
const multiplier = trade.option_symbol ? 100 : 1;

// ✅ CORRECT
const multiplier = trade.option_symbol
  ? (trade.option_symbol.is_mini_option ? 10 : 100)
  : 1;
```

### 3. Matching Authorizations by Name
```typescript
// ❌ WRONG - Fails for multi-account users
const auth = authorizations.find(
  a => a.brokerage.name === account.institution
);

// ✅ CORRECT - Use direct ID relationship
const auth = authorizations.find(
  a => a.id === account.brokerage_authorization
);
```

### 4. Not Handling Option Expiration
```typescript
// ❌ WRONG - Ignores OPTIONEXPIRATION action
if (trade.action === 'BUY' || trade.action === 'SELL') {
  // ... only handles these two
}

// ✅ CORRECT - Handle all action types
const ACTION_TYPES = [
  'BUY', 'SELL',
  'BUY_TO_OPEN', 'SELL_TO_OPEN',
  'BUY_TO_CLOSE', 'SELL_TO_CLOSE',
  'OPTIONEXPIRATION',
  // ... etc
];
```

---

## Testing SnapTrade Integration

### Manual Testing
```typescript
// Test with a variety of trade types
const testCases = [
  { type: 'stock', symbol: 'AAPL', action: 'BUY' },
  { type: 'option', symbol: 'AAPL 260117C00150000', action: 'BUY_TO_OPEN' },
  { type: 'mini_option', symbol: 'XSP 260117C00500000', action: 'SELL_TO_OPEN' },
  { type: 'expiration', symbol: 'SPY 251219P00450000', action: 'OPTIONEXPIRATION' },
];
```

### Field Validation
```typescript
// Check for undefined fields (indicates wrong field name)
const validateSnapTradeFields = (trade: any) => {
  const required = [
    'trade_date',
    'settlement_date',
    'action',
    'price',
    'units',
  ];

  for (const field of required) {
    if (trade[field] === undefined) {
      console.error(`Missing field: ${field}`);
      console.log('Available fields:', Object.keys(trade));
    }
  }
};
```

### Authorization Testing
```typescript
// Verify authorization-to-account mapping
const testAuthMapping = async () => {
  const authorizations = await snapTrade.connections.listBrokerageAuthorizations(...);
  const accounts = await snapTrade.accountInformation.getAllUserHoldings(...);

  for (const auth of authorizations.data || []) {
    const matchedAccounts = accounts.data?.filter(
      acc => acc.brokerage_authorization === auth.id
    );

    console.log(`Authorization ${auth.id} (${auth.brokerage.name}):`);
    console.log(`  Matched accounts: ${matchedAccounts?.length}`);
    matchedAccounts?.forEach(acc => {
      console.log(`    - ${acc.number} (${acc.name})`);
    });
  }
};
```

---

## References

- [SnapTrade API Documentation](https://docs.snaptrade.com)
- [SnapTrade TypeScript SDK](https://github.com/passiv/snaptrade-sdks/tree/master/sdks/typescript)
- [CLAUDE.md SnapTrade Integration](../../CLAUDE.md#snaptrade-api-integration)
- [OCC Symbol Format](https://www.theocc.com/Company-Information/Documents-and-Archives/Options-Symbology-Initiative)
- [Artha SnapTrade Service](../../src/lib/services/snaptrade.service.ts)

---

## Quick Reference Card

```typescript
// Field Access (snake_case!)
trade.option_symbol.option_type     // CALL or PUT
trade.option_symbol.strike_price    // Number
trade.option_symbol.expiration_date // ISO date string
trade.option_symbol.is_mini_option  // Boolean
trade.option_symbol.ticker          // OCC symbol
trade.trade_date                    // ISO date string
trade.settlement_date               // ISO date string

// Option Detection
const isOption = !!trade.option_symbol;

// Contract Multiplier
const multiplier = isOption
  ? (trade.option_symbol.is_mini_option ? 10 : 100)
  : 1;

// Symbol Selection
const symbol = isOption
  ? trade.option_symbol.ticker
  : trade.symbol?.symbol;

// Authorization Matching
const auth = authorizations.find(
  a => a.id === account.brokerage_authorization
);
```

---

**Skill Version:** 1.0
**Last Updated:** 2026-01-25
**Maintained By:** Artha Development Team
