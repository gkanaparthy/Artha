"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PositionsTable } from "@/components/positions-table";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  CircleDollarSign,
  History,
  LayoutDashboard,
  Briefcase,
  Activity,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Layers,
  BarChart3,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn, formatCompactCurrency } from "@/lib/utils";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";
import { exportToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export";
import type { Metrics, DisplayPosition } from "@/types/trading";
import { AIInsightsCard } from "@/components/ai-insights-card";
import { TagPerformance } from "@/components/tag-performance";

interface DashboardViewProps {
  initialMetrics?: Metrics;
  initialPositions?: DisplayPosition[];
  isDemo?: boolean;
}

function MetricCard({
  title,
  value,
  compactValue,
  subtitle,
  icon: Icon,
  iconColor = "text-muted-foreground",
  valueColor = "",
  delay = 0,
  glowClass = "",
}: {
  title: string;
  value: string | number;
  compactValue?: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconColor?: string;
  valueColor?: string;
  delay?: number;
  glowClass?: string;
}) {
  return (
    <AnimatedCard delay={delay}>
      <Card
        className={cn(
          "h-full card-hover overflow-hidden relative glass border-0",
          glowClass && `hover:${glowClass}`
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="metric-icon-bg">
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            className={cn("font-bold stat-number", valueColor)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
          >
            {compactValue !== undefined ? (
              <>
                <span className="hidden sm:inline text-2xl">{value}</span>
                <span className="sm:hidden text-xl">{compactValue}</span>
              </>
            ) : (
              <span className="text-2xl">{value}</span>
            )}
          </motion.div>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
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

export function DashboardView({
  initialMetrics,
  initialPositions,
  isDemo = false,
}: DashboardViewProps) {
  const { filters, refreshKey, syncing } = useFilters();
  const [metrics, setMetrics] = useState<Metrics>(
    initialMetrics || {
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
    }
  );
  const [livePositions, setLivePositions] = useState<LivePositionsData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [allPositions, setAllPositions] = useState<DisplayPosition[]>(initialPositions || []);
  const [loading, setLoading] = useState(!isDemo);

  // Fetch metrics whenever ANY filter changes (only in non-demo mode)
  const fetchMetrics = useCallback(async () => {
    if (isDemo) return; // Don't fetch in demo mode

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.symbol) params.append("symbol", filters.symbol);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.accountId && filters.accountId.length > 0)
        params.append("accountId", filters.accountId.join(","));
      if (filters.assetType && filters.assetType !== "all")
        params.append("assetType", filters.assetType);

      const res = await fetch(`/api/metrics?${params.toString()}`);
      const data = await res.json();
      setMetrics(data);

      const closedDisplayPositions: DisplayPosition[] = (data.closedTrades || []).map((p: any) => ({
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
        tags: p.tags,
      }));

      const openDisplayPositions: DisplayPosition[] = (data.openPositions || []).map((p: any) => ({
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
        tags: p.tags,
      }));

      setAllPositions([...openDisplayPositions, ...closedDisplayPositions]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters.symbol, filters.startDate, filters.endDate, filters.accountId, filters.assetType, isDemo]);

  // Fetch live positions with current market prices
  const fetchLivePositions = useCallback(async () => {
    if (isDemo) return;

    try {
      setLiveLoading(true);
      const res = await fetch('/api/positions');
      if (res.ok) {
        const data: LivePositionsData = await res.json();
        setLivePositions(data);
      }
    } catch (e) {
      console.error('Failed to fetch live positions:', e);
    } finally {
      setLiveLoading(false);
    }
  }, [isDemo]);

  // Filter live positions based on active UI filters
  const filteredLiveMetrics = useMemo(() => {
    if (!livePositions?.positions) return { totalUnrealizedPnl: 0 };

    let filtered = livePositions.positions;

    // Apply symbol filter (substring match like the rest of the app)
    if (filters.symbol) {
      const symbols = filters.symbol.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
      if (symbols.length > 0) {
        filtered = filtered.filter(p =>
          symbols.some(s => p.symbol.toLowerCase().includes(s))
        );
      }
    }

    // Apply account filter
    if (filters.accountId && filters.accountId.length > 0) {
      filtered = filtered.filter(p => filters.accountId.includes(p.accountId));
    }

    // Apply asset type filter
    if (filters.assetType && filters.assetType !== 'all') {
      filtered = filtered.filter(p => p.type === filters.assetType);
    }

    const totalUnrealizedPnl = filtered.reduce((sum, p) => sum + (p.openPnl || 0), 0);

    return { totalUnrealizedPnl };
  }, [livePositions, filters.symbol, filters.accountId, filters.assetType]);


  // Update metrics when PositionsTable applies client-side filters
  const handleMetricsUpdate = useCallback(
    (newMetrics: Metrics) => {
      if (isDemo) return; // Don't update metrics from positions table in demo mode
      setMetrics((prev) => ({
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
    },
    [isDemo]
  );

  // Refetch when filters or global refreshKey change (non-demo mode only)
  useEffect(() => {
    if (!isDemo) {
      fetchMetrics();
      fetchLivePositions();
    } else if (initialPositions) {
      // Handle client-side filtering for demo mode
      let filtered = [...initialPositions];

      // Filter by account
      if (filters.accountId && filters.accountId.length > 0) {
        filtered = filtered.filter(p => filters.accountId.includes(p.accountId));
      }

      // Filter by symbol
      if (filters.symbol) {
        const symbols = filters.symbol.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
        if (symbols.length > 0) {
          filtered = filtered.filter(p =>
            symbols.some(s => p.symbol.toLowerCase().includes(s))
          );
        }
      }

      // Filter by asset type
      if (filters.assetType && filters.assetType !== 'all') {
        filtered = filtered.filter(p => p.type === filters.assetType);
      }

      setAllPositions(filtered);

      // Simple metric recalculation for demo
      const closed = filtered.filter(p => p.status === "closed");
      if (closed.length > 0 || filtered.length < initialPositions.length) {
        const netPnL = closed.reduce((sum, p) => sum + (p.pnl || 0), 0);
        const winningTrades = closed.filter(p => (p.pnl || 0) > 0).length;
        const losingTrades = closed.filter(p => (p.pnl || 0) < 0).length;
        const winRate = closed.length > 0 ? Math.round((winningTrades / closed.length) * 100) : 0;

        setMetrics(prev => ({
          ...prev,
          netPnL,
          winningTrades,
          losingTrades,
          winRate,
          totalTrades: closed.length
        }));
      } else if (initialMetrics) {
        setMetrics(initialMetrics);
      }
    }
  }, [fetchMetrics, fetchLivePositions, isDemo, refreshKey, filters, initialPositions, initialMetrics]);

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
              {isDemo && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                  (Demo Mode)
                </span>
              )}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isDemo
                ? "Sample trading performance data"
                : "Your trading performance at a glance"}
            </p>
          </div>
        </motion.div>

        {/* Global Filter Bar */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md pb-4 -mx-4 px-4 md:-mx-8 md:px-8">
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
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Net P&L"
            value={formatCurrency(metrics.netPnL, true)}
            compactValue={formatCompactCurrency(metrics.netPnL, true)}
            subtitle="Based on filtered trades"
            icon={CircleDollarSign}
            iconColor={getPnLColor(metrics.netPnL)}
            valueColor={getPnLColor(metrics.netPnL)}
            delay={0}
            glowClass={metrics.netPnL >= 0 ? "glow-green" : "glow-red"}
          />
          <MetricCard
            title="Win Rate"
            value={`${metrics.winRate}%`}
            subtitle={`${metrics.winningTrades}W / ${metrics.losingTrades}L`}
            icon={Trophy}
            iconColor={getWinRateColor(metrics.winRate)}
            valueColor={getWinRateColor(metrics.winRate)}
            delay={0.1}
          />
          <MetricCard
            title="Largest Win"
            value={formatCurrency(metrics.largestWin, true)}
            compactValue={formatCompactCurrency(metrics.largestWin, true)}
            subtitle="Best single trade"
            icon={ArrowUpRight}
            iconColor="text-gradient-green"
            valueColor="text-gradient-green"
            delay={0.2}
          />
          <MetricCard
            title="Largest Loss"
            value={formatCurrency(metrics.largestLoss, true)}
            compactValue={formatCompactCurrency(metrics.largestLoss, true)}
            subtitle="Worst single trade"
            icon={ArrowDownRight}
            iconColor="text-gradient-red"
            valueColor="text-gradient-red"
            delay={0.3}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            title="Total Trades"
            value={metrics.totalTrades}
            subtitle="Closed positions"
            icon={History}
            iconColor="text-primary"
            delay={0.4}
          />
          <MetricCard
            title="Avg Win"
            value={formatCurrency(metrics.avgWin, true)}
            compactValue={formatCompactCurrency(metrics.avgWin, true)}
            subtitle={`${metrics.avgWinPct}% avg return`}
            icon={TrendingUp}
            iconColor="text-gradient-green"
            valueColor="text-gradient-green"
            delay={0.5}
          />
          <MetricCard
            title="Avg Loss"
            value={formatCurrency(-metrics.avgLoss, true)}
            compactValue={formatCompactCurrency(-metrics.avgLoss, true)}
            subtitle={`-${metrics.avgLossPct}% avg return`}
            icon={TrendingDown}
            iconColor="text-gradient-red"
            valueColor="text-gradient-red"
            delay={0.6}
          />
          <MetricCard
            title="Avg Trade"
            value={formatCurrency(metrics.avgTrade, true)}
            compactValue={formatCompactCurrency(metrics.avgTrade, true)}
            subtitle="Expected per trade"
            icon={Calculator}
            iconColor={getPnLColor(metrics.avgTrade)}
            valueColor={getPnLColor(metrics.avgTrade)}
            delay={0.7}
          />
          <MetricCard
            title="Unrealized P&L"
            value={
              isDemo
                ? formatCurrency(2847.50, true) // Demo value
                : liveLoading
                  ? "..."
                  : livePositions
                    ? formatCurrency(filteredLiveMetrics.totalUnrealizedPnl, true)
                    : "—"
            }
            compactValue={
              isDemo
                ? formatCompactCurrency(2847.50, true) // Demo value
                : liveLoading
                  ? "..."
                  : livePositions
                    ? formatCompactCurrency(filteredLiveMetrics.totalUnrealizedPnl, true)
                    : "—"
            }
            subtitle={isDemo ? "Sample data" : livePositions ? "Live from broker" : "Connect broker"}
            icon={Activity}
            iconColor={isDemo ? "text-gradient-green" : livePositions ? getPnLColor(filteredLiveMetrics.totalUnrealizedPnl) : "text-muted-foreground"}
            valueColor={isDemo ? "text-gradient-green" : livePositions ? getPnLColor(filteredLiveMetrics.totalUnrealizedPnl) : ""}
            delay={0.8}
            glowClass={isDemo ? "glow-green" : livePositions && filteredLiveMetrics.totalUnrealizedPnl >= 0 ? "glow-green" : "glow-red"}
          />
        </div>

        {/* AI Insights Section */}
        <AnimatedCard delay={0.65}>
          <AIInsightsCard
            startDate={filters.startDate}
            endDate={filters.endDate}
            accountId={filters.accountId}
            isDemo={isDemo}
          />
        </AnimatedCard>

        {/* Positions Table */}
        <AnimatedCard delay={0.7}>
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PositionsTable
                key={isDemo ? undefined : refreshKey}
                onMetricsUpdate={isDemo ? undefined : handleMetricsUpdate}
                initialPositions={initialPositions}
                positions={allPositions}
                loading={loading}
                isDemo={isDemo}
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
            <TagPerformance isDemo={isDemo} />
          </AnimatedCard>
        </div>
      </div>
    </PageTransition>
  );
}
