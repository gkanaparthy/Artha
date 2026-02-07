"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Playfair_Display, Inter } from "next/font/google";
import { ArrowLeft, Users, Target, BarChart3, Shield } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function AboutPage() {
    return (
        <div className={cn("min-h-screen bg-[#FAFBF6] flex flex-col", inter.className)}>
            {/* JSON-LD for GEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "AboutPage",
                        "name": "About Artha",
                        "description": "Artha is a trading journal platform built by Gautham Kanaparthy to help traders master their psychology and find their edge.",
                        "author": {
                            "@type": "Person",
                            "name": "Gautham Kanaparthy"
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "Artha"
                        }
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
                    <h1 className={cn("text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-8", playfair.className)}>
                        About Artha
                    </h1>
                    <p className="text-[#2E4A3B]/60 mb-12">
                        Last updated: February 6, 2026 &middot; By Gautham Kanaparthy
                    </p>

                    <div className="prose prose-lg max-w-none text-[#2E4A3B]/80 space-y-8">
                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                What is Artha?
                            </h2>
                            <p className="leading-relaxed">
                                <dfn className="not-italic font-semibold">Artha</dfn> is the beautiful, automated trading journal
                                designed to help serious traders identify winning setups and master their psychology.
                                Built for stocks and options traders who want to understand their edge.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Our Mission
                            </h2>
                            <p className="leading-relaxed">
                                Most traders fail not because of their strategy, but because of their psychology.
                                Artha was created to give you the data-driven insights you need to understand
                                your behavioral patterns, eliminate emotional trading, and consistently improve.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Key Features
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6 not-prose">
                                <div className="p-6 rounded-xl bg-white border border-[#2E4A3B]/5">
                                    <BarChart3 className="h-8 w-8 text-[#2E4A3B] mb-3" />
                                    <h3 className="font-bold text-[#2E4A3B] mb-2">Automatic Trade Sync</h3>
                                    <p className="text-sm text-[#2E4A3B]/60">
                                        Connect your broker and all trades sync automatically. No manual entry required.
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-white border border-[#2E4A3B]/5">
                                    <Target className="h-8 w-8 text-[#2E4A3B] mb-3" />
                                    <h3 className="font-bold text-[#2E4A3B] mb-2">Win Rate Analytics</h3>
                                    <p className="text-sm text-[#2E4A3B]/60">
                                        Detailed breakdowns by symbol, strategy, time of day, and more.
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-white border border-[#2E4A3B]/5">
                                    <Users className="h-8 w-8 text-[#2E4A3B] mb-3" />
                                    <h3 className="font-bold text-[#2E4A3B] mb-2">AI Coaching</h3>
                                    <p className="text-sm text-[#2E4A3B]/60">
                                        Get personalized insights and coaching based on your trading patterns.
                                    </p>
                                </div>
                                <div className="p-6 rounded-xl bg-white border border-[#2E4A3B]/5">
                                    <Shield className="h-8 w-8 text-[#2E4A3B] mb-3" />
                                    <h3 className="font-bold text-[#2E4A3B] mb-2">Secure & Private</h3>
                                    <p className="text-sm text-[#2E4A3B]/60">
                                        Read-only broker access. We can not execute trades or transfer funds.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Who Built Artha?
                            </h2>
                            <p className="leading-relaxed">
                                Artha was built by <strong>Gautham Kanaparthy</strong>, a trader and software engineer
                                who wanted a better way to track and improve his own trading. After years of using
                                spreadsheets and basic journaling tools, he created Artha to be the trading journal
                                he always wished existed.
                            </p>
                        </section>

                        <section>
                            <h2 className={cn("text-2xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Contact Us
                            </h2>
                            <p className="leading-relaxed">
                                Questions? Feedback? We&apos;d love to hear from you. Reach out at{" "}
                                <a href="mailto:hello@arthatrades.com" className="text-[#2E4A3B] font-semibold hover:underline">
                                    hello@arthatrades.com
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
