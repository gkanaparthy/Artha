import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { applyRateLimit } from '@/lib/ratelimit';
import { validateTrade } from '@/lib/tradeValidation';
import { getAdapterById, type ParsedTrade } from '@/lib/services/csv-parsers';
import { tradeGroupingService } from '@/lib/services/trade-grouping.service';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const DEFAULT_MANUAL_ACCOUNT_KEY = 'manual';

function sanitizeAccountKey(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase();
  return sanitized || null;
}

function buildCompositeTradeKey(trade: {
  symbol: string;
  timestamp: Date;
  action: string;
  quantity: number;
  price: number;
}): string {
  return `${trade.symbol}|${trade.timestamp.getTime()}|${trade.action}|${trade.quantity}|${trade.price}`;
}

/**
 * POST /api/trades/import
 *
 * Import trades from a CSV file or manual entry.
 * Expects pre-parsed trade data from the client.
 *
 * Account identity strategy:
 *   CSV imports get a virtual BrokerAccount keyed by
 *   `manual-csv-{userId}-{brokerId}-{accountKey}` where accountKey is derived
 *   from the account number extracted from CSV rows, an explicit accountLabel
 *   from the user, or a per-import timestamp for fallback uniqueness.
 *   Manual entries instead reuse a stable per-user account key so separate
 *   submissions stay grouped together.
 *
 * Duplicate detection strategy:
 *   1. If trades carry a broker execution ID, dedup uses (accountId, executionId).
 *   2. Else falls back to (accountId, symbol, timestamp, action, quantity, price).
 *   3. Within a batch, identical composite keys are counted but NOT dropped
 *      (they may be real separate fills) — only cross-batch dupes are flagged.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 imports per hour
    const rateLimitResponse = await applyRateLimit(req, 'import');
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { brokerId, trades, accountLabel } = body as {
      brokerId: string;
      trades: ParsedTrade[];
      accountLabel?: string;
    };

    // ── Validation ──────────────────────────────────

    if (!brokerId || typeof brokerId !== 'string') {
      return NextResponse.json(
        { error: 'brokerId is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json(
        { error: 'trades array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (trades.length > 5000) {
      return NextResponse.json(
        {
          error:
            'Maximum 5,000 trades per import. Please split into multiple files.',
        },
        { status: 400 }
      );
    }

    // Resolve adapter for display name
    const isManualImport = brokerId === 'manual';
    const adapter = getAdapterById(brokerId);
    const brokerDisplayName = isManualImport
      ? 'Manual Trades'
      : adapter?.name || brokerId;

    // ── Determine account identity ──────────────
    // Priority: explicit accountLabel > accountNumber from CSV > stable manual key > per-import timestamp
    const csvAccountNumber = trades
      .find((t) => t.accountNumber)
      ?.accountNumber?.trim();
    const sanitizedAccountLabel = sanitizeAccountKey(accountLabel);
    const sanitizedCsvAccountNumber = sanitizeAccountKey(csvAccountNumber);
    const usesDefaultManualAccount =
      isManualImport && !sanitizedAccountLabel && !sanitizedCsvAccountNumber;
    const accountKey =
      sanitizedAccountLabel ||
      sanitizedCsvAccountNumber ||
      (usesDefaultManualAccount
        ? DEFAULT_MANUAL_ACCOUNT_KEY
        : `import-${Date.now()}`);

    const displayLabel =
      accountLabel?.trim() ||
      (csvAccountNumber
        ? `${brokerDisplayName} (${csvAccountNumber})`
        : brokerDisplayName);
    const snapTradeAccountId = `manual-csv-${userId}-${brokerId}-${accountKey}`;
    const accountSource = isManualImport ? 'MANUAL' : 'CSV';
    const storedAccountNumber = csvAccountNumber
      ? encrypt(csvAccountNumber)
      : null;

    let brokerAccount = usesDefaultManualAccount
      ? await prisma.brokerAccount.findFirst({
          where: {
            userId,
            source: 'MANUAL',
            disabled: false,
            snapTradeAccountId: {
              startsWith: `manual-csv-${userId}-manual-`,
            },
          },
          orderBy: { createdAt: 'asc' },
        })
      : null;

    if (!brokerAccount) {
      brokerAccount = await prisma.brokerAccount.findUnique({
        where: { snapTradeAccountId },
      });
    }

    if (!brokerAccount) {
      brokerAccount = await prisma.brokerAccount.create({
        data: {
          userId,
          snapTradeAccountId,
          brokerName: displayLabel,
          accountNumber: storedAccountNumber,
          source: accountSource,
          syncStatus: 'COMPLETED',
          lastSyncedAt: new Date(),
        },
      });
    }

    // ── Validate trades ──────────────────────────

    const validTrades: ParsedTrade[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];

      // Ensure timestamp is a Date object
      const timestamp = new Date(t.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push({ row: i + 1, message: `Invalid date: ${t.timestamp}` });
        continue;
      }

      const validation = validateTrade({
        symbol: t.symbol,
        timestamp,
        quantity: t.quantity,
        price: t.price,
        action: t.action,
      });

      if (!validation.valid) {
        errors.push({
          row: i + 1,
          message: validation.reason || 'Validation failed',
        });
        continue;
      }

      validTrades.push({ ...t, timestamp });
    }

    // ── Duplicate detection ──────────────

    // Fetch existing trades for this specific account
    const existingTrades = await prisma.trade.findMany({
      where: { accountId: brokerAccount.id },
      select: {
        symbol: true,
        timestamp: true,
        action: true,
        quantity: true,
        price: true,
        externalTradeId: true,
      },
    });

    // Two-tier dedup: execution ID first, composite key fallback
    const existingExecutionIds = new Set<string>();
    const existingByCompositeKey = new Map<string, number>(); // key -> count

    for (const t of existingTrades) {
      if (t.externalTradeId) {
        existingExecutionIds.add(t.externalTradeId);
      }
      const compositeKey = buildCompositeTradeKey({
        symbol: t.symbol,
        timestamp: new Date(t.timestamp),
        action: t.action,
        quantity: t.quantity,
        price: t.price,
      });
      existingByCompositeKey.set(
        compositeKey,
        (existingByCompositeKey.get(compositeKey) || 0) + 1
      );
    }

    const newTrades: ParsedTrade[] = [];
    let duplicateCount = 0;

    // Track intra-batch composite key counts so legitimate identical fills in the
    // same CSV aren't dropped, but re-importing the same CSV is caught
    const batchCompositeKeys = new Map<string, number>();

    for (const t of validTrades) {
      // Tier 1: If trade has a broker execution ID, dedup by that (strongest signal)
      if (
        t.brokerExecutionId &&
        existingExecutionIds.has(t.brokerExecutionId)
      ) {
        duplicateCount++;
        continue;
      }

      // Tier 2: Composite key fallback — but count-aware
      const compositeKey = buildCompositeTradeKey({
        symbol: t.symbol,
        timestamp: t.timestamp,
        action: t.action,
        quantity: t.quantity,
        price: t.price,
      });
      const existingCount = existingByCompositeKey.get(compositeKey) || 0;
      const batchCount = batchCompositeKeys.get(compositeKey) || 0;

      // If the total count of this key in existing DB >= what we've seen in this batch,
      // then this is a redundant re-import
      if (existingCount > 0 && batchCount < existingCount) {
        // This could be a re-import of a trade we've already saved
        duplicateCount++;
        batchCompositeKeys.set(compositeKey, batchCount + 1);
        continue;
      }

      newTrades.push(t);
      batchCompositeKeys.set(compositeKey, batchCount + 1);
      if (t.brokerExecutionId) {
        existingExecutionIds.add(t.brokerExecutionId);
      }
    }

    // ── Bulk insert ──────────────────────────────────

    if (newTrades.length > 0) {
      await prisma.trade.createMany({
        data: newTrades.map((t) => ({
          accountId: brokerAccount!.id,
          symbol: t.symbol,
          quantity: t.quantity,
          price: t.price,
          action: t.action,
          timestamp: new Date(t.timestamp),
          fees: t.fees || 0,
          currency: t.currency || 'USD',
          type: t.type || 'STOCK',
          optionType: t.optionType || null,
          strikePrice: t.strikePrice || null,
          expiryDate: t.expiryDate ? new Date(t.expiryDate) : null,
          contractMultiplier: t.type === 'OPTION' ? 100 : 1,
          externalTradeId: t.brokerExecutionId || null,
          externalTradeSource: brokerId,
        })),
      });

      // ── Recalculate position keys ──────────────────

      const affectedSymbols = Array.from(
        new Set(newTrades.map((t) => t.symbol))
      );
      for (const symbol of affectedSymbols) {
        await tradeGroupingService.recalculatePositionKeys(
          brokerAccount.id,
          symbol
        );
      }

      // Update account sync metadata
      const totalTrades = await prisma.trade.count({
        where: { accountId: brokerAccount.id },
      });

      await prisma.brokerAccount.update({
        where: { id: brokerAccount.id },
        data: {
          lastSyncedAt: new Date(),
          syncTradeCount: totalTrades,
        },
      });
    }

    return NextResponse.json({
      imported: newTrades.length,
      duplicates: duplicateCount,
      errors,
      accountId: brokerAccount.id,
      brokerName: displayLabel,
    });
  } catch (error: unknown) {
    console.error('[Trade Import] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
