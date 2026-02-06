"use client";

import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { Link2, RefreshCw, TrendingUp } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });

const steps = [
    {
        number: "01",
        icon: Link2,
        title: "Connect",
        description: "Link your broker in 30 seconds. 100+ brokerages supported including Robinhood, Interactive Brokers, Schwab, and Zerodha.",
        color: "bg-[#E8EFE0] text-[#2E4A3B]",
    },
    {
        number: "02",
        icon: RefreshCw,
        title: "Trade",
        description: "Artha auto-syncs every trade. Tag your setups, mistakes, and emotions — zero manual entry required.",
        color: "bg-[#E59889]/10 text-[#E59889]",
    },
    {
        number: "03",
        icon: TrendingUp,
        title: "Grow",
        description: "See your Behavioral Alpha — the exact dollar cost of your mistakes. Understand what's working and what's not.",
        color: "bg-[#4ADE80]/10 text-[#16A34A]",
    },
];

export function HowItWorks() {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className={cn("text-3xl md:text-5xl font-bold text-[#2E4A3B] mb-4", playfair.className)}>
                            How It Works
                        </h2>
                        <p className="text-lg text-[#2E4A3B]/70 max-w-2xl mx-auto">
                            From connected broker to actionable insights in minutes.
                        </p>
                    </motion.div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
                    {/* Connecting line (desktop only) */}
                    <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-[#2E4A3B]/10 via-[#2E4A3B]/20 to-[#2E4A3B]/10" />

                    {steps.map((step, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: idx * 0.15 }}
                            className="flex flex-col items-center text-center relative"
                        >
                            {/* Number + Icon */}
                            <div className="relative mb-6">
                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", step.color)}>
                                    <step.icon className="h-7 w-7" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#2E4A3B] text-white text-xs font-bold flex items-center justify-center">
                                    {step.number}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-[#2E4A3B] mb-3">{step.title}</h3>
                            <p className="text-[#2E4A3B]/70 text-sm leading-relaxed max-w-xs">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
