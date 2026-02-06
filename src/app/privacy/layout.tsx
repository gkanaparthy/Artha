import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Learn how Artha protects your trading data. AES-256 encryption, read-only brokerage connections via SnapTrade, and strict data privacy practices.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
