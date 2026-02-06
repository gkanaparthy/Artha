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
        <section className="relative py-24 md:py-32 bg-[#1A2F25] overflow-hidden">
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
                        Ready to Find Your <span className="italic text-[#4ADE80]">Edge</span>?
                    </h2>
                    <p className="text-lg text-white/60 max-w-xl mx-auto mb-10">
                        Stop repeating the same mistakes. Start every trading day with clarity about what works, what doesn&apos;t, and why.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/login">
                            <Button className="h-14 px-10 rounded-full bg-[#4ADE80] hover:bg-[#4ADE80]/90 text-[#1A2F25] font-bold text-lg shadow-lg shadow-[#4ADE80]/20 hover:shadow-xl hover:shadow-[#4ADE80]/30 transition-all group">
                                Start Your Free Trial
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
                        30-day free trial &middot; No credit card required &middot; Cancel anytime
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
