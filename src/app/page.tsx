"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Playfair_Display, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import {
    BarChart3,
    Target,
    ArrowRight,
    Zap,
    Brain,
    LucideIcon,
    Menu,
    X,
    Shield,
    Lock,
    TrendingUp,
    Flame,
} from "lucide-react";
import { useState } from "react";
import { PsychologyPreview } from "@/components/landing/psychology-preview";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { BrokerLogos } from "@/components/landing/broker-logos";
import { FAQSection } from "@/components/landing/faq-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { PricingSection } from "@/components/subscription/pricing-section";
import { BlogPreview } from "@/components/landing/blog-preview";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className={cn("min-h-screen bg-[#FAFBF6] flex flex-col", inter.className)}>
            {/* JSON-LD for GEO/SEO */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@graph": [
                            {
                                "@type": "WebSite",
                                "name": "Artha",
                                "url": "https://arthatrades.com",
                                "description": "The automated trading journal for serious traders with psychology tracking, FIFO analytics, and R-multiple reporting."
                            },
                            {
                                "@type": "SoftwareApplication",
                                "name": "Artha Trading Journal",
                                "applicationCategory": "FinanceApplication",
                                "operatingSystem": "Web",
                                "description": "Artha is an automated trading journal built for serious traders. Artha Pro includes R-multiple analytics (Net R, Avg R, risk coverage), setup performance, and psychology insights.",
                                "author": {
                                    "@type": "Person",
                                    "name": "Gautham Kanaparthy"
                                },
                                "offers": {
                                    "@type": "AggregateOffer",
                                    "priceCurrency": "USD",
                                    "lowPrice": "0",
                                    "highPrice": "199",
                                    "offerCount": "3"
                                }
                            }
                        ]
                    })
                }}
            />
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-[#2E4A3B]/5 bg-[#FAFBF6]/80 backdrop-blur-md">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="Artha Logo" fill className="object-contain" />
                        </div>
                        <span className={cn("text-[#2E4A3B] text-xl sm:text-2xl font-bold tracking-tight", playfair.className)}>
                            Artha
                        </span>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <Link href="#product" className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors">
                            Product
                        </Link>
                        <Link href="#how-it-works" className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors">
                            How It Works
                        </Link>
                        <Link href="#pricing" className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors">
                            Pricing
                        </Link>
                        <Link href="/learn" className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors">
                            Blog/Learn
                        </Link>
                        <Link href="/login" className="text-[#2E4A3B] font-medium text-sm hover:opacity-80 transition-opacity">
                            Log in
                        </Link>
                        <Link href="/login">
                            <Button className="bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white rounded-full px-6 h-9 text-sm">
                                Connect Free
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
                <AnimatePresence mode="wait">
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="md:hidden border-t border-[#2E4A3B]/5 bg-[#FAFBF6]/95 backdrop-blur-md"
                        >
                            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3 max-w-6xl">
                                <Link
                                    href="#product"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors py-2"
                                >
                                    Product
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors py-2"
                                >
                                    How It Works
                                </Link>
                                <Link
                                    href="#pricing"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors py-2"
                                >
                                    Pricing
                                </Link>
                                <Link
                                    href="/learn"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-[#2E4A3B]/70 hover:text-[#2E4A3B] text-sm font-medium transition-colors py-2"
                                >
                                    Blog/Learn
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
                                        Connect Free
                                    </Button>
                                </Link>
                            </nav>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className="flex-1 pb-20 md:pb-0">
                {/* Hero Section — Dark Gradient */}
                <section className="relative overflow-hidden pt-16 sm:pt-20 md:pt-28 pb-16 sm:pb-24 md:pb-32 bg-gradient-to-b from-[#1A2F25] via-[#1A2F25] to-[#2E4A3B]">
                    {/* Subtle radial glows */}
                    <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[#4ADE80]/5 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[40vw] h-[40vw] bg-[#E59889]/5 rounded-full blur-[100px] translate-y-1/4 -translate-x-1/4 pointer-events-none" />

                    <div className="container mx-auto px-4 max-w-6xl relative z-10">
                        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6 sm:space-y-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-4 sm:mb-6 border border-white/10">
                                    <Flame className="h-3.5 w-3.5 text-[#E59889]" />
                                    Founder pricing: 17 of 100 spots left
                                </div>
                                <h1 className={cn("text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-4 sm:mb-6", playfair.className)}>
                                    Stop logging trades by hand. <br />
                                    <span className="italic text-[#4ADE80]">Start understanding why you lose.</span>
                                </h1>
                                <p className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
                                    Artha auto-syncs from 100+ brokers and shows the exact dollar cost of FOMO, revenge trades, and broken rules. No spreadsheets. No manual entry. Ever.
                                </p>

                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0"
                            >
                                <Link href="/login" className="w-full sm:w-auto">
                                    <Button className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#4ADE80] hover:bg-[#4ADE80]/90 text-[#1A2F25] font-bold text-base sm:text-lg shadow-lg shadow-[#4ADE80]/20 hover:shadow-xl hover:shadow-[#4ADE80]/30 transition-all group">
                                        Connect Your Broker Free
                                        <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Link href="/demo" className="w-full sm:w-auto">
                                    <Button variant="outline" className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 rounded-full border-white/20 text-white hover:bg-white/5 text-base sm:text-lg">
                                        Watch 2-Min Demo
                                    </Button>
                                </Link>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                className="text-xs sm:text-sm text-white/40 font-medium"
                            >
                                100+ brokers &middot; AES-256 encrypted &middot; Read-only access &middot; Free 30-day trial
                            </motion.p>

                            {/* Dashboard Preview Mockup */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="w-full max-w-5xl mt-8 sm:mt-12 relative"
                            >
                                <div className="rounded-lg sm:rounded-xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10 bg-[#0f1f18] p-1 sm:p-2 md:p-4">
                                    <div className="rounded-md sm:rounded-lg overflow-hidden relative aspect-video bg-[#0f1f18]">
                                        <video
                                            src="/showcase.mp4?v=1"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            poster="/og-image.png"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>

                                {/* Annotation Callouts */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 1.0 }}
                                    className="hidden md:flex absolute -left-4 top-[20%] items-center gap-2"
                                >
                                    <div className="bg-white rounded-full px-4 py-2 shadow-lg text-xs font-bold text-[#2E4A3B] whitespace-nowrap">
                                        FIFO P&L Engine
                                    </div>
                                    <div className="w-8 h-px bg-white/40" />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 1.2 }}
                                    className="hidden md:flex absolute -right-4 top-[35%] items-center gap-2"
                                >
                                    <div className="w-8 h-px bg-white/40" />
                                    <div className="bg-white rounded-full px-4 py-2 shadow-lg text-xs font-bold text-[#2E4A3B] whitespace-nowrap">
                                        Psychology Tags
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 1.4 }}
                                    className="hidden md:flex absolute -left-4 top-[55%] items-center gap-2"
                                >
                                    <div className="bg-white rounded-full px-4 py-2 shadow-lg text-xs font-bold text-[#2E4A3B] whitespace-nowrap">
                                        Win Rate & Metrics
                                    </div>
                                    <div className="w-8 h-px bg-white/40" />
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <section className="bg-[#1A2F25] border-t border-white/10 border-b border-[#2E4A3B]/10">
                    <div className="container mx-auto px-4 max-w-6xl py-3 text-center text-xs sm:text-sm text-white/80">
                        100+ brokers &middot; AES-256 encrypted &middot; Read-only access &middot; Free trial
                    </div>
                </section>

                {/* Problem Section */}
                <section className="py-14 sm:py-16 bg-white border-b border-[#2E4A3B]/5">
                    <div className="container mx-auto px-4 max-w-4xl text-center">
                        <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold text-[#2E4A3B] mb-5", playfair.className)}>
                            Your P&amp;L tells you what happened. It never tells you why.
                        </h2>
                        <p className="text-[#2E4A3B]/70 text-base sm:text-lg leading-relaxed">
                            You already know your win rate and net P&amp;L. The real question is what keeps leaking money:
                            the setup you overtrade, the Tuesday afternoon FOMO entry, the one trade where you ignored your stop.
                            Artha connects behavior to dollars so you can fix the pattern, not just review the result.
                        </p>
                    </div>
                </section>

                {/* Differentiator Section */}
                <section className="py-16 sm:py-20 bg-[#FAFBF6]">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="text-center mb-10">
                            <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                                The journal that fills itself
                            </h2>
                            <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-3xl mx-auto">
                                Other journals ask you to log every trade by hand. Artha auto-syncs with your broker,
                                calculates FIFO P&amp;L and R-multiples, and gets you to your first useful insight fast.
                            </p>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                            <StatsPill value="100+" label="brokers supported" />
                            <StatsPill value="0" label="manual entries required" />
                            <StatsPill value="< 5 min" label="to first insight" />
                        </div>
                    </div>
                </section>

                <HowItWorks />

                <ComparisonTable />

                <PsychologyPreview />

                <BeforeAfterSection />

                {/* Features Section */}
                <section id="product" className="py-16 sm:py-20 md:py-24 bg-white relative">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="text-center mb-12 sm:mb-16">
                            <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold text-[#2E4A3B] mb-3 sm:mb-4", playfair.className)}>
                                What changes when your data works for you
                            </h2>
                            <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-2xl mx-auto px-4">
                                Each signal ties to dollars lost, risk taken, or time saved.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                            <FeatureCard
                                icon={Target}
                                title="Behavioral Alpha"
                                description="See the dollar cost of every mistake: FOMO entries, revenge trades, and rule breaks. Not a feeling. A number."
                                accentColor="border-t-[#E59889]"
                            />
                            <FeatureCard
                                icon={Zap}
                                title="Setup Analytics"
                                description="See which setups make money and which bleed your account. Filter by setup, timeframe, symbol, and emotion."
                                accentColor="border-t-[#4ADE80]"
                            />
                            <FeatureCard
                                icon={BarChart3}
                                title="R-Multiple Tracking"
                                description="Net R, Avg R, and risk coverage by trade and setup. Know if your risk is actually getting paid."
                                accentColor="border-t-[#2E4A3B]"
                            />
                            <FeatureCard
                                icon={Brain}
                                title="AI Coaching Insights"
                                description="Weekly behavioral reports that call out your biggest leaks and what to fix next, using your actual trading data."
                                accentColor="border-t-[#7BAE9F]"
                            />
                        </div>
                    </div>
                </section>

                <BrokerLogos />

                <FounderStorySection />

                <SocialProofSection />

                <PricingSection />

                <FAQSection />

                <BlogPreview />

                <FinalCTA />

                <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2E4A3B]/10 bg-[#FAFBF6]/95 p-3 backdrop-blur md:hidden">
                    <Link href="/login" className="block">
                        <Button className="w-full h-11 rounded-full bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white font-semibold">
                            Connect Your Broker Free
                        </Button>
                    </Link>
                </div>
            </main>

            <footer className="bg-[#1A2F25] text-white py-8 sm:py-10 md:py-12">
                <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6 sm:gap-8">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 relative flex items-center justify-center">
                            <Image src="/logo.png" alt="Artha Logo" fill className="object-contain brightness-0 invert" />
                        </div>
                        <span className={cn("text-xl sm:text-2xl font-bold", playfair.className)}>Artha</span>
                    </div>

                    <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 text-white/60 text-xs sm:text-sm">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/security" className="hover:text-white transition-colors">Security</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                    </div>

                    <p className="text-white/40 text-xs text-center md:text-left">
                        &copy; {new Date().getFullYear()} Artha. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, description, accentColor }: { icon: LucideIcon, title: string, description: string, accentColor: string }) {
    return (
        <div className={cn(
            "p-6 sm:p-8 rounded-xl sm:rounded-2xl bg-[#FAFBF6] border border-[#2E4A3B]/5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300",
            "border-t-[3px]",
            accentColor
        )}>
            <div className="w-12 h-12 rounded-xl bg-[#E8EFE0] flex items-center justify-center mb-4 sm:mb-6 text-[#2E4A3B]">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-[#2E4A3B] mb-2 sm:mb-3">{title}</h3>
            <p className="text-sm sm:text-base text-[#2E4A3B]/70 leading-relaxed mb-4">
                {description}
            </p>
            <Link href="/login" className="text-[#E59889] font-medium text-sm hover:underline inline-flex items-center gap-1 group">
                Connect free
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
        </div>
    )
}

function StatsPill({ value, label }: { value: string; label: string }) {
    return (
        <div className="rounded-2xl border border-[#2E4A3B]/10 bg-white p-6 text-center shadow-sm">
            <div className="text-2xl sm:text-3xl font-bold text-[#2E4A3B]">{value}</div>
            <div className="mt-1 text-sm text-[#2E4A3B]/60">{label}</div>
        </div>
    );
}

function FounderStorySection() {
    return (
        <section className="py-16 sm:py-20 bg-white">
            <div className="container mx-auto px-4 max-w-4xl">
                <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6 text-center", playfair.className)}>
                    Built by a trader who got tired of guessing
                </h2>
                <div className="rounded-3xl border border-[#2E4A3B]/10 bg-[#FAFBF6] p-6 sm:p-8">
                    <p className="text-[#2E4A3B]/75 leading-relaxed mb-4">
                        I kept spreadsheets, tested other journals, and still repeated the same mistakes. I could see what I traded,
                        but not why I kept leaking money.
                    </p>
                    <p className="text-[#2E4A3B]/75 leading-relaxed mb-6">
                        I built Artha to track the trader, not just the trades. It links your behavior to real dollars so you can
                        fix patterns, protect risk, and improve consistency.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-4 text-center">
                        <StatsPill value="100+" label="brokers integrated" />
                        <StatsPill value="Stocks, Options, Crypto & Forex" label="asset classes covered" />
                        <StatsPill value="FIFO + Net R" label="core analytics engine" />
                    </div>
                </div>
            </div>
        </section>
    );
}

function SocialProofSection() {
    return (
        <section className="py-16 sm:py-20 bg-[#FAFBF6]">
            <div className="container mx-auto px-4 max-w-4xl">
                <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6 text-center", playfair.className)}>
                    What traders are finding
                </h2>
                <div className="rounded-3xl border border-[#2E4A3B]/10 bg-white p-6 sm:p-8 text-center">
                    <p className="text-[#2E4A3B]/70 text-lg mb-6">
                        Serious traders are already using Artha to track their behavioral edge. Join them.
                    </p>
                    <Link href="/login">
                        <Button className="rounded-full bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white px-8">
                            Connect Your Broker Free
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}

function BeforeAfterSection() {
    return (
        <section className="py-16 sm:py-20 bg-white">
            <div className="container mx-auto px-4 max-w-5xl">
                <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6 text-center", playfair.className)}>
                    Week 1 vs Week 8
                </h2>
                <p className="text-[#2E4A3B]/70 text-center max-w-2xl mx-auto mb-10">
                    What changes when you stop guessing and start measuring behavior with dollars and R-multiples.
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-3xl border border-[#2E4A3B]/10 bg-[#FAFBF6] p-6">
                        <div className="text-sm font-semibold text-[#2E4A3B]/60 mb-3">Week 1</div>
                        <ul className="space-y-2 text-[#2E4A3B]/75">
                            <li>Manual journaling drops off after a few days</li>
                            <li>Knows net P&amp;L, but not what is causing losses</li>
                            <li>Risk is inconsistent across setups</li>
                        </ul>
                    </div>
                    <div className="rounded-3xl border border-[#2E4A3B]/10 bg-[#E8EFE0]/45 p-6">
                        <div className="text-sm font-semibold text-[#2E4A3B]/60 mb-3">Week 8</div>
                        <ul className="space-y-2 text-[#2E4A3B]/80">
                            <li>Auto-synced history with zero manual entry</li>
                            <li>Behavioral leaks tracked in dollars</li>
                            <li>Net R and Avg R highlight decision quality</li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
