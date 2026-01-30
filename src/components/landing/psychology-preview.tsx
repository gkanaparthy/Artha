"use client";

import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target, AlertTriangle, Brain } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });

const mistakeData = [
    { name: "FOMO", emoji: "🚫", cost: -1240.50, trades: 3 },
    { name: "Revenge Trade", emoji: "💢", cost: -1500.00, trades: 2 },
];

const setupData = [
    { name: "Breakout", emoji: "🎯", pnl: 12359.50, trades: 8, winRate: 87 },
    { name: "Support Bounce", emoji: "🛡️", pnl: 4226.35, trades: 5, winRate: 80 },
    { name: "ABCD Pattern", emoji: "📐", pnl: 1850.00, trades: 4, winRate: 75 },
];

const emotionData = [
    { name: "Focused", emoji: "🧘", winRate: 100, pnl: 14087.50, isPositive: true },
    { name: "Fear", emoji: "😨", winRate: 20, pnl: -2445.00, isPositive: false },
];

function formatCurrency(value: number): string {
    const prefix = value >= 0 ? "+$" : "-$";
    return prefix + Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PsychologyPreview() {
    const totalMistakeCost = mistakeData.reduce((acc, m) => acc + m.cost, 0);
    const currentPnL = 11586.35;
    const potentialPnL = currentPnL - totalMistakeCost;

    return (
        <section className="py-16 sm:py-20 md:py-24 bg-[#FAFBF6] relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-0 w-[30vw] h-[30vw] bg-[#E59889]/5 rounded-full blur-[80px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="absolute top-0 right-0 w-[25vw] h-[25vw] bg-[#E8EFE0]/50 rounded-full blur-[60px] -translate-y-1/4 translate-x-1/4 pointer-events-none" />

            <div className="container mx-auto px-4 max-w-6xl relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12 sm:mb-16"
                >
                    <h2 className={cn("text-2xl sm:text-3xl md:text-4xl font-bold text-[#2E4A3B] mb-3 sm:mb-4", playfair.className)}>
                        Your Trades Tell a Story. <span className="text-[#E59889]">Artha Finds the Patterns.</span>
                    </h2>
                    <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-2xl mx-auto px-4">
                        Tag every trade with setups, mistakes, and emotions. Watch the patterns emerge.
                    </p>
                </motion.div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
                    {/* Card 1: Mistake Cost / Behavioral Alpha */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-[#2E4A3B]/5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                            </div>
                            <h3 className="font-semibold text-[#2E4A3B]">Mistake Cost</h3>
                        </div>

                        <div className="space-y-3 mb-6">
                            {mistakeData.map((mistake) => (
                                <div key={mistake.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">{mistake.emoji}</span>
                                        <span className="text-sm text-[#2E4A3B]/80">{mistake.name}</span>
                                    </div>
                                    <span className="text-sm font-medium text-red-500">
                                        {formatCurrency(mistake.cost)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-[#2E4A3B]/10 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-[#2E4A3B]/60">Total Cost</span>
                                <span className="text-lg font-bold text-red-500">{formatCurrency(totalMistakeCost)}</span>
                            </div>
                            <div className="bg-[#E8EFE0] rounded-lg p-3 mt-3">
                                <p className="text-xs text-[#2E4A3B]/70 mb-1">What if you avoided these?</p>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span className="font-semibold text-green-600">{formatCurrency(potentialPnL)}</span>
                                    <span className="text-xs text-[#2E4A3B]/50">vs {formatCurrency(currentPnL)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 2: Setup Performance */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-[#2E4A3B]/5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-[#E8EFE0] flex items-center justify-center">
                                <Target className="w-4 h-4 text-[#2E4A3B]" />
                            </div>
                            <h3 className="font-semibold text-[#2E4A3B]">Your Best Setups</h3>
                        </div>

                        <div className="space-y-4">
                            {setupData.map((setup, index) => {
                                const maxPnL = Math.max(...setupData.map(s => s.pnl));
                                const barWidth = (setup.pnl / maxPnL) * 100;

                                return (
                                    <div key={setup.name}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{setup.emoji}</span>
                                                <span className="text-sm text-[#2E4A3B]/80">{setup.name}</span>
                                            </div>
                                            <span className="text-sm font-medium text-green-600">
                                                {formatCurrency(setup.pnl)}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-[#E8EFE0] rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${barWidth}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                                                className="h-full bg-gradient-to-r from-[#2E4A3B] to-[#4a7c5f] rounded-full"
                                            />
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-xs text-[#2E4A3B]/50">{setup.trades} trades</span>
                                            <span className="text-xs text-[#2E4A3B]/50">{setup.winRate}% win rate</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Card 3: Emotion Correlation */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="bg-white rounded-2xl p-6 shadow-lg border border-[#2E4A3B]/5"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <Brain className="w-4 h-4 text-purple-600" />
                            </div>
                            <h3 className="font-semibold text-[#2E4A3B]">Emotional Impact</h3>
                        </div>

                        <div className="space-y-4">
                            {emotionData.map((emotion) => (
                                <div
                                    key={emotion.name}
                                    className={cn(
                                        "rounded-xl p-4 border",
                                        emotion.isPositive
                                            ? "bg-green-50 border-green-100"
                                            : "bg-red-50 border-red-100"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">{emotion.emoji}</span>
                                            <span className="font-medium text-[#2E4A3B]">{emotion.name}</span>
                                        </div>
                                        {emotion.isPositive ? (
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-2xl font-bold text-[#2E4A3B]">{emotion.winRate}%</span>
                                            <span className="text-xs text-[#2E4A3B]/60">win rate</span>
                                        </div>
                                        <span className={cn(
                                            "font-semibold",
                                            emotion.isPositive ? "text-green-600" : "text-red-500"
                                        )}>
                                            {formatCurrency(emotion.pnl)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-xs text-[#2E4A3B]/50 mt-4 text-center">
                            See how your emotional state affects your trading
                        </p>
                    </motion.div>
                </div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-center mt-10 sm:mt-12"
                >
                    <p className="text-[#2E4A3B]/70 text-sm sm:text-base">
                        Stop guessing. Start knowing. <span className="text-[#E59889] font-medium">See your patterns →</span>
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
