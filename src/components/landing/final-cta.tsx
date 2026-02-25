"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });

export function FinalCTA() {
    return (
        <section className="relative py-24 md:py-32 bg-[#080A08] overflow-hidden">
            {/* Subtle radial glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4ADE80]/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 max-w-4xl relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 className={cn("text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6", playfair.className)}>
                        Your broker tracks your trades. <span className="italic text-[#4ADE80]">Artha tracks you.</span>
                    </h2>
                    <p className="text-lg text-white/60 max-w-xl mx-auto mb-10">
                        See what your behavior is really costing you.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/login">
                            <Button className="h-14 px-10 rounded-full bg-[#4ADE80] hover:bg-[#4ADE80]/90 text-[#1A2F25] font-bold text-lg shadow-lg shadow-[#4ADE80]/20 hover:shadow-xl hover:shadow-[#4ADE80]/30 transition-all group">
                                Connect Your Broker Free
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link href="/demo">
                            <Button variant="outline" className="h-14 px-10 rounded-full border-white/20 text-white hover:bg-white/5 text-lg">
                                Try Demo
                            </Button>
                        </Link>
                    </div>

                    <p className="text-sm text-white/40 mt-6">
                        No credit card required. Cancel anytime.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
