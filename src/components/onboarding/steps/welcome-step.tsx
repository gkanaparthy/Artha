"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, Layers, Bitcoin, Shuffle } from "lucide-react";

const TRADING_STYLES = [
    { id: "stocks", label: "Stocks", icon: TrendingUp },
    { id: "options", label: "Options", icon: Layers },
    { id: "futures", label: "Futures", icon: BarChart3 },
    { id: "crypto", label: "Crypto", icon: Bitcoin },
    { id: "mixed", label: "A bit of everything", icon: Shuffle },
] as const;

export type TradingStyle = (typeof TRADING_STYLES)[number]["id"];

interface WelcomeStepProps {
    userName?: string | null;
    value: TradingStyle | null;
    onChange: (value: TradingStyle) => void;
}

export function WelcomeStep({ userName, value, onChange }: WelcomeStepProps) {
    const firstName = userName?.split(" ")[0];

    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#2E4A3B] font-serif">
                    {firstName ? `Welcome, ${firstName}` : "Welcome to Artha"}
                </h1>
                <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-md mx-auto">
                    You&apos;re here because you know your trading can be better. Let&apos;s set things up.
                </p>
            </div>

            <div className="space-y-3">
                <p className="text-sm font-medium text-[#2E4A3B]/60 text-center">
                    What do you trade?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                    {TRADING_STYLES.map(({ id, label, icon: Icon }, i) => (
                        <motion.button
                            key={id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => onChange(id)}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                value === id
                                    ? "border-[#2E4A3B] bg-[#2E4A3B]/5 shadow-sm"
                                    : "border-[#2E4A3B]/10 bg-white hover:border-[#2E4A3B]/30 hover:bg-[#2E4A3B]/[0.02]",
                                id === "mixed" && "col-span-2 sm:col-span-1"
                            )}
                        >
                            <Icon className={cn(
                                "h-6 w-6",
                                value === id ? "text-[#2E4A3B]" : "text-[#2E4A3B]/40"
                            )} />
                            <span className={cn(
                                "text-sm font-medium",
                                value === id ? "text-[#2E4A3B]" : "text-[#2E4A3B]/70"
                            )}>
                                {label}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
