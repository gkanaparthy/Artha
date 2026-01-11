"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Playfair_Display, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import {
    TrendingUp,
    BarChart3,
    Target,
    ShieldCheck,
    ArrowRight,
    CheckCircle2,
    Zap
} from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function LandingPage() {
    return (
        <div className={cn("min-h-screen bg-[#FAFBF6] flex flex-col", inter.className)}>
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-[#2E4A3B]/5 bg-[#FAFBF6]/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="Artha" fill className="object-contain" />
                        </div>
                        <span className={cn("text-[#2E4A3B] text-2xl font-bold tracking-tight", playfair.className)}>
                            Artha
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors">
                            Pricing
                        </Link>
                        <Link href="/demo" className="text-[#E59889] font-medium text-sm hover:text-[#E59889]/80 transition-colors">
                            Try Demo
                        </Link>
                        <Link href="/login" className="text-[#2E4A3B] font-medium text-sm hover:opacity-80 transition-opacity">
                            Log in
                        </Link>
                        <Link href="/login">
                            <Button className="bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white rounded-full px-6 h-9 text-sm">
                                Get Started
                            </Button>
                        </Link>
                    </nav>

                    <div className="md:hidden">
                        <Link href="/login">
                            <Button className="bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white rounded-full h-9 text-sm">
                                Log in
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-20 pb-32">
                    {/* Background Blobs (Decoration) */}
                    <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[#E8EFE0] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-[#E59889]/10 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

                    <div className="container mx-auto px-4 max-w-6xl relative z-10">
                        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE0] text-[#2E4A3B] text-xs font-medium mb-6">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    v1.0 is now live
                                </div>
                                <h1 className={cn("text-5xl md:text-7xl font-bold text-[#2E4A3B] leading-[1.1] mb-6", playfair.className)}>
                                    Master your mindset. <br />
                                    <span className="italic text-[#E59889]">Refine your edge.</span>
                                </h1>
                                <p className="text-lg md:text-xl text-[#2E4A3B]/70 max-w-2xl mx-auto leading-relaxed">
                                    The beautiful, automated trading journal for serious traders.
                                    Identify patterns, track psychology, and sync trades instantly.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="flex flex-col sm:flex-row items-center gap-4"
                            >
                                <Link href="/login">
                                    <Button className="h-14 px-8 rounded-full bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white text-lg shadow-lg hover:shadow-xl transition-all group">
                                        Start Journaling Free
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Link href="/demo">
                                    <Button variant="outline" className="h-14 px-8 rounded-full border-[#E59889] text-[#E59889] hover:bg-[#E59889]/10 text-lg">
                                        Try Demo
                                    </Button>
                                </Link>
                            </motion.div>
                            <p className="text-sm text-[#2E4A3B]/60 font-medium">
                                No credit card required
                            </p>

                            {/* Dashboard Preview Mockup */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="w-full max-w-5xl mt-12 relative"
                            >
                                <div className="rounded-xl overflow-hidden shadow-2xl border border-[#2E4A3B]/10 bg-white p-2 md:p-4">
                                    <div className="rounded-lg overflow-hidden bg-[#F3F7E8] relative border border-[#2E4A3B]/5">
                                        <Image
                                            src="/dashboard-preview.png"
                                            alt="Artha Dashboard Preview"
                                            width={1024}
                                            height={1024}
                                            className="w-full h-auto shadow-sm"
                                            priority
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="py-24 bg-white relative">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="text-center mb-16">
                            <h2 className={cn("text-3xl md:text-4xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                Everything you need to grow
                            </h2>
                            <p className="text-[#2E4A3B]/60 text-lg max-w-2xl mx-auto">
                                Artha replaces your messy spreadsheets with automated syncing and powerful insights.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={Zap}
                                title="Instant Sync"
                                description="Connect with top brokers via SnapTrade. Your trades appear automatically—no manual entry needed."
                            />
                            <FeatureCard
                                icon={BarChart3}
                                title="Performance Analytics"
                                description="Visualize your P&L, win rate, and risk/reward ratio. Know exactly what's working."
                            />
                            <FeatureCard
                                icon={Target}
                                title="Mistake Tracking"
                                description="Tag trades with psychological notes. Identify if FOMO or revenge trading is costing you money."
                            />
                        </div>
                    </div>
                </section>

                {/* Pricing Section (Free) */}
                <section id="pricing" className="py-24 bg-[#FAFBF6]">
                    <div className="container mx-auto px-4 max-w-4xl text-center">
                        <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                            Completely Free. <br /> For Everyone.
                        </h2>
                        <p className="text-[#2E4A3B]/70 text-lg mb-12 max-w-2xl mx-auto">
                            We believe every trader deserves the best tools to succeed. No hidden fees, no subscriptions.
                        </p>

                        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-[#2E4A3B]/5 max-w-md mx-auto relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-[#E59889] text-white text-xs font-bold px-4 py-1 rounded-bl-xl">
                                EARLY ACCESS
                            </div>
                            <div className="text-5xl font-bold text-[#2E4A3B] mb-2">$0</div>
                            <p className="text-[#2E4A3B]/50 mb-8">Forever free for early adopters</p>

                            <ul className="space-y-4 text-left mb-8 max-w-xs mx-auto">
                                <li className="flex items-center gap-3 text-[#2E4A3B]">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <span>Unlimited trade sync</span>
                                </li>
                                <li className="flex items-center gap-3 text-[#2E4A3B]">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <span>Advanced charting</span>
                                </li>
                                <li className="flex items-center gap-3 text-[#2E4A3B]">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <span>All broker integrations</span>
                                </li>
                            </ul>

                            <Link href="/login">
                                <Button className="w-full h-12 rounded-xl bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white font-medium">
                                    Start Now
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-[#2E4A3B] text-white py-12">
                <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="Artha" fill className="object-contain brightness-0 invert" />
                        </div>
                        <span className={cn("text-2xl font-bold", playfair.className)}>Artha</span>
                    </div>

                    <div className="flex gap-8 text-white/60 text-sm">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                    </div>

                    <p className="text-white/40 text-xs">
                        © {new Date().getFullYear()} Artha. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <div className="p-8 rounded-2xl bg-[#FAFBF6] border border-[#2E4A3B]/5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-[#E8EFE0] flex items-center justify-center mb-6 text-[#2E4A3B]">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-[#2E4A3B] mb-3">{title}</h3>
            <p className="text-[#2E4A3B]/70 leading-relaxed">
                {description}
            </p>
        </div>
    )
}
