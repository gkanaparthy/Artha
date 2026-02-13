"use client";

import { AlertCircle, ArrowRight, CheckCircle, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface TrialBannerProps {
    daysLeft: number | null;
    hasCommitted?: boolean;
    trialEndsAt?: string | null;
    isFreeUser?: boolean;
    lastSyncedAt?: string | null;
}

export function TrialBanner({ daysLeft, hasCommitted, trialEndsAt, isFreeUser, lastSyncedAt }: TrialBannerProps) {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    // FREE user: show downgrade banner (cannot be permanently dismissed)
    if (isFreeUser) {
        const daysSinceSync = lastSyncedAt
            ? Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        return (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="bg-orange-500/10 dark:bg-orange-500/15 border-b border-orange-500/20"
            >
                <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex-1 flex items-center min-w-0">
                            <span className="p-1.5 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400">
                                <RefreshCw className="h-4 w-4" />
                            </span>
                            <p className="ml-3 font-medium text-sm truncate">
                                <span className="md:hidden">
                                    Pro trial ended{daysSinceSync ? ` — ${daysSinceSync}d since last sync` : ''}
                                </span>
                                <span className="hidden md:inline text-muted-foreground">
                                    Your Pro trial has ended.{' '}
                                    {daysSinceSync ? (
                                        <span className="text-orange-600 dark:text-orange-400 font-bold">Trades haven&apos;t synced in {daysSinceSync} days.</span>
                                    ) : (
                                        <span>Upgrade to keep your journal current.</span>
                                    )}
                                </span>
                            </p>
                        </div>
                        <Link href="/pricing">
                            <Button size="sm" variant="default" className="text-xs h-8 px-3">
                                Upgrade to Pro
                                <ArrowRight className="ml-1.5 h-3 w-3" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Trial user who already committed (has CC on file)
    if (hasCommitted && trialEndsAt) {
        const formattedDate = new Date(trialEndsAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', timeZone: 'UTC'
        });

        return (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="bg-green-500/5 dark:bg-green-500/10 border-b border-green-500/20"
            >
                <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex-1 flex items-center min-w-0">
                            <span className="p-1.5 rounded-lg bg-green-500/20 text-green-600 dark:text-green-400">
                                <CheckCircle className="h-4 w-4" />
                            </span>
                            <p className="ml-3 font-medium text-sm truncate text-muted-foreground">
                                <span className="text-green-600 dark:text-green-400 font-bold">Pro plan locked in</span>
                                {' '}&mdash; billing starts {formattedDate}
                            </p>
                        </div>
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
            </motion.div>
        );
    }

    // App-only trial (no CC on file)
    if (daysLeft === null) return null;

    const isUrgent = daysLeft <= 7;
    const isCritical = daysLeft <= 3;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`border-b ${isCritical
                        ? 'bg-red-500/10 dark:bg-red-500/15 border-red-500/20'
                        : isUrgent
                            ? 'bg-orange-500/10 dark:bg-orange-500/15 border-orange-500/20'
                            : 'bg-primary/5 dark:bg-primary/10 border-primary/20'
                    }`}
            >
                <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex-1 flex items-center min-w-0">
                            <span className={`p-1.5 rounded-lg ${isCritical
                                    ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                                    : isUrgent
                                        ? 'bg-orange-500/20 text-orange-600'
                                        : 'bg-primary/20 text-primary'
                                }`}>
                                {isUrgent ? <AlertCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                            </span>
                            <p className="ml-3 font-medium text-sm truncate">
                                <span className="md:hidden">
                                    {daysLeft} days left in trial!
                                </span>
                                <span className="hidden md:inline text-muted-foreground">
                                    Pro trial: <span className="text-foreground font-bold">{daysLeft} days</span> remaining.
                                    {' '}Lock in your plan now &mdash; you won&apos;t be charged until your trial ends.
                                </span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href="/pricing">
                                <Button size="sm" variant="default" className="text-xs h-8 px-3">
                                    Upgrade to Pro
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
