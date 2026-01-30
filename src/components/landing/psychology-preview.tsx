"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { Target, Brain, Smile } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });

export function PsychologyPreview() {
    return (
        <section className="py-20 bg-[#FAFBF6] overflow-hidden">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                        Your Trades Tell a Story. <br />
                        <span className="italic text-[#E59889]">Artha Finds the Patterns.</span>
                    </h2>
                    <p className="text-lg text-[#2E4A3B]/70 max-w-2xl mx-auto">
                        Every trade reveals something about your psychology. Tag each trade with setups, mistakes, and emotions.
                        Then watch the patterns emerge.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Behavioral Alpha Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="bg-white p-8 rounded-3xl shadow-xl border border-[#2E4A3B]/5 flex flex-col h-full"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                                <Brain className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-bold text-[#2E4A3B]">Behavioral Alpha</h3>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div>
                                <div className="text-sm text-[#2E4A3B]/60 mb-1">Mistake Cost</div>
                                <div className="text-3xl font-bold text-red-500">-$2,740.50</div>
                            </div>

                            <div className="space-y-2 border-l-2 border-red-100 pl-4 ml-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#2E4A3B]/70">FOMO (🚫)</span>
                                    <span className="font-medium text-red-400">-$1,240.50</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#2E4A3B]/70">Revenge Trade</span>
                                    <span className="font-medium text-red-400">-$1,500.00</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#2E4A3B]/5">
                                <div className="text-sm text-[#2E4A3B]/60 mb-1">What If You Avoided These?</div>
                                <div className="text-2xl font-bold text-green-600">+$14,326.85</div>
                                <div className="text-xs text-[#2E4A3B]/50 mt-1">(vs current +$11,586.35)</div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-[#E8EFE0]/50 rounded-2xl italic text-sm text-[#2E4A3B]/80 text-center">
                            "If you had avoided these mistakes, you'd be $2,740.50 more profitable"
                        </div>
                    </motion.div>

                    {/* Setup Performance Bars */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="bg-white p-8 rounded-3xl shadow-xl border border-[#2E4A3B]/5 flex flex-col h-full"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                <Target className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-bold text-[#2E4A3B]">Best Setups</h3>
                        </div>

                        <div className="space-y-8 flex-1">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-semibold text-[#2E4A3B]">Breakout (🎯)</span>
                                    <span className="text-green-600">+$12,359.50</span>
                                </div>
                                <div className="h-3 w-full bg-[#FAFBF6] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: "100%" }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                        className="h-full bg-green-500 rounded-full"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-semibold text-[#2E4A3B]">Support Bounce (🛡️)</span>
                                    <span className="text-green-600">+$4,226.35</span>
                                </div>
                                <div className="h-3 w-full bg-[#FAFBF6] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: "45%" }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.7 }}
                                        className="h-full bg-green-400 rounded-full"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-semibold text-[#2E4A3B]">ABCD Pattern</span>
                                    <span className="text-green-600">+$1,850.00</span>
                                </div>
                                <div className="h-3 w-full bg-[#FAFBF6] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        whileInView={{ width: "20%" }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1, delay: 0.9 }}
                                        className="h-full bg-green-300 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-center">
                            <Link href="/login" className="text-[#E59889] font-medium text-sm hover:underline">
                                See your patterns →
                            </Link>
                        </div>
                    </motion.div>

                    {/* Emotion Correlation */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="bg-white p-8 rounded-3xl shadow-xl border border-[#2E4A3B]/5 flex flex-col h-full"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                <Smile className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-bold text-[#2E4A3B]">Emotional Impact</h3>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div className="p-4 rounded-2xl bg-[#E8EFE0]/30 border border-[#2E4A3B]/5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🧘</span>
                                        <span className="font-bold text-[#2E4A3B]">Focused</span>
                                    </div>
                                    <span className="text-green-600 font-bold">100% win rate</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600">+$14,087.50</div>
                                <div className="text-xs text-[#2E4A3B]/50 mt-1">Consistency is your superpower</div>
                            </div>

                            <div className="p-4 rounded-2xl bg-red-50/30 border border-red-100">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">😨</span>
                                        <span className="font-bold text-[#2E4A3B]">Fear</span>
                                    </div>
                                    <span className="text-red-500 font-bold">0% win rate</span>
                                </div>
                                <div className="text-2xl font-bold text-red-500">-$2,445.00</div>
                                <div className="text-xs text-[#2E4A3B]/50 mt-1">Fear is costing you clarity</div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 rounded-2xl bg-[#FAFBF6] text-xs text-[#2E4A3B]/60 text-center">
                            "You are significantly more profitable when trading with a 'Focused' mindset."
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
