"use client";

import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PricingCardProps {
    name: string;
    price: string;
    description: string;
    features: string[];
    buttonText: string;
    onSelect: () => void;
    highlighted?: boolean;
    disabled?: boolean;
    loading?: boolean;
    subtitle?: string;
    tag?: string;
}

export function PricingCard({
    name,
    price,
    description,
    features,
    buttonText,
    onSelect,
    highlighted = false,
    disabled = false,
    loading = false,
    subtitle,
    tag
}: PricingCardProps) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className={cn(
                "relative flex flex-col p-8 rounded-3xl transition-all duration-300",
                highlighted
                    ? "bg-[#11211A] border-2 border-[#4ADE80] shadow-2xl scale-105 z-10"
                    : "bg-[#0A110D]/50 border border-white/10 hover:bg-[#11211A] hover:shadow-xl"
            )}
        >
            {tag && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#4ADE80] text-[#1A2F25] text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    {tag}
                </div>
            )}

            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{price}</span>
                    {subtitle && <span className="text-white/50 text-sm font-medium">{subtitle}</span>}
                </div>
                <p className="text-white/70 mt-4 text-sm leading-relaxed min-h-[40px]">
                    {description}
                </p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-[#4ADE80]" />
                        </div>
                        {feature}
                    </li>
                ))}
            </ul>

            <Button
                onClick={onSelect}
                disabled={disabled || loading}
                size="lg"
                className={cn(
                    "w-full rounded-2xl h-12 font-bold transition-all duration-300",
                    highlighted
                        ? "bg-[#4ADE80] text-[#1A2F25] hover:bg-[#4ADE80]/90 shadow-lg shadow-[#4ADE80]/20"
                        : "bg-transparent border border-white/20 text-white hover:bg-white/5"
                )}
            >
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processing...
                    </div>
                ) : buttonText}
            </Button>
        </motion.div>
    );
}
