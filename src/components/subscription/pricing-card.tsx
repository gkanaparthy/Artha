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
                    ? "bg-white border-2 border-[#2E4A3B] shadow-2xl scale-105 z-10"
                    : "bg-white/50 border border-[#2E4A3B]/10 hover:bg-white hover:shadow-xl"
            )}
        >
            {tag && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#2E4A3B] text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    {tag}
                </div>
            )}

            <div className="mb-8">
                <h3 className="text-xl font-bold text-[#2E4A3B] mb-2">{name}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[#2E4A3B]">{price}</span>
                    {subtitle && <span className="text-[#2E4A3B]/50 text-sm font-medium">{subtitle}</span>}
                </div>
                <p className="text-[#2E4A3B]/70 mt-4 text-sm leading-relaxed min-h-[40px]">
                    {description}
                </p>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#2E4A3B]/80">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-[#2E4A3B]/5 flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-[#2E4A3B]" />
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
                        ? "bg-[#2E4A3B] text-white hover:bg-[#2E4A3B]/90 shadow-lg shadow-[#2E4A3B]/20"
                        : "bg-white border border-[#2E4A3B]/20 text-[#2E4A3B] hover:bg-[#2E4A3B]/5"
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
