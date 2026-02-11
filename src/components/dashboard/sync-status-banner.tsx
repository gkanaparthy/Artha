"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export interface SyncStatusAccount {
    brokerName: string | null;
    syncStatus: string;
    syncStartedAt: string | null;
    syncTradeCount: number;
    syncError: string | null;
    syncRetryCount: number;
}

export interface SyncState {
    overall: 'syncing' | 'completed' | 'failed' | 'idle' | 'timeout';
    accounts: SyncStatusAccount[];
    totalTradeCount: number;
}

interface SyncStatusBannerProps {
    syncState: SyncState | null;
    onRetry: () => void;
}

export function SyncStatusBanner({ syncState, onRetry }: SyncStatusBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    // Auto-dismiss on COMPLETED after 5 seconds
    useEffect(() => {
        if (syncState?.overall === 'completed' && syncState.totalTradeCount > 0) {
            const timer = setTimeout(() => setDismissed(true), 5000);
            return () => clearTimeout(timer);
        }
    }, [syncState?.overall, syncState?.totalTradeCount]);

    // Reset dismissed when state changes to something active
    useEffect(() => {
        if (syncState?.overall === 'syncing') {
            setDismissed(false);
        }
    }, [syncState?.overall]);

    if (!syncState || syncState.overall === 'idle' || dismissed) return null;

    const brokerNames = syncState.accounts
        .filter(a => a.brokerName)
        .map(a => a.brokerName)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join(', ') || 'your broker';

    const pendingAccounts = syncState.accounts.filter(a => a.syncStatus === 'PENDING');
    const inProgressAccounts = syncState.accounts.filter(a => a.syncStatus === 'IN_PROGRESS');

    const getContent = () => {
        switch (syncState.overall) {
            case 'syncing': {
                if (pendingAccounts.length > 0 && inProgressAccounts.length === 0) {
                    return {
                        icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
                        iconBg: 'bg-blue-500/10',
                        borderColor: 'border-blue-500/20',
                        bgColor: 'bg-blue-500/5',
                        title: `Waiting for ${brokerNames} to prepare your trade history...`,
                        titleColor: 'text-blue-900 dark:text-blue-100',
                        subtitle: 'This usually takes 1-5 minutes for screen-scraping brokers like Robinhood.',
                        subtitleColor: 'text-blue-700 dark:text-blue-300',
                        progressColor: 'bg-blue-500',
                        progressBg: 'bg-blue-500/10',
                        showProgress: true,
                    };
                }
                const tradesFound = syncState.accounts.reduce((sum, a) => sum + a.syncTradeCount, 0);
                return {
                    icon: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
                    iconBg: 'bg-blue-500/10',
                    borderColor: 'border-blue-500/20',
                    bgColor: 'bg-blue-500/5',
                    title: `Importing trades from ${brokerNames}...`,
                    titleColor: 'text-blue-900 dark:text-blue-100',
                    subtitle: tradesFound > 0
                        ? `${tradesFound.toLocaleString()} trades found so far. You can leave this page.`
                        : 'Connecting to your broker. This may take a few minutes.',
                    subtitleColor: 'text-blue-700 dark:text-blue-300',
                    progressColor: 'bg-blue-500',
                    progressBg: 'bg-blue-500/10',
                    showProgress: true,
                };
            }

            case 'completed': {
                const totalTrades = syncState.totalTradeCount;
                if (totalTrades === 0) {
                    return {
                        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                        iconBg: 'bg-green-500/10',
                        borderColor: 'border-green-500/20',
                        bgColor: 'bg-green-500/5',
                        title: 'Connected! No trades found in your account.',
                        titleColor: 'text-green-900 dark:text-green-100',
                        subtitle: 'If you expect trades, try syncing manually or check back later.',
                        subtitleColor: 'text-green-700 dark:text-green-300',
                        showProgress: false,
                    };
                }
                return {
                    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                    iconBg: 'bg-green-500/10',
                    borderColor: 'border-green-500/20',
                    bgColor: 'bg-green-500/5',
                    title: `All done! ${totalTrades.toLocaleString()} trades imported from ${brokerNames}.`,
                    titleColor: 'text-green-900 dark:text-green-100',
                    subtitle: '',
                    subtitleColor: 'text-green-700 dark:text-green-300',
                    showProgress: false,
                };
            }

            case 'failed':
                return {
                    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
                    iconBg: 'bg-amber-500/10',
                    borderColor: 'border-amber-500/20',
                    bgColor: 'bg-amber-500/5',
                    title: 'We had trouble importing your trades.',
                    titleColor: 'text-amber-900 dark:text-amber-100',
                    subtitle: 'If this persists, trades will sync automatically within a few hours.',
                    subtitleColor: 'text-amber-700 dark:text-amber-300',
                    showProgress: false,
                    showRetry: true,
                };

            case 'timeout':
                return {
                    icon: <Clock className="h-4 w-4 text-gray-500" />,
                    iconBg: 'bg-gray-500/10',
                    borderColor: 'border-gray-500/20',
                    bgColor: 'bg-gray-500/5',
                    title: 'This is taking longer than usual.',
                    titleColor: 'text-gray-900 dark:text-gray-100',
                    subtitle: "We'll keep trying in the background. You can also try manually:",
                    subtitleColor: 'text-gray-700 dark:text-gray-300',
                    showProgress: false,
                    showRetry: true,
                };

            default:
                return null;
        }
    };

    const content = getContent();
    if (!content) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            >
                <Card className={`${content.borderColor} ${content.bgColor} overflow-hidden`}>
                    <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full ${content.iconBg} flex items-center justify-center shrink-0`}>
                                {content.icon}
                            </div>
                            <div>
                                <h3 className={`font-medium ${content.titleColor}`}>
                                    {content.title}
                                </h3>
                                {content.subtitle && (
                                    <p className={`text-sm ${content.subtitleColor}`}>
                                        {content.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                        {'showRetry' in content && content.showRetry && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRetry}
                                className="bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 shrink-0"
                            >
                                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                Retry
                            </Button>
                        )}
                    </div>
                    {content.showProgress && (
                        <div className={`h-1 w-full ${content.progressBg || 'bg-blue-500/10'}`}>
                            <motion.div
                                className={`h-full ${content.progressColor || 'bg-blue-500'}`}
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 2,
                                    ease: "linear"
                                }}
                            />
                        </div>
                    )}
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
