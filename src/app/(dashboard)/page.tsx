"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionsTable } from "@/components/positions-table";
import { Button } from "@/components/ui/button";
import {
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Target,
    DollarSign,
    BarChart3,
    Activity,
    Calendar,
    CalendarDays,
    Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";

interface Metrics {
    netPnL: number;
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number | null;
    winningTrades: number;
    losingTrades: number;
    mtdPnL: number;
    ytdPnL: number;
}

function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor = "text-muted-foreground",
    valueColor = "",
    delay = 0,
    glowClass = "",
}: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ElementType;
    iconColor?: string;
    valueColor?: string;
    delay?: number;
    glowClass?: string;
}) {
    return (
        <AnimatedCard delay={delay}>
            <Card className={cn(
                "h-full card-hover overflow-hidden relative glass border-0",
                glowClass && `hover:${glowClass}`
            )}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <div className="metric-icon-bg">
                        <Icon className={cn("h-4 w-4", iconColor)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <motion.div
                        className={cn("text-2xl font-bold stat-number", valueColor)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: delay + 0.2 }}
                    >
                        {value}
                    </motion.div>
                    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                </CardContent>
            </Card>
        </AnimatedCard>
    );
}

export default function DashboardPage() {
    const [syncing, setSyncing] = useState(false);
    const [metrics, setMetrics] = useState<Metrics>({
        netPnL: 0,
        winRate: 0,
        totalTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: null,
        winningTrades: 0,
        losingTrades: 0,
        mtdPnL: 0,
        ytdPnL: 0,
    });
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchMetrics = useCallback(async () => {
        try {
            const res = await fetch(`/api/metrics`);
            const data = await res.json();
            setMetrics(data);
        } catch (e) {
            console.error(e);
        }
    }, []);

    const handleSync = async () => {
        try {
            setSyncing(true);
            await fetch("/api/trades/sync", {
                method: "POST",
            });
            fetchMetrics();
            setRefreshKey((k) => k + 1);
        } catch (e) {
            console.error(e);
            alert("Sync failed");
        } finally {
            setSyncing(false);
        }
    };

    const handleMetricsUpdate = useCallback((newMetrics: Metrics) => {
        setMetrics(newMetrics);
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    const formatCurrency = (value: number, showSign = false) => {
        const formatted = Math.abs(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        if (showSign && value !== 0) {
            return value >= 0 ? `+$${formatted}` : `-$${formatted}`;
        }
        return `$${formatted}`;
    };

    const getPnLColor = (value: number) => {
        if (value > 0) return "text-gradient-green";
        if (value < 0) return "text-gradient-red";
        return "text-muted-foreground";
    };

    const getWinRateColor = (value: number) => {
        if (value >= 60) return "text-gradient-green";
        if (value >= 50) return "text-amber-500";
        return "text-gradient-red";
    };

    const getProfitFactorColor = (value: number | null) => {
        if (value === null) return "text-muted-foreground";
        if (value >= 2) return "text-gradient-green";
        if (value >= 1) return "text-amber-500";
        return "text-gradient-red";
    };

    return (
        <PageTransition>
            <div className="space-y-8">
                {/* Header */}
                <motion.div
                    className="flex items-center justify-between"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <span className="text-gradient">Dashboard</span>
                            <Sparkles className="h-6 w-6 text-amber-500 float" />
                        </h1>
                        <p className="text-muted-foreground">Track your trading performance at a glance</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleSync}
                        disabled={syncing}
                        className="btn-glow"
                    >
                        <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
                        Sync Trades
                    </Button>
                </motion.div>

                {/* Main Metrics Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Net P&L"
                        value={formatCurrency(metrics.netPnL, true)}
                        subtitle="From filtered positions"
                        icon={DollarSign}
                        iconColor={metrics.netPnL >= 0 ? "text-green-500" : "text-red-500"}
                        valueColor={getPnLColor(metrics.netPnL)}
                        delay={0.1}
                        glowClass={metrics.netPnL >= 0 ? "glow-green" : "glow-red"}
                    />
                    <MetricCard
                        title="Win Rate"
                        value={`${metrics.winRate}%`}
                        subtitle={`${metrics.winningTrades}W / ${metrics.losingTrades}L`}
                        icon={Target}
                        iconColor="text-amber-500"
                        valueColor={getWinRateColor(metrics.winRate)}
                        delay={0.15}
                    />
                    <MetricCard
                        title="MTD P&L"
                        value={formatCurrency(metrics.mtdPnL, true)}
                        subtitle="Month to date"
                        icon={Calendar}
                        iconColor={metrics.mtdPnL >= 0 ? "text-green-500" : "text-red-500"}
                        valueColor={getPnLColor(metrics.mtdPnL)}
                        delay={0.2}
                    />
                    <MetricCard
                        title="YTD P&L"
                        value={formatCurrency(metrics.ytdPnL, true)}
                        subtitle="Year to date"
                        icon={CalendarDays}
                        iconColor={metrics.ytdPnL >= 0 ? "text-green-500" : "text-red-500"}
                        valueColor={getPnLColor(metrics.ytdPnL)}
                        delay={0.25}
                    />
                </div>

                {/* Secondary Metrics Row */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Profit Factor"
                        value={metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : "—"}
                        subtitle="Gross profit / Gross loss"
                        icon={BarChart3}
                        iconColor="text-blue-500"
                        valueColor={getProfitFactorColor(metrics.profitFactor)}
                        delay={0.3}
                    />
                    <MetricCard
                        title="Total Trades"
                        value={metrics.totalTrades}
                        subtitle="Closed positions"
                        icon={Activity}
                        iconColor="text-purple-500"
                        delay={0.35}
                    />
                    <MetricCard
                        title="Average Win"
                        value={formatCurrency(metrics.avgWin, true)}
                        subtitle="Mean profit per win"
                        icon={TrendingUp}
                        iconColor="text-green-500"
                        valueColor="text-gradient-green"
                        delay={0.4}
                        glowClass="glow-green"
                    />
                    <MetricCard
                        title="Average Loss"
                        value={formatCurrency(-metrics.avgLoss, true)}
                        subtitle="Mean loss per loss"
                        icon={TrendingDown}
                        iconColor="text-red-500"
                        valueColor="text-gradient-red"
                        delay={0.45}
                        glowClass="glow-red"
                    />
                </div>

                {/* Positions Table */}
                <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                >
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold">Positions</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent" />
                    </div>
                    <PositionsTable key={refreshKey} onMetricsUpdate={handleMetricsUpdate} />
                </motion.div>
            </div>
        </PageTransition>
    );
}
