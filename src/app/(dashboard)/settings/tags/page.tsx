"use client";

import { motion } from "framer-motion";
import { TagManager } from "@/components/tag-manager";
import { PageTransition } from "@/components/motion";
import { ChevronLeft, Tags } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TagsSettingsPage() {
    return (
        <PageTransition>
            <div className="space-y-6 sm:space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <Link href="/settings">
                        <Button variant="ghost" size="sm" className="w-fit -ml-2 text-muted-foreground">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Back to Settings
                        </Button>
                    </Link>

                    <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="space-y-0.5 sm:space-y-1">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
                                <span className="text-gradient">Trade Tags</span>
                                <Tags className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 float" />
                            </h1>
                            <p className="text-sm sm:text-base text-muted-foreground">
                                Setups, mistakes, and emotions. Quantify your trading behavior.
                            </p>
                        </div>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <TagManager />
                </motion.div>

                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-6 flex gap-4 items-start">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Tags className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">Tagging Tip</h3>
                        <p className="text-sm text-blue-800/70 dark:text-blue-200/60 leading-relaxed">
                            Successful traders focus on their process, not just their P&L. By tagging your trades with
                            <b> Setups</b> and <b> Mistakes</b>, you can identify exactly which behaviors are making you money
                            and which are costing you.
                        </p>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
