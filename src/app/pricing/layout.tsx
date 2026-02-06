import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing - Trading Journal Plans",
    description: "Start with a 30-day free trial of Artha Pro. Founder pricing from $12/mo. Automated trade sync, AI insights, and performance analytics for serious traders.",
    openGraph: {
        title: "Artha Pricing - Trading Journal Plans & Free Trial",
        description: "Start with a 30-day free trial. Founder pricing from $12/mo for automated trade sync, AI coaching, and psychology tracking.",
    },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
