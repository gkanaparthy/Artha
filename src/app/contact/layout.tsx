import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact Us",
    description: "Get in touch with the Artha team. Contact us for support, feedback, or general inquiries about the trading journal platform.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
