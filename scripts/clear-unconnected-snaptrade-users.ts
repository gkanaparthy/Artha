import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { safeDecrypt } from '../src/lib/encryption';
import { snapTrade } from '../src/lib/snaptrade';

const prisma = new PrismaClient();
const DAY_MS = 24 * 60 * 60 * 1000;

type Options = {
  execute: boolean;
  minAgeDays: number;
  limit?: number;
  verifyRemote: boolean;
  deleteRemoteUser: boolean;
};

type CandidateUser = {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
  onboardingCompleted: boolean;
  snapTradeUserId: string;
  snapTradeUserSecret: string;
};

type EligibleUser = CandidateUser & {
  remoteAccounts: number | null;
  remoteAuthorizations: number | null;
};

type ErrorInfo = {
  message: string;
  status?: number;
};

function printHelp() {
  console.log(`
Usage: node --import tsx scripts/clear-unconnected-snaptrade-users.ts [options]

Safely clears local SnapTrade credentials for users who:
1) Have snapTradeUserId + snapTradeUserSecret
2) Have zero local broker accounts
3) Are older than --min-age-days
4) (default) also have zero remote SnapTrade accounts + authorizations

By default this script is DRY RUN and makes no changes.

Options:
  --execute               Apply database changes (otherwise dry run)
  --min-age-days <n>      Only include users created at least n days ago (default: 7)
  --limit <n>             Max users to inspect
  --skip-remote-check     Do not call SnapTrade APIs for safety verification
  --delete-remote-user    Also call deleteSnapTradeUser before clearing local credentials
  --help                  Show this help

Examples:
  node --import tsx scripts/clear-unconnected-snaptrade-users.ts
  node --import tsx scripts/clear-unconnected-snaptrade-users.ts --execute
  node --import tsx scripts/clear-unconnected-snaptrade-users.ts --execute --delete-remote-user
`);
}

function readNumberFlag(arg: string, index: number, args: string[]): [number, number] {
  if (arg.includes('=')) {
    const raw = arg.split('=')[1];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric value in "${arg}"`);
    }
    return [parsed, index];
  }

  const next = args[index + 1];
  if (!next) {
    throw new Error(`Missing value for "${arg}"`);
  }

  const parsed = Number(next);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for "${arg}": ${next}`);
  }

  return [parsed, index + 1];
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    execute: false,
    minAgeDays: 7,
    verifyRemote: true,
    deleteRemoteUser: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--execute') {
      options.execute = true;
      continue;
    }

    if (arg === '--skip-remote-check') {
      options.verifyRemote = false;
      continue;
    }

    if (arg === '--delete-remote-user') {
      options.deleteRemoteUser = true;
      continue;
    }

    if (arg.startsWith('--min-age-days')) {
      const [value, newIndex] = readNumberFlag(arg, i, args);
      options.minAgeDays = value;
      i = newIndex;
      continue;
    }

    if (arg.startsWith('--limit')) {
      const [value, newIndex] = readNumberFlag(arg, i, args);
      options.limit = value;
      i = newIndex;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.minAgeDays < 0) {
    throw new Error('--min-age-days must be >= 0');
  }

  if (options.limit !== undefined && options.limit <= 0) {
    throw new Error('--limit must be > 0');
  }

  if (options.deleteRemoteUser && !options.verifyRemote) {
    throw new Error('--delete-remote-user cannot be used with --skip-remote-check');
  }

  return options;
}

function getErrorInfo(err: unknown): ErrorInfo {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      status?: number;
      response?: { status?: number; data?: unknown };
    };

    return {
      message: anyErr.message,
      status: anyErr.status ?? anyErr.response?.status,
    };
  }

  return { message: String(err) };
}

function formatUser(user: CandidateUser): string {
  return `${user.id} (${user.email || 'no-email'}, created ${user.createdAt.toISOString().slice(0, 10)})`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cutoff = new Date(Date.now() - options.minAgeDays * DAY_MS);

  console.log('SnapTrade cleanup script');
  console.log(`Mode: ${options.execute ? 'EXECUTE' : 'DRY RUN'}`);
  console.log(`Remote verification: ${options.verifyRemote ? 'enabled' : 'disabled'}`);
  console.log(`Remote deletion: ${options.deleteRemoteUser ? 'enabled' : 'disabled'}`);
  console.log(`Created before: ${cutoff.toISOString()}`);
  if (options.limit) console.log(`Limit: ${options.limit}`);
  console.log('');

  const users = (await prisma.user.findMany({
    where: {
      snapTradeUserId: { not: null },
      snapTradeUserSecret: { not: null },
      createdAt: { lte: cutoff },
      brokerAccounts: { none: {} },
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      onboardingCompleted: true,
      snapTradeUserId: true,
      snapTradeUserSecret: true,
    },
    orderBy: { createdAt: 'asc' },
    take: options.limit,
  })) as CandidateUser[];

  console.log(`Potential local candidates: ${users.length}`);

  const eligible: EligibleUser[] = [];
  const skippedDecrypt: CandidateUser[] = [];
  const skippedRemoteNonEmpty: EligibleUser[] = [];
  const skippedRemoteErrors: Array<{ user: CandidateUser; error: ErrorInfo }> = [];

  for (const user of users) {
    const decryptedSecret = safeDecrypt(user.snapTradeUserSecret);
    if (!decryptedSecret) {
      skippedDecrypt.push(user);
      continue;
    }

    let remoteAccounts: number | null = null;
    let remoteAuthorizations: number | null = null;

    if (options.verifyRemote) {
      try {
        const [accountsRes, authsRes] = await Promise.all([
          snapTrade.accountInformation.listUserAccounts({
            userId: user.snapTradeUserId,
            userSecret: decryptedSecret,
          }),
          snapTrade.connections.listBrokerageAuthorizations({
            userId: user.snapTradeUserId,
            userSecret: decryptedSecret,
          }),
        ]);

        remoteAccounts = accountsRes.data?.length ?? 0;
        remoteAuthorizations = authsRes.data?.length ?? 0;
      } catch (err) {
        skippedRemoteErrors.push({ user, error: getErrorInfo(err) });
        continue;
      }

      if (remoteAccounts > 0 || remoteAuthorizations > 0) {
        skippedRemoteNonEmpty.push({
          ...user,
          remoteAccounts,
          remoteAuthorizations,
        });
        continue;
      }
    }

    eligible.push({
      ...user,
      remoteAccounts,
      remoteAuthorizations,
    });
  }

  console.log(`Eligible for cleanup: ${eligible.length}`);
  console.log(`Skipped (cannot decrypt secret): ${skippedDecrypt.length}`);
  console.log(`Skipped (remote has accounts/connections): ${skippedRemoteNonEmpty.length}`);
  console.log(`Skipped (remote check errors): ${skippedRemoteErrors.length}`);
  console.log('');

  if (skippedRemoteNonEmpty.length > 0) {
    console.log('Skipped because remote data exists:');
    for (const user of skippedRemoteNonEmpty) {
      console.log(
        `- ${formatUser(user)} | remoteAccounts=${user.remoteAccounts} remoteAuthorizations=${user.remoteAuthorizations}`
      );
    }
    console.log('');
  }

  if (skippedRemoteErrors.length > 0) {
    console.log('Skipped because remote check failed:');
    for (const item of skippedRemoteErrors) {
      console.log(`- ${formatUser(item.user)} | ${item.error.message}`);
    }
    console.log('');
  }

  if (eligible.length > 0) {
    console.log('Users to clear:');
    for (const user of eligible) {
      console.log(`- ${formatUser(user)} | snapTradeUserId=${user.snapTradeUserId}`);
    }
    console.log('');
  }

  if (!options.execute) {
    console.log('Dry run complete. No changes made.');
    console.log(
      'Run with --execute to apply. Optionally add --delete-remote-user to also queue SnapTrade user deletion.'
    );
    return;
  }

  let remoteDeleteSuccess = 0;
  let remoteDeleteFailed = 0;
  let localClearSuccess = 0;
  let localClearSkipped = 0;
  let localClearFailed = 0;

  for (const user of eligible) {
    if (options.deleteRemoteUser) {
      try {
        await snapTrade.authentication.deleteSnapTradeUser({
          userId: user.snapTradeUserId,
        });
        remoteDeleteSuccess += 1;
      } catch (err) {
        const error = getErrorInfo(err);

        // If SnapTrade already deleted the user, we still clear local credentials.
        if (error.status === 404) {
          console.warn(`Remote user already missing: ${user.snapTradeUserId}`);
        } else {
          remoteDeleteFailed += 1;
          console.error(
            `Failed remote delete for ${user.snapTradeUserId}: ${error.message}`
          );
          continue;
        }
      }
    }

    try {
      const result = await prisma.user.updateMany({
        where: {
          id: user.id,
          snapTradeUserId: user.snapTradeUserId,
          snapTradeUserSecret: { not: null },
          brokerAccounts: { none: {} },
        },
        data: {
          snapTradeUserId: null,
          snapTradeUserSecret: null,
        },
      });

      if (result.count === 1) {
        localClearSuccess += 1;
      } else {
        localClearSkipped += 1;
        console.warn(`Skipped local clear (record changed): ${formatUser(user)}`);
      }
    } catch (err) {
      localClearFailed += 1;
      console.error(`Failed local clear for ${formatUser(user)}: ${getErrorInfo(err).message}`);
    }
  }

  console.log('');
  console.log('Execution summary:');
  if (options.deleteRemoteUser) {
    console.log(`- Remote delete queued: ${remoteDeleteSuccess}`);
    console.log(`- Remote delete failed: ${remoteDeleteFailed}`);
  }
  console.log(`- Local credentials cleared: ${localClearSuccess}`);
  console.log(`- Local clear skipped (race/change): ${localClearSkipped}`);
  console.log(`- Local clear failed: ${localClearFailed}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
