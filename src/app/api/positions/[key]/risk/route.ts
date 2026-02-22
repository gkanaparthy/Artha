import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { decodePositionKey } from '@/lib/utils/position-key';
import { applyRateLimit } from '@/lib/ratelimit';

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const positionKey = decodePositionKey(key);

    const risk = await prisma.positionRisk.findUnique({
      where: {
        userId_positionKey: {
          userId: session.user.id,
          positionKey,
        },
      },
    });

    return NextResponse.json({ risk });
  } catch (error) {
    console.error('Error fetching position risk:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const rateLimitResponse = await applyRateLimit(req, 'api');
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const positionKey = decodePositionKey(key);
    const body = await req.json();

    const initialRiskUsd = Number(body?.initialRiskUsd);
    if (!Number.isFinite(initialRiskUsd) || initialRiskUsd <= 0) {
      return NextResponse.json(
        { error: 'initialRiskUsd must be a positive number' },
        { status: 400 }
      );
    }

    const initialStopPrice = parseOptionalNumber(body?.initialStopPrice);
    const initialTargetPrice = parseOptionalNumber(body?.initialTargetPrice);

    const positionExists = await prisma.trade.findFirst({
      where: {
        positionKey,
        account: { userId: session.user.id },
      },
      select: { id: true },
    });

    if (!positionExists) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const risk = await prisma.positionRisk.upsert({
      where: {
        userId_positionKey: {
          userId: session.user.id,
          positionKey,
        },
      },
      update: {
        initialRiskUsd,
        initialStopPrice,
        initialTargetPrice,
      },
      create: {
        userId: session.user.id,
        positionKey,
        initialRiskUsd,
        initialStopPrice,
        initialTargetPrice,
      },
    });

    return NextResponse.json({ success: true, risk });
  } catch (error) {
    console.error('Error saving position risk:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const rateLimitResponse = await applyRateLimit(req, 'api');
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const positionKey = decodePositionKey(key);

    await prisma.positionRisk.deleteMany({
      where: {
        userId: session.user.id,
        positionKey,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting position risk:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
