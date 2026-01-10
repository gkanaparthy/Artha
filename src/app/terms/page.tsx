"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function TermsOfServicePage() {
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
                <div className="container mx-auto px-4 max-w-4xl">
                    <h1 className={cn("text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-8", playfair.className)}>
                        Terms of Service
                    </h1>
                    <p className="text-[#2E4A3B]/60 mb-12">
                        Last updated: January 2025
                    </p>

                    <div className="prose prose-lg max-w-none text-[#2E4A3B]/80 space-y-8">
                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Agreement to Terms
                            </h2>
                            <p className="leading-relaxed">
                                By accessing or using Artha, a service provided by WELLTHY Products LLC, you agree to be bound
                                by these Terms of Service. If you do not agree with any part of these terms, you may not
                                access the service.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Description of Service
                            </h2>
                            <p className="leading-relaxed">
                                Artha is a trading journal platform that allows users to sync their trades from connected
                                brokerage accounts, track performance metrics, and analyze trading patterns. The service is
                                provided for informational and journaling purposes only.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                User Accounts
                            </h2>
                            <p className="leading-relaxed mb-4">
                                To use Artha, you must:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Create an account using a valid Google or Apple authentication</li>
                                <li>Provide accurate and complete information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Be at least 18 years of age</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Brokerage Connections
                            </h2>
                            <p className="leading-relaxed">
                                Artha uses SnapTrade to securely connect to your brokerage accounts. By connecting your
                                brokerage, you authorize us to retrieve your trade history for display in your journal.
                                We do not have the ability to execute trades or transfer funds on your behalf.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Disclaimer
                            </h2>
                            <p className="leading-relaxed">
                                <strong>Artha is not a financial advisor.</strong> The information provided through our service
                                is for educational and journaling purposes only and should not be construed as investment advice.
                                Past performance is not indicative of future results. Trading involves substantial risk of loss
                                and is not suitable for all investors.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Limitation of Liability
                            </h2>
                            <p className="leading-relaxed">
                                WELLTHY Products LLC shall not be liable for any indirect, incidental, special, consequential,
                                or punitive damages resulting from your use of the service. We make no warranties about the
                                accuracy or completeness of the trade data displayed.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Acceptable Use
                            </h2>
                            <p className="leading-relaxed mb-4">
                                You agree not to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Use the service for any unlawful purpose</li>
                                <li>Attempt to gain unauthorized access to the service</li>
                                <li>Interfere with or disrupt the service</li>
                                <li>Share your account with others</li>
                                <li>Reverse engineer or attempt to extract the source code</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Termination
                            </h2>
                            <p className="leading-relaxed">
                                We reserve the right to terminate or suspend your account at any time for any reason,
                                including violation of these terms. You may also delete your account at any time through
                                your account settings.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Changes to Terms
                            </h2>
                            <p className="leading-relaxed">
                                We may modify these terms at any time. Continued use of the service after changes constitutes
                                acceptance of the new terms. We will notify users of material changes via email or in-app
                                notification.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Contact
                            </h2>
                            <p className="leading-relaxed">
                                For questions about these Terms of Service, please contact us at{" "}
                                <a href="mailto:legal@arthatrades.com" className="text-[#2E4A3B] font-semibold hover:underline">
                                    legal@arthatrades.com
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
