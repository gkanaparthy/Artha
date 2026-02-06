import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Middleware already handles onboarding completion check via JWT
    // No need for additional DB query here

    return <>{children}</>;
}
