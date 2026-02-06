"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { RefreshCw, HelpCircle, Heart, BookOpen, TrendingDown } from "lucide-react";

const CHALLENGES = [
    {
        id: "repeating_mistakes",
        label: "I keep repeating the same mistakes",
        icon: RefreshCw,
    },
    {
        id: "no_edge",
        label: "I don't know my real edge",
        icon: HelpCircle,
    },
    {
        id: "emotional_trading",
        label: "Emotions control my trades",
        icon: Heart,
    },
    {
        id: "no_journal",
        label: "I don't journal consistently",
        icon: BookOpen,
    },
    {
        id: "inconsistent",
        label: "My results are inconsistent",
        icon: TrendingDown,
    },
] as const;

export type Challenge = (typeof CHALLENGES)[number]["id"];

interface ChallengeStepProps {
    value: Challenge | null;
    onChange: (value: Challenge) => void;
}

export function ChallengeStep({ value, onChange }: ChallengeStepProps) {
    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#2E4A3B] font-serif">
                    What&apos;s holding your trading back?
                </h1>
                <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-md mx-auto">
                    Be honest &mdash; this helps us personalize your experience.
                </p>
            </div>

            <div className="space-y-3 max-w-lg mx-auto">
                {CHALLENGES.map(({ id, label, icon: Icon }, i) => (
                    <motion.button
                        key={id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => onChange(id)}
                        className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer text-left",
                            value === id
                                ? "border-[#2E4A3B] bg-[#2E4A3B]/5 shadow-sm"
                                : "border-[#2E4A3B]/10 bg-white hover:border-[#2E4A3B]/30 hover:bg-[#2E4A3B]/[0.02]"
                        )}
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            value === id ? "bg-[#2E4A3B]/10" : "bg-[#2E4A3B]/5"
                        )}>
                            <Icon className={cn(
                                "h-5 w-5",
                                value === id ? "text-[#2E4A3B]" : "text-[#2E4A3B]/40"
                            )} />
                        </div>
                        <span className={cn(
                            "text-sm sm:text-base font-medium",
                            value === id ? "text-[#2E4A3B]" : "text-[#2E4A3B]/70"
                        )}>
                            {label}
                        </span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
