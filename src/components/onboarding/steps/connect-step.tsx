"use client";

import { motion } from "framer-motion";
import { Lock, EyeOff, CheckCircle2 } from "lucide-react";
import { ConnectBrokerButton } from "@/components/connect-broker-button";

interface ConnectStepProps {
    onConnected: () => void;
}

export function ConnectStep({ onConnected }: ConnectStepProps) {
    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#2E4A3B] font-serif">
                    See your real numbers
                </h1>
                <p className="text-[#2E4A3B]/70 text-base sm:text-lg max-w-md mx-auto">
                    Connect your brokerage to automatically import your trades. No manual entry ever.
                </p>
            </div>

            <div className="max-w-lg mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden rounded-2xl border border-[#2E4A3B]/10 bg-white p-8 sm:p-10 shadow-lg"
                >
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#2E4A3B]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                    <div className="relative z-10 space-y-8">
                        {/* Security trust pillars */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: Lock, label: "Bank-Level Security", sub: "AES-256 Encryption" },
                                { icon: EyeOff, label: "Read-Only Access", sub: "We can't place trades" },
                                { icon: CheckCircle2, label: "SOC2 Type II", sub: "Industry standard" },
                            ].map(({ icon: Icon, label, sub }, i) => (
                                <motion.div
                                    key={label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 + i * 0.08 }}
                                    className="flex flex-col items-center text-center"
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#2E4A3B]/5 flex items-center justify-center mb-2 text-[#2E4A3B]/60">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-[10px] sm:text-xs font-medium text-[#2E4A3B]/60 uppercase tracking-wider">
                                        {label}
                                    </span>
                                    <p className="text-[10px] text-[#2E4A3B]/40 mt-0.5">{sub}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Connect button */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="scale-125">
                                <ConnectBrokerButton onSuccess={onConnected} />
                            </div>
                            <p className="text-xs text-[#2E4A3B]/40 text-center">
                                25+ brokers including Robinhood, Schwab, Fidelity, and IBKR
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Skip option */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center mt-6"
                >
                    <button
                        onClick={onConnected}
                        className="text-sm text-[#2E4A3B]/50 hover:text-[#2E4A3B]/70 underline underline-offset-4 transition-colors cursor-pointer"
                    >
                        I&apos;ll connect later
                    </button>
                </motion.p>
            </div>
        </div>
    );
}
