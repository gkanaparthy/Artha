"use client";

import { AlertCircle, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface TrialBannerProps {
    daysLeft: number | null;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible || daysLeft === null) return null;

    const isUrgent = daysLeft <= 7;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-primary/5 dark:bg-primary/10 border-b border-primary/20"
            >
                <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex-1 flex items-center min-w-0">
                            <span className={`p-1.5 rounded-lg ${isUrgent ? 'bg-orange-500/20 text-orange-600' : 'bg-primary/20 text-primary'}`}>
                                {isUrgent ? <AlertCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                            </span>
                            <p className="ml-3 font-medium text-sm truncate">
                                <span className="md:hidden">
                                    {daysLeft} days left in trial!
                                </span>
                                <span className="hidden md:inline text-muted-foreground">
                                    You have <span className="text-foreground font-bold">{daysLeft} days</span> remaining in your Artha Pro free trial.
                                </span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/pricing">
                                <Button size="sm" variant="default" className="text-xs h-8 px-3">
                                    Upgrade Now
                                    <ArrowRight className="ml-1.5 h-3 w-3" />
                                </Button>
                            </Link>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors text-muted-foreground"
                            >
                                <span className="sr-only">Dismiss</span>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
