# Artha Debug SQL Queries

A collection of useful SQL queries for debugging users, trades, subscriptions, and broker connections.

---

## 🔍 User Lookup

### Find user by email or name
```sql
SELECT 
  id,
  name,
  email,
  "subscriptionStatus",
  "subscriptionPlan",
  "isGrandfathered",
  "isFounder",
  "founderNumber",
  "trialEndsAt",
  "stripeCustomerId",
  "onboardingCompleted",
  "createdAt"
FROM "User"
WHERE email ILIKE '%searchterm%' 
   OR name ILIKE '%searchterm%';
```

### Full user profile with subscription details
```sql
SELECT 
  id,
  name,
  email,
  "subscriptionStatus",
  "subscriptionPlan",
  "subscriptionTier",
  "isFounder",
  "founderNumber",
  "isGrandfathered",
  "grandfatheredReason",
  "trialStartedAt",
  "trialEndsAt",
  "currentPeriodEnd",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "lifetimePurchasedAt",
  "lifetimeAmount",
  "onboardingCompleted",
  "createdAt"
FROM "User"
WHERE email = 'user@example.com';
```

---

## 📊 Trades & Positions

### All trades for a user (by email)
```sql
SELECT 
  t.id,
  t.symbol,
  t.action,
  t.quantity,
  t.price,
  t.type,
  t."optionType",
  t."strikePrice",
  t."expiryDate",
  t.fees,
  t.timestamp,
  t."positionKey",
  ba."brokerName",
  ba."accountNumber"
FROM trades t
JOIN broker_accounts ba ON t."accountId" = ba.id
JOIN "User" u ON ba."userId" = u.id
WHERE u.email = 'user@example.com'
ORDER BY t.timestamp DESC
LIMIT 100;
```

### Trade count and P&L summary by user
```sql
SELECT 
  u.email,
  u.name,
  COUNT(t.id) as trade_count,
  COUNT(DISTINCT t.symbol) as unique_symbols,
  MIN(t.timestamp) as first_trade,
  MAX(t.timestamp) as last_trade
FROM "User" u
JOIN broker_accounts ba ON ba."userId" = u.id
JOIN trades t ON t."accountId" = ba.id
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.email, u.name;
```

### Trades for a specific symbol
```sql
SELECT 
  t.id,
  t.symbol,
  t.action,
  t.quantity,
  t.price,
  t.type,
  t.timestamp,
  t."positionKey"
FROM trades t
JOIN broker_accounts ba ON t."accountId" = ba.id
JOIN "User" u ON ba."userId" = u.id
WHERE u.email = 'user@example.com'
  AND t.symbol ILIKE '%AAPL%'
ORDER BY t.timestamp DESC;
```

### Open positions (trades without closing)
```sql
SELECT 
  t."positionKey",
  t.symbol,
  SUM(CASE WHEN t.action = 'BUY' THEN t.quantity ELSE -t.quantity END) as net_quantity,
  COUNT(*) as trade_count
FROM trades t
JOIN broker_accounts ba ON t."accountId" = ba.id
JOIN "User" u ON ba."userId" = u.id
WHERE u.email = 'user@example.com'
GROUP BY t."positionKey", t.symbol
HAVING SUM(CASE WHEN t.action = 'BUY' THEN t.quantity ELSE -t.quantity END) != 0;
```

---

## 🏦 Broker Accounts

### All broker accounts for a user
```sql
SELECT 
  ba.id,
  ba."brokerName",
  ba."accountNumber",
  ba."snapTradeAccountId",
  ba.disabled,
  ba."disabledReason",
  ba."lastSyncedAt",
  ba."createdAt",
  COUNT(t.id) as trade_count
FROM broker_accounts ba
JOIN "User" u ON ba."userId" = u.id
LEFT JOIN trades t ON t."accountId" = ba.id
WHERE u.email = 'user@example.com'
GROUP BY ba.id
ORDER BY ba."createdAt" DESC;
```

### Broker accounts with sync issues
```sql
SELECT 
  u.email,
  u.name,
  ba."brokerName",
  ba."accountNumber",
  ba.disabled,
  ba."disabledReason",
  ba."lastSyncedAt",
  ba."lastCheckedAt"
FROM broker_accounts ba
JOIN "User" u ON ba."userId" = u.id
WHERE ba.disabled = true
   OR ba."lastSyncedAt" < NOW() - INTERVAL '7 days'
ORDER BY ba."lastSyncedAt" ASC NULLS FIRST;
```

---

## 💳 Subscription & Billing

### Subscription status overview
```sql
SELECT 
  "subscriptionStatus",
  COUNT(*) as user_count
FROM "User"
GROUP BY "subscriptionStatus"
ORDER BY user_count DESC;
```

### Active subscribers
```sql
SELECT 
  email,
  name,
  "subscriptionStatus",
  "subscriptionPlan",
  "subscriptionTier",
  "isFounder",
  "founderNumber",
  "currentPeriodEnd",
  "stripeCustomerId"
FROM "User"
WHERE "subscriptionStatus" IN ('ACTIVE', 'TRIALING', 'LIFETIME', 'GRANDFATHERED')
ORDER BY "createdAt" DESC;
```

### Users with trial ending soon (next 7 days)
```sql
SELECT 
  email,
  name,
  "subscriptionStatus",
  "trialEndsAt",
  EXTRACT(DAY FROM "trialEndsAt" - NOW()) as days_remaining
FROM "User"
WHERE "subscriptionStatus" = 'TRIALING'
  AND "trialEndsAt" BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY "trialEndsAt" ASC;
```

### Payment history for a user
```sql
SELECT 
  ph.amount,
  ph.currency,
  ph.status,
  ph.description,
  ph."stripePaymentId",
  ph."createdAt"
FROM payment_history ph
JOIN "User" u ON ph."userId" = u.id
WHERE u.email = 'user@example.com'
ORDER BY ph."createdAt" DESC;
```

### Subscription events for a user
```sql
SELECT 
  se."eventType",
  se."eventData",
  se."stripeEventId",
  se."createdAt"
FROM subscription_events se
JOIN "User" u ON se."userId" = u.id
WHERE u.email = 'user@example.com'
ORDER BY se."createdAt" DESC
LIMIT 20;
```

### Lifetime deal purchasers
```sql
SELECT 
  email,
  name,
  "lifetimePurchasedAt",
  "lifetimeAmount",
  "isFounder",
  "founderNumber"
FROM "User"
WHERE "subscriptionStatus" = 'LIFETIME'
ORDER BY "lifetimePurchasedAt" DESC;
```

### Grandfathered users
```sql
SELECT 
  email,
  name,
  "grandfatheredAt",
  "grandfatheredReason",
  "createdAt"
FROM "User"
WHERE "isGrandfathered" = true
ORDER BY "grandfatheredAt" DESC;
```

---

## 🏷️ Tags & Psychology

### Tags for a user's positions
```sql
SELECT 
  pt."positionKey",
  td.name as tag_name,
  td.category,
  td.color,
  pt."createdAt"
FROM position_tags pt
JOIN tag_definitions td ON pt."tagDefinitionId" = td.id
JOIN "User" u ON pt."userId" = u.id
WHERE u.email = 'user@example.com'
ORDER BY pt."createdAt" DESC;
```

### Tag usage summary
```sql
SELECT 
  td.name,
  td.category,
  COUNT(pt.id) as usage_count
FROM tag_definitions td
JOIN "User" u ON td."userId" = u.id
LEFT JOIN position_tags pt ON pt."tagDefinitionId" = td.id
WHERE u.email = 'user@example.com'
GROUP BY td.id, td.name, td.category
ORDER BY usage_count DESC;
```

### Most common mistakes (MISTAKE tags)
```sql
SELECT 
  td.name,
  COUNT(pt.id) as count
FROM tag_definitions td
JOIN position_tags pt ON pt."tagDefinitionId" = td.id
WHERE td.category = 'MISTAKE'
GROUP BY td.id, td.name
ORDER BY count DESC
LIMIT 10;
```

---

## 🔧 Admin & Debugging

### Users who signed up recently (last 7 days)
```sql
SELECT 
  email,
  name,
  "subscriptionStatus",
  "onboardingCompleted",
  "createdAt"
FROM "User"
WHERE "createdAt" > NOW() - INTERVAL '7 days'
ORDER BY "createdAt" DESC;
```

### Users with most trades
```sql
SELECT 
  u.email,
  u.name,
  u."subscriptionStatus",
  COUNT(t.id) as trade_count
FROM "User" u
JOIN broker_accounts ba ON ba."userId" = u.id
JOIN trades t ON t."accountId" = ba.id
GROUP BY u.id, u.email, u.name, u."subscriptionStatus"
ORDER BY trade_count DESC
LIMIT 20;
```

### Duplicate trades check
```sql
SELECT 
  t.symbol,
  t.timestamp,
  t.action,
  t.quantity,
  t.price,
  COUNT(*) as duplicates
FROM trades t
GROUP BY t.symbol, t.timestamp, t.action, t.quantity, t.price
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;
```

### Check SnapTrade connection status
```sql
SELECT 
  u.email,
  u.name,
  u."snapTradeUserId" IS NOT NULL as has_snaptrade,
  COUNT(ba.id) as broker_count,
  COUNT(ba.id) FILTER (WHERE ba.disabled = false) as active_brokers
FROM "User" u
LEFT JOIN broker_accounts ba ON ba."userId" = u.id
WHERE u.email = 'user@example.com'
GROUP BY u.id, u.email, u.name, u."snapTradeUserId";
```

### Recent sync activity
```sql
SELECT 
  u.email,
  ba."brokerName",
  ba."lastSyncedAt",
  COUNT(t.id) FILTER (WHERE t."createdAt" > NOW() - INTERVAL '1 day') as trades_synced_today
FROM broker_accounts ba
JOIN "User" u ON ba."userId" = u.id
LEFT JOIN trades t ON t."accountId" = ba.id
WHERE ba."lastSyncedAt" > NOW() - INTERVAL '1 day'
GROUP BY u.id, u.email, ba.id, ba."brokerName", ba."lastSyncedAt"
ORDER BY ba."lastSyncedAt" DESC;
```

---

## 🚨 Quick Fixes

### Grant Pro access to a user
```sql
UPDATE "User"
SET 
  "subscriptionStatus" = 'GRANDFATHERED',
  "isGrandfathered" = true,
  "grandfatheredAt" = NOW(),
  "grandfatheredReason" = 'Manual grant by admin'
WHERE email = 'user@example.com';
```

### Extend trial by 14 days
```sql
UPDATE "User"
SET "trialEndsAt" = "trialEndsAt" + INTERVAL '14 days'
WHERE email = 'user@example.com';
```

### Reset a user's broker connection
```sql
UPDATE broker_accounts
SET 
  disabled = false,
  "disabledReason" = NULL,
  "disabledAt" = NULL
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'user@example.com');
```

### Delete all trades for a specific broker account (DANGEROUS!)
```sql
-- First, find the account ID
SELECT id, "brokerName", "accountNumber" 
FROM broker_accounts 
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'user@example.com');

-- Then delete (use with caution!)
-- DELETE FROM trades WHERE "accountId" = 'account-id-here';
```

---

## 📈 Analytics

### Daily active users (by trade activity)
```sql
SELECT 
  DATE(t.timestamp) as date,
  COUNT(DISTINCT ba."userId") as active_users,
  COUNT(t.id) as total_trades
FROM trades t
JOIN broker_accounts ba ON t."accountId" = ba.id
WHERE t.timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(t.timestamp)
ORDER BY date DESC;
```

### Subscription conversion funnel
```sql
SELECT 
  "subscriptionStatus",
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "User"
GROUP BY "subscriptionStatus"
ORDER BY count DESC;
```

### Revenue from lifetime deals
```sql
SELECT 
  COUNT(*) as lifetime_users,
  SUM("lifetimeAmount") as total_revenue,
  AVG("lifetimeAmount") as avg_amount
FROM "User"
WHERE "subscriptionStatus" = 'LIFETIME'
  AND "lifetimeAmount" IS NOT NULL;
```

---

## Usage Tips

1. **Replace `'user@example.com'`** with the actual user email
2. **Use `ILIKE` for case-insensitive search** with `%wildcards%`
3. **Always test SELECT before UPDATE/DELETE**
4. **Run dangerous queries in a transaction:**
   ```sql
   BEGIN;
   -- your query here
   -- check results
   ROLLBACK;  -- or COMMIT; if looks good
   ```
5. **Use `LIMIT` when exploring** to avoid large result sets
