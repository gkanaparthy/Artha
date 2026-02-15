import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_LAYOUT_PREFERENCES,
  mergeLayoutPreferences,
  sanitizeLayoutPreferences,
} from "@/lib/layout-preferences";

export const dynamic = "force-dynamic";

const getObjectFromJson = (value: Prisma.JsonValue | null): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingData: true },
    });

    const onboardingData = getObjectFromJson(user?.onboardingData ?? null);
    const rawPrefs = onboardingData.layoutPreferences;
    const preferences = rawPrefs
      ? sanitizeLayoutPreferences(rawPrefs)
      : DEFAULT_LAYOUT_PREFERENCES;

    return NextResponse.json({ preferences });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingData: true },
    });

    const onboardingData = getObjectFromJson(user?.onboardingData ?? null);
    const existingPreferences = onboardingData.layoutPreferences
      ? sanitizeLayoutPreferences(onboardingData.layoutPreferences)
      : DEFAULT_LAYOUT_PREFERENCES;
    const preferences = mergeLayoutPreferences(existingPreferences, body?.preferences);
    const nextOnboardingData: Prisma.InputJsonValue = {
      ...onboardingData,
      layoutPreferences: preferences,
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingData: nextOnboardingData },
    });

    return NextResponse.json({ success: true, preferences });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
