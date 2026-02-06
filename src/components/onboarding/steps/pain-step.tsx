"use client";

import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown } from "lucide-react";
import type { Challenge } from "./challenge-step";

const PAIN_CONTENT: Record<Challenge, {
    heading: string;
    stat: string;
    detail: string;
    cost: string;
}> = {
    repeating_mistakes: {
        heading: "The cost of repeating mistakes",
        stat: "82%",
        detail: "of traders who don't journal repeat the same mistakes within 30 days.",
        cost: "The average cost? $2,400/month in avoidable losses.",
    },
    no_edge: {
        heading: "Trading without knowing your edge",
        stat: "88%",
        detail: "of traders can't name their 3 best-performing setups.",
        cost: "Without data, you're gambling — not trading.",
    },
    emotional_trading: {
        heading: "What emotions cost traders",
        stat: "31%",
        detail: "of annual returns are lost to emotional decisions, on average.",
        cost: "Traders who track emotions are 2.3x more likely to be profitable.",
    },
    no_journal: {
        heading: "The journaling gap",
        stat: "18%",
        detail: "improvement in win rate within 90 days for consistent journalers.",
        cost: "The gap between knowing and doing is a journal.",
    },
    inconsistent: {
        heading: "The consistency problem",
        stat: "67%",
        detail: "higher profit factor for traders with a consistent process.",
        cost: "Your edge exists — you just can't see it yet.",
    },
};

interface PainStepProps {
    challenge: Challenge | null;
}

export function PainStep({ challenge }: PainStepProps) {
    const content = PAIN_CONTENT[challenge || "repeating_mistakes"];

    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#2E4A3B] font-serif">
                    {content.heading}
                </h1>
            </div>

            <div className="max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative overflow-hidden rounded-2xl border border-[#E59889]/20 bg-gradient-to-br from-white to-[#E59889]/5 p-8 sm:p-10"
                >
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#E59889]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 text-[#E59889]">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="text-sm font-semibold uppercase tracking-wider">The data</span>
                        </div>

                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-baseline gap-3"
                            >
                                <span className="text-5xl sm:text-6xl font-bold text-[#E59889] font-serif">
                                    {content.stat}
                                </span>
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-[#2E4A3B]/80 text-lg leading-relaxed"
                            >
                                {content.detail}
                            </motion.p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-start gap-3 p-4 rounded-xl bg-[#2E4A3B]/5 border border-[#2E4A3B]/10"
                        >
                            <TrendingDown className="h-5 w-5 text-[#2E4A3B] flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium text-[#2E4A3B]">
                                {content.cost}
                            </p>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
