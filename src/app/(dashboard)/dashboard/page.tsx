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
import { useFilters } from "@/contexts/filter-context";

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
    const { filters } = useFilters();
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

    // Fetch metrics whenever ANY filter changes
    const fetchMetrics = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (filters.symbol) params.append("symbol", filters.symbol);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.accountId && filters.accountId !== 'all') params.append("accountId", filters.accountId);
            if (filters.assetType && filters.assetType !== 'all') params.append("assetType", filters.assetType);
            // Status filter is applied client-side after fetch

            const res = await fetch(`/api/metrics?${params.toString()}`);
            const data = await res.json();
            setMetrics(data);
        } catch (e) {
            console.error(e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(filters)]); // React to ALL filter changes

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

    // Update metrics when PositionsTable applies client-side filters (status filter)
    const handleMetricsUpdate = useCallback((newMetrics: Metrics) => {
        setMetrics(prev => ({
            ...prev,
            // Only update the fields that are affected by status filter
            netPnL: newMetrics.netPnL,
            winRate: newMetrics.winRate,
            totalTrades: newMetrics.totalTrades,
            avgWin: newMetrics.avgWin,
            avgLoss: newMetrics.avgLoss,
            profitFactor: newMetrics.profitFactor,
            winningTrades: newMetrics.winningTrades,
            losingTrades: newMetrics.losingTrades,
        }));
    }, []);

    // Refetch when filters change
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
            <div className="space-y-8 p-4 md:p-8 pt-6">
                {/* Header */}
                <motion.div
                    className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Sparkles className="h-8 w-8 text-amber-500" />
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground">
                            Your trading performance at a glance
                        </p>
                    </div>
                    <Button
                        onClick={handleSync}
                        disabled={syncing}
                        className="gap-2 btn-primary"
                    >
                        <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                        {syncing ? "Syncing..." : "Sync Trades"}
                    </Button>
                </motion.div>

                {/* Metrics Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Net P&L"
                        value={formatCurrency(metrics.netPnL, true)}
                        subtitle="Based on filtered trades"
                        icon={DollarSign}
                        iconColor={getPnLColor(metrics.netPnL)}
                        valueColor={getPnLColor(metrics.netPnL)}
                        delay={0}
                        glowClass={metrics.netPnL >= 0 ? "glow-green" : "glow-red"}
                    />
                    <MetricCard
                        title="Win Rate"
                        value={`${metrics.winRate}%`}
                        subtitle={`${metrics.winningTrades}W / ${metrics.losingTrades}L`}
                        icon={Target}
                        iconColor={getWinRateColor(metrics.winRate)}
                        valueColor={getWinRateColor(metrics.winRate)}
                        delay={0.1}
                    />
                    <MetricCard
                        title="MTD P&L"
                        value={formatCurrency(metrics.mtdPnL, true)}
                        subtitle="Month to date"
                        icon={Calendar}
                        iconColor={getPnLColor(metrics.mtdPnL)}
                        valueColor={getPnLColor(metrics.mtdPnL)}
                        delay={0.2}
                    />
                    <MetricCard
                        title="YTD P&L"
                        value={formatCurrency(metrics.ytdPnL, true)}
                        subtitle="Year to date"
                        icon={CalendarDays}
                        iconColor={getPnLColor(metrics.ytdPnL)}
                        valueColor={getPnLColor(metrics.ytdPnL)}
                        delay={0.3}
                    />
                </div>

                {/* Secondary Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                        title="Total Trades"
                        value={metrics.totalTrades}
                        subtitle="Closed positions"
                        icon={BarChart3}
                        iconColor="text-primary"
                        delay={0.4}
                    />
                    <MetricCard
                        title="Avg Win / Loss"
                        value={`$${metrics.avgWin.toFixed(0)} / $${metrics.avgLoss.toFixed(0)}`}
                        subtitle="Per trade"
                        icon={Activity}
                        iconColor="text-primary"
                        delay={0.5}
                    />
                    <MetricCard
                        title="Profit Factor"
                        value={metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : "∞"}
                        subtitle="Gross profit / Gross loss"
                        icon={metrics.profitFactor !== null && metrics.profitFactor >= 1 ? TrendingUp : TrendingDown}
                        iconColor={getProfitFactorColor(metrics.profitFactor)}
                        valueColor={getProfitFactorColor(metrics.profitFactor)}
                        delay={0.6}
                    />
                </div>

                {/* Positions Table */}
                <AnimatedCard delay={0.7}>
                    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-medium flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Positions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PositionsTable
                                key={refreshKey}
                                onMetricsUpdate={handleMetricsUpdate}
                            />
                        </CardContent>
                    </Card>
                </AnimatedCard>
            </div>
        </PageTransition>
    );
}
