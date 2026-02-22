import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing - Trading Journal Plans",
    description: "Start with a 30-day free trial of Artha Pro. Founder pricing from $12/mo with R-multiple analytics, automated trade sync, AI insights, and psychology performance tracking.",
    openGraph: {
        title: "Artha Pricing - Trading Journal Plans & Free Trial",
        description: "Start with a 30-day free trial. Founder pricing from $12/mo for R-multiple analytics, automated sync, AI coaching, and psychology tracking.",
    },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
