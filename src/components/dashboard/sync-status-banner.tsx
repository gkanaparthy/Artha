"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SyncStatusBannerProps {
    isSyncing: boolean;
    tradeCount: number;
    onRefresh: () => void;
}

export function SyncStatusBanner({ isSyncing, tradeCount, onRefresh }: SyncStatusBannerProps) {
    // Simple: Only show when syncing
    if (!isSyncing) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            >
                <Card className="border-blue-500/20 bg-blue-500/5 overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                            </div>
                            <div>
                                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                                    Importing your trade history...
                                </h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {tradeCount > 0 ? (
                                        <>Found <strong>{tradeCount.toLocaleString()}</strong> trade{tradeCount !== 1 ? 's' : ''} so far. You can leave this page.</>
                                    ) : (
                                        <>Connecting to your broker. This may take a few minutes.</>
                                    )}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            className="bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 border-blue-200 dark:border-blue-800"
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-2" />
                            Refresh
                        </Button>
                    </div>
                    {/* Progress Bar Animation */}
                    <div className="h-1 w-full bg-blue-500/10">
                        <motion.div
                            className="h-full bg-blue-500"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{
                                repeat: Infinity,
                                duration: 2,
                                ease: "linear"
                            }}
                        />
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
