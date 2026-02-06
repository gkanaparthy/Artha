"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
    currentStep: number;
    totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
    return (
        <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                    key={i}
                    className={cn(
                        "h-1.5 rounded-full transition-colors duration-300",
                        i <= currentStep ? "bg-[#2E4A3B]" : "bg-[#2E4A3B]/15"
                    )}
                    initial={false}
                    animate={{
                        width: i === currentStep ? 32 : 12,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}
