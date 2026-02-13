import { prisma } from '../src/lib/prisma';

async function main() {
  const email = 'kgauthamprasad@gmail.com';
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.log('user not found');
    return;
  }

  const trades = await prisma.trade.findMany({
    where: {
      account: { userId: user.id },
      symbol: 'PL',
    },
    include: { account: { select: { brokerName: true, accountNumber: true } } },
    orderBy: { timestamp: 'asc' },
  });

  console.log('trades', trades.length);
  for (const t of trades) {
    const la = t.timestamp.toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const ny = t.timestamp.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    console.log(JSON.stringify({
      id: t.id,
      ts_iso: t.timestamp.toISOString(),
      la,
      ny,
      action: t.action,
      qty: t.quantity,
      price: t.price,
      broker: t.account.brokerName,
      acct: t.account.accountNumber?.slice(-4),
      snapTradeTradeId: t.snapTradeTradeId,
      snapTradeOrderId: t.snapTradeOrderId,
    }));
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
