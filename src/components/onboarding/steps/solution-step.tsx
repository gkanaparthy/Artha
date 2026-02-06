"use client";

import { motion } from "framer-motion";
import { Tags, Brain, BarChart3, TrendingUp, Heart, Target, Zap, LineChart } from "lucide-react";
import type { Challenge } from "./challenge-step";

const SOLUTION_CONTENT: Record<Challenge, {
    heading: string;
    subheading: string;
    features: { icon: React.ElementType; title: string; description: string }[];
}> = {
    repeating_mistakes: {
        heading: "Never repeat the same mistake twice",
        subheading: "Artha tracks your patterns so you can break the cycle.",
        features: [
            { icon: Tags, title: "Mistake Tagging", description: "Tag every trade with what went wrong — FOMO, revenge trading, no stop loss" },
            { icon: Brain, title: "AI Pattern Detection", description: "AI analyzes your tagged trades and surfaces the patterns you can't see" },
            { icon: BarChart3, title: "Cost-per-Mistake", description: "See exactly how much each mistake costs you in dollars" },
        ],
    },
    no_edge: {
        heading: "Discover your real edge",
        subheading: "Stop guessing. Start trading with data.",
        features: [
            { icon: Tags, title: "Setup Tracking", description: "Tag every trade with your setup — breakout, pullback, momentum, etc." },
            { icon: TrendingUp, title: "Win Rate by Setup", description: "See which setups actually make you money and which don't" },
            { icon: BarChart3, title: "Performance Reports", description: "Detailed P&L breakdown by setup, symbol, time of day" },
        ],
    },
    emotional_trading: {
        heading: "Take emotions out of trading",
        subheading: "Track what you feel. Trade what you see.",
        features: [
            { icon: Heart, title: "Emotion Tags", description: "Log the emotion behind every trade — fear, greed, confidence, anxiety" },
            { icon: LineChart, title: "Behavioral Alpha", description: "Measure the gap between emotional and disciplined trades in dollars" },
            { icon: Brain, title: "AI Coaching", description: "Personalized feedback on your emotional patterns and triggers" },
        ],
    },
    no_journal: {
        heading: "Journaling that does itself",
        subheading: "Connect your broker. Artha does the rest.",
        features: [
            { icon: Zap, title: "Zero Manual Entry", description: "Trades sync automatically from 25+ brokers — no spreadsheets needed" },
            { icon: BarChart3, title: "Instant Analytics", description: "P&L, win rate, and profit factor calculated automatically via FIFO" },
            { icon: Brain, title: "AI Insights", description: "Get personalized coaching without writing a single journal entry" },
        ],
    },
    inconsistent: {
        heading: "Build a repeatable process",
        subheading: "Consistency starts with visibility.",
        features: [
            { icon: Target, title: "Process Tracking", description: "Tag trades with your setup and see if you're following your rules" },
            { icon: BarChart3, title: "Consistency Metrics", description: "Track your profit factor and win rate over time — not just P&L" },
            { icon: Brain, title: "AI Accountability", description: "Get called out when your behavior drifts from your stated process" },
        ],
    },
};

interface SolutionStepProps {
    challenge: Challenge | null;
}

export function SolutionStep({ challenge }: SolutionStepProps) {
    const content = SOLUTION_CONTENT[challenge || "repeating_mistakes"];

    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#2E4A3B] font-serif">
                    {content.heading}
                </h1>
                <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-md mx-auto">
                    {content.subheading}
                </p>
            </div>

            <div className="grid gap-4 max-w-lg mx-auto">
                {content.features.map(({ icon: Icon, title, description }, i) => (
                    <motion.div
                        key={title}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-4 p-5 rounded-xl bg-white border border-[#2E4A3B]/10 shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-lg bg-[#2E4A3B]/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-[#2E4A3B]" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-[#2E4A3B] text-sm sm:text-base">
                                {title}
                            </h3>
                            <p className="text-[#2E4A3B]/60 text-sm mt-1 leading-relaxed">
                                {description}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
