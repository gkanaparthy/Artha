import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // If onboarding already completed, go to dashboard
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { onboardingCompleted: true },
    });

    if (user?.onboardingCompleted) {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
