"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { CheckCircle2, EyeOff, Loader2, Lock } from "lucide-react";
import { ConnectBrokerButton } from "@/components/connect-broker-button";

interface OnboardingWizardProps {
    userName?: string | null;
}

export function OnboardingWizard({ userName }: OnboardingWizardProps) {
    const searchParams = useSearchParams();
    const { update } = useSession();
    const [completing, setCompleting] = useState(false);
    const firstName = userName?.split(" ")[0];

    const complete = useCallback(async () => {
        setCompleting(true);
        try {
            await fetch("/api/onboarding", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
        } catch {
            // Non-critical — JWT callback self-heals via DB check
        }
        try {
            await update();
        } catch {
            // Non-critical
        }
        window.location.href = "/dashboard";
    }, [update]);

    // Handle broker connected via popup-blocked redirect
    useEffect(() => {
        if (searchParams.get("connected") === "true") {
            complete();
        }
    }, [searchParams, complete]);

    return (
        <div className="min-h-screen bg-[#FAFBF6] flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 sm:px-8 sm:py-6">
                <span className="text-[#2E4A3B] text-xl font-bold font-serif">Artha</span>
                <button
                    onClick={complete}
                    disabled={completing}
                    className="text-sm text-[#2E4A3B]/50 hover:text-[#2E4A3B]/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {completing ? "Loading..." : "Skip for now"}
                </button>
            </header>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center px-6 py-8">
                <div className="w-full max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-8"
                    >
                        {/* Headline */}
                        <div className="text-center space-y-2">
                            <h1 className="text-3xl sm:text-4xl font-bold text-[#2E4A3B] font-serif">
                                {firstName ? `${firstName}, you're in.` : "You're in."}
                            </h1>
                            <p className="text-[#2E4A3B]/60 text-base sm:text-lg">
                                One step left — connect your brokerage to unlock everything.
                            </p>
                        </div>

                        {/* What they unlock */}
                        <div className="space-y-1">
                            {[
                                "Trades sync automatically — no manual entry, ever",
                                "P&L calculated with FIFO accuracy across all accounts",
                                "AI coach spots your patterns and flags costly habits",
                            ].map((item, i) => (
                                <motion.div
                                    key={item}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.15 + i * 0.1 }}
                                    className="flex items-start gap-3 py-2"
                                >
                                    <div className="w-5 h-5 rounded-full bg-[#2E4A3B] flex items-center justify-center shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <span className="text-[#2E4A3B]/80 text-sm sm:text-base">{item}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Connect card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="relative overflow-hidden rounded-2xl border border-[#2E4A3B]/10 bg-white p-8 shadow-lg"
                        >
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#2E4A3B]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                            <div className="relative z-10 space-y-6">
                                {/* Trust pillars */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { icon: Lock, label: "Read-Only", sub: "Can't place trades" },
                                        { icon: EyeOff, label: "Encrypted", sub: "AES-256 security" },
                                        { icon: CheckCircle2, label: "SOC2 Type II", sub: "Industry standard" },
                                    ].map(({ icon: Icon, label, sub }, i) => (
                                        <motion.div
                                            key={label}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 + i * 0.07 }}
                                            className="flex flex-col items-center text-center"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-[#2E4A3B]/5 flex items-center justify-center mb-1.5">
                                                <Icon className="h-4 w-4 text-[#2E4A3B]/60" />
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-semibold text-[#2E4A3B]/60 uppercase tracking-wider">
                                                {label}
                                            </span>
                                            <p className="text-[10px] text-[#2E4A3B]/40 mt-0.5">{sub}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className="scale-110">
                                        <ConnectBrokerButton onSuccess={complete} />
                                    </div>
                                    <p className="text-xs text-[#2E4A3B]/40 text-center">
                                        25+ brokers — Robinhood, Schwab, Fidelity, IBKR, and more
                                    </p>
                                </div>

                                {completing && (
                                    <div className="flex items-center justify-center gap-2 text-sm text-[#2E4A3B]/50">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Taking you to your dashboard...</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Skip */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="text-center"
                        >
                            <button
                                onClick={complete}
                                disabled={completing}
                                className="text-sm text-[#2E4A3B]/40 hover:text-[#2E4A3B]/60 underline underline-offset-4 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                I&apos;ll connect later
                            </button>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
