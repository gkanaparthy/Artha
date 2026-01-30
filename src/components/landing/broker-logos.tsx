"use client";

import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import Image from "next/image";

const playfair = Playfair_Display({ subsets: ["latin"] });

const brokers = [
    { name: "Robinhood", logo: "/brokers/robinhood.svg", isSvg: true },
    { name: "Fidelity", logo: null, isSvg: false },
    { name: "Zerodha", logo: "/brokers/zerodha.svg", isSvg: true },
    { name: "Interactive Brokers", logo: null, isSvg: false },
    { name: "Schwab", logo: null, isSvg: false },
    { name: "Webull", logo: null, isSvg: false },
    { name: "Coinbase", logo: "/brokers/coinbase.svg", isSvg: true },
    { name: "Binance", logo: "/brokers/binance.svg", isSvg: true },
];

export function BrokerLogos() {
    return (
        <section className="py-20 bg-[#FAFBF6]">
            <div className="container mx-auto px-4 max-w-6xl text-center">
                <h2 className={cn("text-2xl md:text-3xl font-bold text-[#2E4A3B] mb-12", playfair.className)}>
                    Works with your broker
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12">
                    {brokers.map((broker, idx) => (
                        <motion.div
                            key={idx}
                            whileHover={{ scale: 1.05 }}
                            className="bg-white p-6 rounded-2xl border border-[#2E4A3B]/5 shadow-sm flex items-center justify-center transition-all cursor-default group h-24"
                        >
                            {broker.logo ? (
                                <div className="relative w-full h-full flex items-center justify-center grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100">
                                    <img
                                        src={broker.logo}
                                        alt={broker.name}
                                        className="max-h-12 w-auto object-contain"
                                        onError={(e) => {
                                            // Fallback to text if image fails
                                            (e.target as any).style.display = 'none';
                                            (e.target as any).nextSibling.style.display = 'block';
                                        }}
                                    />
                                    <span className="font-bold text-[#2E4A3B] text-lg hidden">{broker.name}</span>
                                </div>
                            ) : (
                                <span className="font-bold text-[#2E4A3B] text-lg opacity-40 group-hover:opacity-100 transition-opacity duration-300">
                                    {broker.name}
                                </span>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <p className="text-[#2E4A3B]/50 text-sm font-medium">
                        100+ brokerages supported including Interactive Brokers, Zerodha, and more
                    </p>
                    <div className="px-3 py-1 rounded-full bg-[#E8EFE0] text-[#2E4A3B] text-xs font-bold border border-[#2E4A3B]/5">
                        +90 MORE
                    </div>
                </div>
            </div>
        </section>
    );
}
