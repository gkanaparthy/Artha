const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchTrades() {
  try {
    // Find Gautham
    const user = await prisma.user.findFirst({
      where: {
        name: {
          contains: 'Gautham',
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:', user.name, '(' + user.email + ')');
    console.log('');

    // Search for RKT trades
    console.log('========================================');
    console.log('RKT Trades');
    console.log('========================================');
    const rktTrades = await prisma.trade.findMany({
      where: {
        account: {
          userId: user.id
        },
        symbol: {
          contains: 'RKT',
          mode: 'insensitive'
        }
      },
      include: {
        account: {
          select: {
            brokerName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 20
    });

    if (rktTrades.length === 0) {
      console.log('No RKT trades found in database');
    } else {
      console.log('Found', rktTrades.length, 'RKT trades (showing most recent):');
      rktTrades.forEach(trade => {
        console.log('  ' + trade.timestamp.toISOString().split('T')[0] + ' | ' + trade.symbol + ' | ' + trade.action + ' | Qty: ' + trade.quantity + ' | Price: $' + trade.price + ' | Broker: ' + trade.account.brokerName + ' | Imported: ' + trade.createdAt.toISOString());
      });
    }
    console.log('');

    // Search for NBIS trades
    console.log('========================================');
    console.log('NBIS Trades');
    console.log('========================================');
    const nbisTrades = await prisma.trade.findMany({
      where: {
        account: {
          userId: user.id
        },
        symbol: {
          contains: 'NBIS',
          mode: 'insensitive'
        }
      },
      include: {
        account: {
          select: {
            brokerName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 20
    });

    if (nbisTrades.length === 0) {
      console.log('No NBIS trades found in database');
    } else {
      console.log('Found', nbisTrades.length, 'NBIS trades (showing most recent):');
      nbisTrades.forEach(trade => {
        console.log('  ' + trade.timestamp.toISOString().split('T')[0] + ' | ' + trade.symbol + ' | ' + trade.action + ' | Qty: ' + trade.quantity + ' | Price: $' + trade.price + ' | Broker: ' + trade.account.brokerName + ' | Imported: ' + trade.createdAt.toISOString());
      });
    }
    console.log('');

    // Check for trades from today (Jan 21, 2026)
    console.log('========================================');
    console.log('All Trades from Today (Jan 21, 2026)');
    console.log('========================================');
    const todayStart = new Date('2026-01-21T00:00:00Z');
    const todayEnd = new Date('2026-01-21T23:59:59Z');

    const todayTrades = await prisma.trade.findMany({
      where: {
        account: {
          userId: user.id
        },
        timestamp: {
          gte: todayStart,
          lte: todayEnd
        }
      },
      include: {
        account: {
          select: {
            brokerName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    if (todayTrades.length === 0) {
      console.log('No trades found for today');
    } else {
      console.log('Found', todayTrades.length, 'trades from today:');
      todayTrades.forEach(trade => {
        console.log('  ' + trade.timestamp.toISOString() + ' | ' + trade.symbol + ' | ' + trade.action + ' | Qty: ' + trade.quantity + ' | Price: $' + trade.price + ' | Broker: ' + trade.account.brokerName);
      });
    }
    console.log('');

    // Check for trades from yesterday too
    console.log('========================================');
    console.log('All Trades from Yesterday (Jan 20, 2026)');
    console.log('========================================');
    const yesterdayStart = new Date('2026-01-20T00:00:00Z');
    const yesterdayEnd = new Date('2026-01-20T23:59:59Z');

    const yesterdayTrades = await prisma.trade.findMany({
      where: {
        account: {
          userId: user.id
        },
        timestamp: {
          gte: yesterdayStart,
          lte: yesterdayEnd
        }
      },
      include: {
        account: {
          select: {
            brokerName: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    if (yesterdayTrades.length === 0) {
      console.log('No trades found for yesterday');
    } else {
      console.log('Found', yesterdayTrades.length, 'trades from yesterday:');
      yesterdayTrades.forEach(trade => {
        console.log('  ' + trade.timestamp.toISOString() + ' | ' + trade.symbol + ' | ' + trade.action + ' | Qty: ' + trade.quantity + ' | Price: $' + trade.price + ' | Broker: ' + trade.account.brokerName);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

searchTrades();
