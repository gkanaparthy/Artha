import { auth } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
    const session = await auth();

    return <OnboardingWizard userName={session?.user?.name} />;
}
