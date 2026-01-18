"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Playfair_Display, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    Target,
    ArrowRight,
    CheckCircle2,
    Zap,
    LucideIcon,
    Menu,
    X
} from "lucide-react";
import { CursorParticles } from "@/components/cursor-particles";
import { useState } from "react";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className={cn("min-h-screen bg-[#FAFBF6] flex flex-col", inter.className)}>
            <CursorParticles />
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-[#2E4A3B]/5 bg-[#FAFBF6]/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="" fill className="object-contain" />
                        </div>
                        <span className={cn("text-[#2E4A3B] text-xl sm:text-2xl font-bold tracking-tight", playfair.className)}>
                            Artha
                        </span>
                    </div>

                    {/* Desktop Navigation */}
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

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="h-10 w-10 text-[#2E4A3B] hover:bg-[#2E4A3B]/10"
                            aria-label="Toggle navigation menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="md:hidden border-t border-[#2E4A3B]/5 bg-[#FAFBF6]/95 backdrop-blur-md"
                    >
                        <nav className="container mx-auto px-4 py-4 flex flex-col gap-3 max-w-6xl">
                            <Link
                                href="#features"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors py-2"
                            >
                                Features
                            </Link>
                            <Link
                                href="#pricing"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors py-2"
                            >
                                Pricing
                            </Link>
                            <Link
                                href="/demo"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[#E59889] font-medium text-sm hover:text-[#E59889]/80 transition-colors py-2"
                            >
                                Try Demo
                            </Link>
                            <Link
                                href="/login"
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-[#2E4A3B] font-medium text-sm hover:opacity-80 transition-opacity py-2"
                            >
                                Log in
                            </Link>
                            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mt-2">
                                <Button className="w-full bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white rounded-full h-10">
                                    Get Started
                                </Button>
                            </Link>
                        </nav>
                    </motion.div>
                )}
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative overflow-hidden pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-24 md:pb-32">
                    {/* Background Blobs (Decoration) */}
                    <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[#E8EFE0] rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-[#E59889]/10 rounded-full blur-[80px] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

                    <div className="container mx-auto px-4 max-w-6xl relative z-10">
                        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6 sm:space-y-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8EFE0] text-[#2E4A3B] text-xs font-medium mb-4 sm:mb-6">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                    </span>
                                    v1.0 is now live
                                </div>
                                <h1 className={cn("text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#2E4A3B] leading-[1.1] mb-4 sm:mb-6", playfair.className)}>
                                    Master your mindset. <br />
                                    <span className="italic text-[#E59889]">Refine your edge.</span>
                                </h1>
                                <p className="text-base sm:text-lg md:text-xl text-[#2E4A3B]/70 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
                                    The beautiful, automated trading journal for serious traders.
                                    Identify patterns, track psychology, and sync trades instantly.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0"
                            >
                                <Link href="/login" className="w-full sm:w-auto">
                                    <Button className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white text-base sm:text-lg shadow-lg hover:shadow-xl transition-all group">
                                        Start Journaling Free
                                        <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Link href="/demo" className="w-full sm:w-auto">
                                    <Button variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full border-[#2E4A3B] text-[#2E4A3B] hover:bg-[#2E4A3B]/5 text-base sm:text-lg">
                                        Try Demo
                                    </Button>
                                </Link>
                            </motion.div>
                            <p className="text-xs sm:text-sm text-[#2E4A3B]/70 font-medium">
                                No credit card required
                            </p>

                            {/* Dashboard Preview Mockup */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="w-full max-w-5xl mt-8 sm:mt-12 relative"
                            >
                                <div className="rounded-lg sm:rounded-xl overflow-hidden shadow-xl sm:shadow-2xl border border-[#2E4A3B]/10 bg-white p-1 sm:p-2 md:p-4">
                                    <div className="rounded-md sm:rounded-lg overflow-hidden bg-[#F3F7E8] relative border border-[#2E4A3B]/5">
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
                <section id="features" className="py-16 sm:py-20 md:py-24 bg-white relative">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="text-center mb-12 sm:mb-16">
                            <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold text-[#2E4A3B] mb-3 sm:mb-4", playfair.className)}>
                                Everything you need to grow
                            </h2>
                            <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-2xl mx-auto px-4">
                                Artha replaces your messy spreadsheets with automated syncing and powerful insights.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
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
                <section id="pricing" className="py-16 sm:py-20 md:py-24 bg-[#FAFBF6]">
                    <div className="container mx-auto px-4 max-w-4xl text-center">
                        <h2 className={cn("text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#2E4A3B] mb-4 sm:mb-6", playfair.className)}>
                            Completely Free. <br /> For Everyone.
                        </h2>
                        <p className="text-[#2E4A3B]/70 text-base sm:text-lg mb-8 sm:mb-12 max-w-2xl mx-auto px-4">
                            We believe every trader deserves the best tools to succeed. No hidden fees, no subscriptions.
                        </p>

                        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 shadow-xl border border-[#2E4A3B]/5 max-w-md mx-auto relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-[#E59889] text-white text-xs font-bold px-3 sm:px-4 py-1 rounded-bl-xl">
                                EARLY ACCESS
                            </div>
                            <div className="text-4xl sm:text-5xl font-bold text-[#2E4A3B] mb-2 mt-4 sm:mt-0">$0</div>
                            <p className="text-[#2E4A3B]/70 mb-6 sm:mb-8">Forever free for early adopters</p>

                            <ul className="space-y-3 sm:space-y-4 text-left mb-6 sm:mb-8 max-w-xs mx-auto">
                                <li className="flex items-center gap-3 text-[#2E4A3B] text-sm sm:text-base">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <span>Unlimited trade sync</span>
                                </li>
                                <li className="flex items-center gap-3 text-[#2E4A3B] text-sm sm:text-base">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <span>Advanced charting</span>
                                </li>
                                <li className="flex items-center gap-3 text-[#2E4A3B] text-sm sm:text-base">
                                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                                    <span>All broker integrations</span>
                                </li>
                            </ul>

                            <Link href="/login">
                                <Button className="w-full h-11 sm:h-12 rounded-xl bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white font-medium text-sm sm:text-base">
                                    Start Now
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-[#2E4A3B] text-white py-8 sm:py-10 md:py-12">
                <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="" fill className="object-contain brightness-0 invert" />
                        </div>
                        <span className={cn("text-xl sm:text-2xl font-bold", playfair.className)}>Artha</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-white/60 text-xs sm:text-sm">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                    </div>

                    <p className="text-white/40 text-xs text-center md:text-left">
                        © {new Date().getFullYear()} Artha. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon, title: string, description: string }) {
    return (
        <div className="p-6 sm:p-8 rounded-xl sm:rounded-2xl bg-[#FAFBF6] border border-[#2E4A3B]/5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-[#E8EFE0] flex items-center justify-center mb-4 sm:mb-6 text-[#2E4A3B]">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#2E4A3B] mb-2 sm:mb-3">{title}</h3>
            <p className="text-sm sm:text-base text-[#2E4A3B]/70 leading-relaxed">
                {description}
            </p>
        </div>
    )
}
