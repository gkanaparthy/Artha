import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { tradingStyle, biggestChallenge, skippedAtStep } = body;

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                onboardingCompleted: true,
                onboardingData: {
                    tradingStyle: tradingStyle || null,
                    biggestChallenge: biggestChallenge || null,
                    skippedAtStep: skippedAtStep ?? null,
                    completedAt: new Date().toISOString(),
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to save onboarding data" },
            { status: 500 }
        );
    }
}
