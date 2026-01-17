# Project Skills: Artha (Pravaha)

This project uses specialized agent instructions located in the `.agent/skills/` directory.

## Available Skills

### 1. Trading Journal Management
**Location**: `.agent/skills/trading-journal/SKILL.md`
**Description**: Handles FIFO P&L calculations, SnapTrade synchronization logic, and database integrity safeguards.

---

## Key Knowledge Areas

### FIFO Engine
- Logic for matching buy/sell orders.
- Options contract multipliers (100x).
- Handling of Assignment, Exercises, and Expirations.

### SnapTrade Integration
- 3-year historical sync window.
- Encrypted credential management.
- Activity vs. Transaction mapping.

### Infrastructure
- Supabase/Prisma with PgBouncer optimization.
- NextAuth JWT session strategy.
- Vercel deployment patterns for Edge/Serverless.
