import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { tradingStyle, biggestChallenge, skippedAtStep } = body;

        const existingUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { onboardingData: true },
        });
        const existingOnboardingData =
            existingUser?.onboardingData &&
                typeof existingUser.onboardingData === "object" &&
                !Array.isArray(existingUser.onboardingData)
                ? (existingUser.onboardingData as Record<string, unknown>)
                : {};

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                onboardingCompleted: true,
                onboardingData: {
                    ...existingOnboardingData,
                    tradingStyle: tradingStyle || null,
                    biggestChallenge: biggestChallenge || null,
                    skippedAtStep: skippedAtStep ?? null,
                    completedAt: new Date().toISOString(),
                } as Prisma.InputJsonValue,
            },
        });

        // Set a direct cookie as a fallback — middleware can check this
        // independently of the JWT, which may not refresh reliably.
        const response = NextResponse.json({ success: true });
        response.cookies.set("onboarding_completed", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 365, // 1 year
        });
        return response;
    } catch (error) {
        console.error("Onboarding save error:", error);
        return NextResponse.json(
            { error: "Failed to save onboarding data" },
            { status: 500 }
        );
    }
}
