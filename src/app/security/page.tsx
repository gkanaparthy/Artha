"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft, Shield, Lock, Eye, Database, Key, Server } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function SecurityPage() {
    return (
        <div className={cn("min-h-screen bg-[#FAFBF6] flex flex-col", inter.className)}>
            {/* JSON-LD for GEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        "name": "Artha Security",
                        "description": "Learn how Artha protects your trading data with bank-level encryption and secure brokerage connections.",
                        "breadcrumb": "Home > Security"
                    })
                }}
            />

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
                    <div className="mb-12">
                        <h1 className={cn("text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                            Security at Artha
                        </h1>
                        <p className="text-xl text-[#2E4A3B]/70 leading-relaxed max-w-2xl">
                            We understand the importance of your financial data. Artha is built with multi-layered
                            security to ensure your information remains private and protected.
                        </p>
                    </div>

                    <div className="grid gap-8 mb-16">
                        <div className="p-8 rounded-2xl bg-white border border-[#2E4A3B]/10 shadow-sm">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 rounded-xl bg-[#2E4A3B]/5 flex items-center justify-center shrink-0">
                                    <Eye className="h-6 w-6 text-[#2E4A3B]" />
                                </div>
                                <div>
                                    <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-3", playfair.className)}>
                                        Read-Only Access
                                    </h2>
                                    <p className="text-[#2E4A3B]/70 leading-relaxed">
                                        Our connection to your brokerage is **strictly read-only**. Artha has no ability to
                                        execute trades, modify existing orders, or transfer funds. We only retrieve your
                                        trading history to provide analytics.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-2xl bg-white border border-[#2E4A3B]/10 shadow-sm">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 rounded-xl bg-[#2E4A3B]/5 flex items-center justify-center shrink-0">
                                    <Lock className="h-6 w-6 text-[#2E4A3B]" />
                                </div>
                                <div>
                                    <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-3", playfair.className)}>
                                        Bank-Level Encryption
                                    </h2>
                                    <p className="text-[#2E4A3B]/70 leading-relaxed">
                                        All sensitive data is encrypted at rest using **AES-256-GCM** encryption.
                                        Data in transit is protected using industry-standard TLS protocols, ensuring
                                        that your information is secure from the moment it leaves your broker until
                                        it reaches our dashboard.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-2xl bg-white border border-[#2E4A3B]/10 shadow-sm">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 rounded-xl bg-[#2E4A3B]/5 flex items-center justify-center shrink-0">
                                    <Server className="h-6 w-6 text-[#2E4A3B]" />
                                </div>
                                <div>
                                    <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-3", playfair.className)}>
                                        No Login Storage
                                    </h2>
                                    <p className="text-[#2E4A3B]/70 leading-relaxed">
                                        We **never store your brokerage login credentials**. All connections are
                                        facilitated through [SnapTrade](https://snaptrade.com), a regulated financial
                                        API provider that uses secure OAuth connections. This means you grant access
                                        directly via your broker's own secure login page.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-2xl bg-white border border-[#2E4A3B]/10 shadow-sm">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 rounded-xl bg-[#2E4A3B]/5 flex items-center justify-center shrink-0">
                                    <Database className="h-6 w-6 text-[#2E4A3B]" />
                                </div>
                                <div>
                                    <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-3", playfair.className)}>
                                        Data Isolation & Privacy
                                    </h2>
                                    <p className="text-[#2E4A3B]/70 leading-relaxed">
                                        We use Row Level Security (RLS) within our database to ensure that your data
                                        is strictly isolated. Your trade data is never sold to third parties or used
                                        for any purpose other than providing your personal analytics.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-lg max-w-none text-[#2E4A3B]/80 space-y-8">
                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Vulnerability Management
                            </h2>
                            <p>
                                We perform regular security audits and keep our infrastructure up to date
                                with the latest security patches. Our platform is built on modern, secure
                                cloud infrastructure with restricted access controls.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Account Ownership
                            </h2>
                            <p>
                                You maintain full control over your data. You can disconnect your brokerage
                                accounts or delete your entire Artha account and all associated data
                                at any time with a single click in your settings.
                            </p>
                        </section>

                        <section className="bg-[#2E4A3B]/5 p-8 rounded-2xl">
                            <h2 className={cn("text-xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Security Questions?
                            </h2>
                            <p className="mb-0">
                                If you have specific questions about our security practices or would like to
                                report a concern, please contact our security team at{" "}
                                <a href="mailto:security@arthatrades.com" className="text-[#2E4A3B] font-semibold hover:underline">
                                    security@arthatrades.com
                                </a>.
                            </p>
                        </section>
                    </div>
                </div>
            </main>

            <footer className="bg-[#2E4A3B] text-white py-8 mt-16">
                <div className="container mx-auto px-4 max-w-4xl text-center">
                    <p className="text-white/40 text-sm">
                        © {new Date().getFullYear()} WELLTHY Products LLC. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
