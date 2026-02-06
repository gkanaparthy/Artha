import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service",
    description: "Terms of Service for Artha trading journal. Read about acceptable use, brokerage connections, data policies, and user account requirements.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
