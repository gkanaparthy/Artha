"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionsTable } from "@/components/positions-table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    TrendingUp,
    TrendingDown,
    Target,
    DollarSign,
    BarChart3,
    Activity,
    LayoutDashboard,
    AlertCircle,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";
import { exportToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export";
import { TagPerformance } from "@/components/tag-performance";
import { AIInsightsCard } from "@/components/ai-insights-card";
import { TrustOnboardingCard } from "@/components/onboarding/trust-card";

interface Metrics {
    netPnL: number;
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
    avgWinPct: number;
    avgLossPct: number;
    profitFactor: number | null;
    winningTrades: number;
    losingTrades: number;
    largestWin: number;
    largestLoss: number;
    avgTrade: number;
    openPositionsCount: number;
    closedTrades: any[];
}

interface LivePosition {
    symbol: string;
    units: number;
    price: number | null;
    averageCost: number | null;
    openPnl: number | null;
    marketValue: number | null;
    type: 'STOCK' | 'OPTION';
    accountId: string;
    brokerName: string;
}

interface LivePositionsData {
    positions: LivePosition[];
    summary: {
        totalPositions: number;
        totalMarketValue: number;
        totalUnrealizedPnl: number;
        stockPositions: number;
        optionPositions: number;
    };
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <div className="metric-icon-bg">
                        <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconColor)} />
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                    <motion.div
                        className={cn("text-xl sm:text-2xl font-bold stat-number", valueColor)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: delay + 0.2 }}
                    >
                        {value}
                    </motion.div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{subtitle}</p>
                </CardContent>
            </Card>
        </AnimatedCard>
    );
}

export default function DashboardPage() {
    const { filters, refreshKey, syncing } = useFilters();
    const router = useRouter();
    const [metrics, setMetrics] = useState<Metrics>({
        netPnL: 0,
        winRate: 0,
        totalTrades: 0,
        avgWin: 0,
        avgLoss: 0,
        avgWinPct: 0,
        avgLossPct: 0,
        profitFactor: null,
        winningTrades: 0,
        losingTrades: 0,
        largestWin: 0,
        largestLoss: 0,
        avgTrade: 0,
        openPositionsCount: 0,
        closedTrades: [],
    });
    const [livePositions, setLivePositions] = useState<LivePositionsData | null>(null);
    const [hasDisabledConnections, setHasDisabledConnections] = useState(false);
    const [allPositions, setAllPositions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasAccounts, setHasAccounts] = useState<boolean | null>(null);

    // Fetch metrics whenever ANY filter changes
    const fetchMetrics = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.symbol) params.append("symbol", filters.symbol);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.accountId && filters.accountId.length > 0) {
                params.append("accountId", filters.accountId.join(","));
            }
            if (filters.assetType && filters.assetType !== 'all') params.append("assetType", filters.assetType);
            if (filters.tagIds && filters.tagIds.length > 0) params.append("tagIds", filters.tagIds.join(","));
            if (filters.tagFilterMode) params.append("tagFilterMode", filters.tagFilterMode);

            const res = await fetch(`/api/metrics?${params.toString()}`);
            const data = await res.json();
            setMetrics(data);

            // Format positions for the table
            const closedDisplayPositions = (data.closedTrades || []).map((p: any) => ({
                symbol: p.symbol,
                quantity: p.quantity,
                entryPrice: p.entryPrice,
                exitPrice: p.exitPrice,
                pnl: p.pnl,
                openedAt: p.openedAt,
                closedAt: p.closedAt,
                broker: p.broker,
                accountId: p.accountId,
                status: "closed" as const,
                type: p.type,
            }));

            const openDisplayPositions = (data.openPositions || []).map((p: any) => ({
                symbol: p.symbol,
                quantity: p.quantity,
                entryPrice: p.entryPrice,
                exitPrice: null,
                pnl: null,
                openedAt: p.openedAt,
                closedAt: null,
                broker: p.broker,
                accountId: p.accountId,
                status: "open" as const,
                tradeId: p.tradeId,
                type: p.type,
            }));

            setAllPositions([...openDisplayPositions, ...closedDisplayPositions]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filters.symbol, filters.startDate, filters.endDate, filters.accountId, filters.assetType, filters.tagIds, filters.tagFilterMode]);

    // Fetch live positions with current market prices
    const fetchLivePositions = useCallback(async () => {
        try {
            const res = await fetch('/api/positions');
            if (res.ok) {
                const data: LivePositionsData = await res.json();
                setLivePositions(data);
            }
        } catch (e) {
            console.error('Failed to fetch live positions:', e);
        } finally {
            // liveLoading removed
        }
    }, []);

    // Check for disabled broker connections
    const checkDisabledConnections = useCallback(async () => {
        try {
            const res = await fetch('/api/user');
            if (res.ok) {
                const data = await res.json();
                const accounts = data.accounts || [];
                // Only show warning for broken connections, not user-disconnected ones
                const hasBrokenConnection = accounts.some((acc: { disabled: boolean; disabledReason: string | null }) =>
                    acc.disabled && acc.disabledReason !== 'User disconnected - will not sync'
                ) || false;
                setHasDisabledConnections(hasBrokenConnection);
                setHasAccounts(accounts.length > 0);
            }
        } catch (e) {
            console.error('Failed to check connection status:', e);
            setHasAccounts(false);
        }
    }, []);




    // Update metrics when PositionsTable applies client-side filters (status filter)
    const handleMetricsUpdate = useCallback((newMetrics: Metrics) => {
        setMetrics(prev => ({
            ...prev,
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

    // Realtime Sync (Fix #2): Poll for recent trades every 2 minutes
    // This uses the FREE realtime SnapTrade endpoint
    const syncRecent = useCallback(async () => {
        // Skip if page not visible (tab inactive)
        if (typeof document !== 'undefined' && document.hidden) return;

        try {
            const res = await fetch('/api/trades/sync-recent', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.synced > 0) {
                    console.log(`[Recent Sync] Automatically synced ${data.synced} trades`);
                    // We don't want to force a full page refresh if the user is interacting
                    // but we do want to update the metrics and positions
                    fetchMetrics();
                }
            }
        } catch (e) {
            console.error('Recent sync failed:', e);
        }
    }, [fetchMetrics]);

    // Refetch when filters or global refreshKey change
    useEffect(() => {
        Promise.all([fetchMetrics(), fetchLivePositions(), checkDisabledConnections()]);
    }, [fetchMetrics, fetchLivePositions, checkDisabledConnections, refreshKey]);

    // Setup realtime polling
    useEffect(() => {
        // Run once on mount (after a small delay to not block initial load)
        const timer = setTimeout(syncRecent, 3000);

        // Setup interval (2 minutes)
        const interval = setInterval(syncRecent, 120 * 1000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [syncRecent]);

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

    return (
        <PageTransition>
            <div className="space-y-6 sm:space-y-8 p-3 sm:p-4 md:p-8 pt-4 sm:pt-6">
                {/* Header */}
                <motion.div
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="space-y-0.5 sm:space-y-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                            <LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                            Dashboard
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Your trading performance at a glance
                        </p>
                    </div>
                </motion.div>

                {/* Global Filter Bar */}
                <div className="pb-4">
                    <AnimatedCard delay={0.1}>
                        <GlobalFilterBar
                            onExport={() => exportToExcel(
                                allPositions,
                                'positions',
                                [
                                    { key: 'symbol', header: 'Symbol' },
                                    { key: 'status', header: 'Status' },
                                    { key: 'type', header: 'Type' },
                                    { key: 'broker', header: 'Broker' },
                                    { key: 'quantity', header: 'Quantity' },
                                    { key: 'entryPrice', header: 'Entry Price', formatter: formatCurrencyForExport },
                                    { key: 'exitPrice', header: 'Exit Price', formatter: formatCurrencyForExport },
                                    { key: 'pnl', header: 'P&L', formatter: formatCurrencyForExport },
                                    { key: 'openedAt', header: 'Entry Date', formatter: formatDateForExport },
                                    { key: 'closedAt', header: 'Exit Date', formatter: formatDateForExport },
                                ]
                            )}
                        />
                    </AnimatedCard>
                </div>

                {/* Warning Banner for Disabled Connections */}
                {
                    hasDisabledConnections && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Action Required</AlertTitle>
                                <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <span>
                                        Your broker connection is disconnected. Trades are not syncing.
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push('/settings')}
                                        className="shrink-0 border-white/20 hover:bg-white/10"
                                    >
                                        Fix Now
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        </motion.div>
                    )
                }

                {/* Empty State / Trust Card */}
                {!loading && hasAccounts === false && (
                    <div className="py-12 flex justify-center">
                        <TrustOnboardingCard />
                    </div>
                )}

                {/* Metrics Cards */}
                <div className={cn(
                    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
                    !hasAccounts && "opacity-20 pointer-events-none grayscale select-none"
                )}>
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
                        title="Largest Win"
                        value={formatCurrency(metrics.largestWin, true)}
                        subtitle="Best single trade"
                        icon={TrendingUp}
                        iconColor="text-gradient-green"
                        valueColor="text-gradient-green"
                        delay={0.2}
                    />
                    <MetricCard
                        title="Largest Loss"
                        value={formatCurrency(metrics.largestLoss, true)}
                        subtitle="Worst single trade"
                        icon={TrendingDown}
                        iconColor="text-gradient-red"
                        valueColor="text-gradient-red"
                        delay={0.3}
                    />
                </div>


                {/* Secondary Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <MetricCard
                        title="Total Trades"
                        value={metrics.totalTrades}
                        subtitle="Closed positions"
                        icon={BarChart3}
                        iconColor="text-primary"
                        delay={0.4}
                    />
                    <MetricCard
                        title="Avg Win"
                        value={formatCurrency(metrics.avgWin, true)}
                        subtitle={`${metrics.avgWinPct}% avg return`}
                        icon={TrendingUp}
                        iconColor="text-gradient-green"
                        valueColor="text-gradient-green"
                        delay={0.5}
                    />
                    <MetricCard
                        title="Avg Loss"
                        value={formatCurrency(-metrics.avgLoss, true)}
                        subtitle={`-${metrics.avgLossPct}% avg return`}
                        icon={TrendingDown}
                        iconColor="text-gradient-red"
                        valueColor="text-gradient-red"
                        delay={0.6}
                    />
                    <MetricCard
                        title="Avg Trade"
                        value={formatCurrency(metrics.avgTrade, true)}
                        subtitle="Expected per trade"
                        icon={Target}
                        iconColor={getPnLColor(metrics.avgTrade)}
                        valueColor={getPnLColor(metrics.avgTrade)}
                        delay={0.7}
                    />
                </div>


                {/* AI Insights Section */}
                <AnimatedCard delay={0.8}>
                    <AIInsightsCard
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        accountId={filters.accountId}
                    />
                </AnimatedCard>


                {/* Positions Table */}
                <AnimatedCard delay={0.7}>
                    <Card className={cn(
                        "border-none shadow-md bg-card/50 backdrop-blur-sm",
                        !hasAccounts && "opacity-20 pointer-events-none grayscale select-none"
                    )}>
                        <CardHeader className="p-4 sm:p-6">
                            <CardTitle className="text-base sm:text-lg font-medium flex items-center gap-2">
                                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                Positions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <PositionsTable
                                key={refreshKey}
                                onMetricsUpdate={handleMetricsUpdate}
                                positions={allPositions}
                                loading={loading}
                                livePositions={livePositions?.positions}
                            />
                        </CardContent>
                    </Card>
                </AnimatedCard>

                {/* Tag Insights */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-purple-500" />
                        <h2 className="text-xl font-semibold">Tag Insights</h2>
                    </div>
                    <AnimatedCard delay={0.8}>
                        <TagPerformance />
                    </AnimatedCard>
                </div>
            </div >
        </PageTransition >
    );
}
