"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function PrivacyPolicyPage() {
    return (
        <div className={cn("min-h-screen bg-[#FAFBF6] flex flex-col", inter.className)}>
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-[#2E4A3B]/5 bg-[#FAFBF6]/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="Artha" fill className="object-contain" />
                        </div>
                        <span className={cn("text-[#2E4A3B] text-2xl font-bold tracking-tight", playfair.className)}>
                            Artha
                        </span>
                    </Link>
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="flex-1 py-16">
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "WebPage",
                            "name": "Artha Privacy Policy",
                            "description": "How Artha collects, uses, and safeguards your trading data and personal information.",
                            "author": {
                                "@type": "Person",
                                "name": "Gautham Kanaparthy"
                            },
                            "publisher": {
                                "@type": "Organization",
                                "name": "Artha"
                            },
                            "dateModified": "2026-02-06"
                        })
                    }}
                />
                <div className="container mx-auto px-4 max-w-4xl">
                    <h1 className={cn("text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-8", playfair.className)}>
                        Privacy Policy
                    </h1>
                    <p className="text-[#2E4A3B]/60 mb-12">
                        Last updated: February 6, 2026 &middot; By Gautham Kanaparthy
                    </p>

                    <div className="prose prose-lg max-w-none text-[#2E4A3B]/80 space-y-8">
                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Introduction
                            </h2>
                            <p className="leading-relaxed">
                                WELLTHY Products LLC (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates Artha, a trading journal platform.
                                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you
                                use our service.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Information We Collect
                            </h2>
                            <p className="leading-relaxed mb-4">
                                We may collect the following types of information:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Account Information:</strong> Name, email address, and profile information from your authentication provider (Google or Apple).</li>
                                <li><strong>Trading Data:</strong> Trade history and related information synced from your connected brokerage accounts through SnapTrade.</li>
                                <li><strong>Usage Data:</strong> Information about how you interact with our platform, including features used and time spent.</li>
                                <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security and analytics purposes.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                How We Use Your Information
                            </h2>
                            <p className="leading-relaxed mb-4">
                                We use the information we collect to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Provide, maintain, and improve our services</li>
                                <li>Sync and display your trading data</li>
                                <li>Generate analytics and insights about your trading performance</li>
                                <li>Communicate with you about service updates</li>
                                <li>Ensure security and prevent fraud</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Data Security
                            </h2>
                            <p className="leading-relaxed">
                                We implement appropriate technical and organizational measures to protect your personal information.
                                Your brokerage connections are handled securely through SnapTrade, and we never store your brokerage
                                login credentials directly.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Third-Party Services
                            </h2>
                            <p className="leading-relaxed">
                                We use third-party services including authentication providers (Google, Apple), SnapTrade for
                                brokerage connections, and analytics tools. These services have their own privacy policies
                                governing their use of your information.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Your Rights
                            </h2>
                            <p className="leading-relaxed mb-4">
                                Depending on your location, you may have the right to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Access the personal information we hold about you</li>
                                <li>Request correction of inaccurate information</li>
                                <li>Request deletion of your account and associated data</li>
                                <li>Disconnect your brokerage accounts at any time</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Contact Us
                            </h2>
                            <p className="leading-relaxed">
                                If you have questions about this Privacy Policy, please contact us at{" "}
                                <a href="mailto:privacy@arthatrades.com" className="text-[#2E4A3B] font-semibold hover:underline">
                                    privacy@arthatrades.com
                                </a>
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="bg-[#2E4A3B] text-white py-8">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <p className="text-white/40 text-sm">
                        © {new Date().getFullYear()} WELLTHY Products LLC. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
