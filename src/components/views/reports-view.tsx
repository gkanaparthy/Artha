"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Calendar,
  Activity,
  Zap,
  Trophy,
  Flame,
  Clock,
  PieChart as PieChartIcon,
  LayoutGrid,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";
import { TagPerformance } from "@/components/tag-performance";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";
import { CalendarView } from "@/components/calendar-view";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { Metrics } from "@/types/trading";

interface ReportsViewProps {
  initialMetrics?: Metrics;
  isDemo?: boolean;
}

interface ExtendedMetrics extends Metrics {
  mtdPnL?: number;
  ytdPnL?: number;
}

// Custom tooltip component with proper dark/light theme support
function CustomTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  formatter?: (value: number, name: string) => [string, string];
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-foreground mb-1">
        {labelFormatter ? labelFormatter(label || "") : label}
      </p>
      {payload.map((item, index) => {
        const [value, name] = formatter
          ? formatter(item.value, item.name)
          : [String(item.value), item.name];
        return (
          <p key={index} className="text-sm" style={{ color: item.color }}>
            {name}: <span className="font-semibold">{value}</span>
          </p>
        );
      })}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  iconColor,
  valueColor,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
  delay?: number;
}) {
  return (
    <AnimatedCard delay={delay}>
      <Card className="card-hover overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="metric-icon-bg">
            <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", iconColor)} />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <motion.div
            className={cn("text-xl sm:text-2xl font-bold", valueColor)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
          >
            {value}
          </motion.div>
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}

type ViewType = "charts" | "calendar";

export function ReportsView({
  initialMetrics,
  isDemo = false,
}: ReportsViewProps) {
  const { filters, refreshKey } = useFilters();
  const [metrics, setMetrics] = useState<ExtendedMetrics | null>(
    initialMetrics ? { ...initialMetrics } : null
  );
  const [loading, setLoading] = useState(!isDemo);
  const [viewType, setViewType] = useState<ViewType>("charts");

  const buildDemoMetrics = useCallback((baseMetrics: Metrics): ExtendedMetrics => {
    const roundTo2 = (value: number) => Math.round(value * 100) / 100;
    const roundTo1 = (value: number) => Math.round(value * 10) / 10;

    let filteredTrades = [...(baseMetrics.closedTrades || [])];

    if (filters.startDate) {
      const fromDate = new Date(filters.startDate + 'T00:00:00');
      filteredTrades = filteredTrades.filter((trade) => new Date(trade.closedAt) >= fromDate);
    }

    if (filters.endDate) {
      const toDate = new Date(filters.endDate + 'T23:59:59');
      filteredTrades = filteredTrades.filter((trade) => new Date(trade.closedAt) <= toDate);
    }

    if (filters.symbol) {
      const symbols = filters.symbol
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);
      if (symbols.length > 0) {
        filteredTrades = filteredTrades.filter((trade) =>
          symbols.some((symbol) => trade.symbol.toLowerCase().startsWith(symbol))
        );
      }
    }

    if (filters.accountId && filters.accountId.length > 0) {
      filteredTrades = filteredTrades.filter((trade) => filters.accountId.includes(trade.accountId));
    }

    if (filters.assetType && filters.assetType !== 'all') {
      filteredTrades = filteredTrades.filter((trade) => trade.type === filters.assetType);
    }

    if (filters.action && filters.action !== 'ALL') {
      const side = filters.action === 'BUY' ? 'long' : 'short';
      filteredTrades = filteredTrades.filter((trade) => trade.side === side);
    }

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'open') {
        filteredTrades = [];
      } else if (filters.status === 'winners') {
        filteredTrades = filteredTrades.filter((trade) => trade.pnl > 0);
      } else if (filters.status === 'losers') {
        filteredTrades = filteredTrades.filter((trade) => trade.pnl < 0);
      }
    }

    if (filters.tagIds && filters.tagIds.length > 0) {
      filteredTrades = filteredTrades.filter((trade) => {
        const tagIds = (trade.tags || []).map((tag) => tag.id);
        if (filters.tagFilterMode === 'all') {
          return filters.tagIds.every((id) => tagIds.includes(id));
        }
        return filters.tagIds.some((id) => tagIds.includes(id));
      });
    }

    const winningTrades = filteredTrades.filter((trade) => trade.pnl > 0);
    const losingTrades = filteredTrades.filter((trade) => trade.pnl < 0);
    const netPnL = filteredTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    const totalClosedTrades = filteredTrades.length;
    const winRate = totalClosedTrades > 0 ? (winningTrades.length / totalClosedTrades) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    const avgTrade = totalClosedTrades > 0 ? netPnL / totalClosedTrades : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map((trade) => trade.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map((trade) => trade.pnl)) : 0;

    const avgWinPct = winningTrades.length > 0
      ? winningTrades.reduce((sum, trade) => {
        const multiplier = trade.contractMultiplier ?? (trade.type === 'OPTION' ? 100 : 1);
        const costBasis = trade.entryPrice * trade.quantity * multiplier;
        return sum + (costBasis > 0 ? (trade.pnl / costBasis) * 100 : 0);
      }, 0) / winningTrades.length
      : 0;

    const avgLossPct = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, trade) => {
        const multiplier = trade.contractMultiplier ?? (trade.type === 'OPTION' ? 100 : 1);
        const costBasis = trade.entryPrice * trade.quantity * multiplier;
        return sum + (costBasis > 0 ? (trade.pnl / costBasis) * 100 : 0);
      }, 0) / losingTrades.length)
      : 0;

    const sortedClosedTrades = [...filteredTrades].sort((a, b) =>
      a.closedAt.localeCompare(b.closedAt)
    );

    let cumulative = 0;
    const cumulativePnL = sortedClosedTrades.map((trade) => {
      cumulative += trade.pnl;
      return {
        date: trade.closedAt.split('T')[0],
        pnl: roundTo2(trade.pnl),
        cumulative: roundTo2(cumulative),
        symbol: trade.symbol,
      };
    });

    const monthlyPerformance = new Map<string, number>();
    for (const trade of sortedClosedTrades) {
      const monthKey = trade.closedAt.slice(0, 7);
      monthlyPerformance.set(monthKey, (monthlyPerformance.get(monthKey) || 0) + trade.pnl);
    }

    const monthlyData = Array.from(monthlyPerformance.entries())
      .map(([month, pnl]) => ({ month, pnl: roundTo2(pnl) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const symbolPerformance = new Map<string, { pnl: number; trades: number; wins: number }>();
    for (const trade of filteredTrades) {
      const current = symbolPerformance.get(trade.symbol) || { pnl: 0, trades: 0, wins: 0 };
      current.pnl += trade.pnl;
      current.trades += 1;
      if (trade.pnl > 0) current.wins += 1;
      symbolPerformance.set(trade.symbol, current);
    }

    const symbolData = Array.from(symbolPerformance.entries())
      .map(([symbol, data]) => ({
        symbol,
        pnl: roundTo2(data.pnl),
        trades: data.trades,
        winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
      }))
      .sort((a, b) => b.pnl - a.pnl);

    const mtdPnL = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].pnl : 0;
    const ytdPnL = roundTo2(netPnL);

    return {
      ...baseMetrics,
      netPnL: roundTo2(netPnL),
      winRate: roundTo1(winRate),
      totalTrades: totalClosedTrades,
      avgWin: roundTo2(avgWin),
      avgLoss: roundTo2(avgLoss),
      avgWinPct: roundTo1(avgWinPct),
      avgLossPct: roundTo1(avgLossPct),
      profitFactor: profitFactor === Infinity ? null : roundTo2(profitFactor),
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      largestWin: roundTo2(largestWin),
      largestLoss: roundTo2(largestLoss),
      avgTrade: roundTo2(avgTrade),
      openPositionsCount: filters.status === 'open'
        ? (baseMetrics.openPositionsCount || 0)
        : 0,
      closedTrades: sortedClosedTrades,
      cumulativePnL,
      monthlyData,
      symbolData,
      mtdPnL,
      ytdPnL,
    };
  }, [filters]);

  const fetchMetrics = useCallback(async () => {
    if (isDemo) return; // Don't fetch in demo mode

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.symbol) params.append("symbol", filters.symbol);
      if (filters.accountId && filters.accountId.length > 0)
        params.append("accountId", filters.accountId.join(","));
      if (filters.assetType && filters.assetType !== "all")
        params.append("assetType", filters.assetType);
      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);
      if (filters.action && filters.action !== "ALL")
        params.append("action", filters.action);
      if (filters.tagIds && filters.tagIds.length > 0)
        params.append("tagIds", filters.tagIds.join(","));
      if (filters.tagFilterMode)
        params.append("tagFilterMode", filters.tagFilterMode);

      const res = await fetch(`/api/metrics?${params.toString()}`);
      const data: ExtendedMetrics = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters.symbol, filters.startDate, filters.endDate, filters.accountId, filters.assetType, filters.status, filters.tagIds, filters.tagFilterMode, filters.action, isDemo]);

  useEffect(() => {
    if (!isDemo) {
      fetchMetrics();
      return;
    }
    if (initialMetrics) {
      setMetrics(buildDemoMetrics(initialMetrics));
      setLoading(false);
    }
  }, [fetchMetrics, isDemo, refreshKey, initialMetrics, buildDemoMetrics]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center text-muted-foreground p-8">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>
          {isDemo
            ? "No demo metrics available."
            : "Failed to load metrics data."}
        </p>
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    `$${Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-emerald-500";
    if (value < 0) return "text-rose-500";
    return "text-muted-foreground";
  };

  // Calculate additional metrics
  const winLossData = [
    { name: "Wins", value: metrics.winningTrades, fill: "oklch(0.7 0.2 145)" },
    { name: "Losses", value: metrics.losingTrades, fill: "oklch(0.65 0.2 25)" },
  ];

  // Calculate daily performance from closed trades
  const dailyPerformance = new Map<string, { pnl: number; trades: number }>();
  const closedTrades = metrics.closedTrades || [];

  for (const trade of closedTrades) {
    const day = trade.closedAt.split("T")[0];
    const existing = dailyPerformance.get(day) || { pnl: 0, trades: 0 };
    existing.pnl += trade.pnl;
    existing.trades += 1;
    dailyPerformance.set(day, existing);
  }

  const dailyData = Array.from(dailyPerformance.entries())
    .map(([date, data]) => ({
      date,
      pnl: Math.round(data.pnl * 100) / 100,
      trades: data.trades,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const rDistributionBins = [
    { label: "<-3R", min: Number.NEGATIVE_INFINITY, max: -3 },
    { label: "-3R to -2R", min: -3, max: -2 },
    { label: "-2R to -1R", min: -2, max: -1 },
    { label: "-1R to 0R", min: -1, max: 0 },
    { label: "0R to 1R", min: 0, max: 1 },
    { label: "1R to 2R", min: 1, max: 2 },
    { label: "2R to 3R", min: 2, max: 3 },
    { label: ">3R", min: 3, max: Number.POSITIVE_INFINITY },
  ];
  const rDistribution = rDistributionBins.map((bin) => ({
    range: bin.label,
    count: 0,
  }));
  for (const trade of closedTrades) {
    const r = trade.rMultiple;
    if (typeof r !== "number" || !Number.isFinite(r)) continue;

    const index = rDistributionBins.findIndex((bin) => r >= bin.min && r < bin.max);
    if (index >= 0) rDistribution[index].count += 1;
  }
  const rDistributionCount = rDistribution.reduce((sum, bucket) => sum + bucket.count, 0);

  // Calculate win/loss streaks
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentStreakType: "win" | "loss" | null = null;

  for (const trade of closedTrades.sort((a, b) =>
    a.closedAt.localeCompare(b.closedAt)
  )) {
    const isWin = trade.pnl > 0;
    if (isWin) {
      if (currentStreakType === "win") {
        currentStreak++;
      } else {
        currentStreak = 1;
        currentStreakType = "win";
      }
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      if (currentStreakType === "loss") {
        currentStreak++;
      } else {
        currentStreak = 1;
        currentStreakType = "loss";
      }
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }
  }

  // Calculate drawdown
  let peak = -Infinity;
  let maxDrawdown = 0;
  let cumulative = 0;
  const cumulativePnL = metrics.cumulativePnL || [];
  const drawdownData = cumulativePnL.map((d) => {
    cumulative = d.cumulative;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak !== -Infinity ? Math.max(0, peak - cumulative) : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    return {
      date: d.date,
      cumulative,
      drawdown: Math.round(drawdown * 100) / 100,
    };
  });

  // Performance by day of week
  const dayOfWeekPerformance = [
    { day: "Mon", pnl: 0, trades: 0 },
    { day: "Tue", pnl: 0, trades: 0 },
    { day: "Wed", pnl: 0, trades: 0 },
    { day: "Thu", pnl: 0, trades: 0 },
    { day: "Fri", pnl: 0, trades: 0 },
  ];

  for (const trade of closedTrades) {
    const dayIndex = new Date(trade.closedAt).getDay();
    if (dayIndex >= 1 && dayIndex <= 5) {
      dayOfWeekPerformance[dayIndex - 1].pnl += trade.pnl;
      dayOfWeekPerformance[dayIndex - 1].trades += 1;
    }
  }

  // Calculate average holding period
  let totalHoldingDays = 0;
  for (const trade of closedTrades) {
    const opened = new Date(trade.openedAt);
    const closed = new Date(trade.closedAt);
    const days =
      (closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
    totalHoldingDays += days;
  }
  const avgHoldingPeriod =
    closedTrades.length > 0 ? totalHoldingDays / closedTrades.length : 0;

  // Risk/Reward ratio
  const riskRewardRatio =
    metrics.avgLoss > 0 ? metrics.avgWin / metrics.avgLoss : 0;

  // Radar chart data for trading profile
  const tradingProfileData = [
    { metric: "Win Rate", value: metrics.winRate, fullMark: 100 },
    {
      metric: "Profit Factor",
      value: Math.min((metrics.profitFactor ?? 0) * 25, 100),
      fullMark: 100,
    },
    {
      metric: "Risk/Reward",
      value: Math.min(riskRewardRatio * 25, 100),
      fullMark: 100,
    },
    {
      metric: "Consistency",
      value: Math.max(
        0,
        100 -
        (metrics.netPnL > 0 ? (maxDrawdown / metrics.netPnL) * 100 : 0)
      ),
      fullMark: 100,
    },
    {
      metric: "Activity",
      value: Math.min(metrics.totalTrades * 2, 100),
      fullMark: 100,
    },
  ];

  const monthlyData = metrics.monthlyData || [];
  const symbolData = metrics.symbolData || [];
  const mtdPnL = metrics.mtdPnL ?? (monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].pnl : 0);
  const ytdPnL = metrics.ytdPnL ?? metrics.netPnL;

  return (
    <PageTransition>
      <div className="space-y-6 sm:space-y-8 p-3 sm:p-4 md:p-8 pt-4 sm:pt-6">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
              <span className="text-gradient">Reports</span>
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 float" />
              {isDemo && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                  (Demo Mode)
                </span>
              )}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isDemo
                ? "Sample trading performance analysis"
                : "In-depth analysis of your trading performance"}
            </p>
          </div>
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border self-end sm:self-auto">
            <Button
              variant={viewType === "charts" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("charts")}
              className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm"
            >
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Charts</span>
            </Button>
            <Button
              variant={viewType === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType("calendar")}
              className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </Button>
          </div>
        </motion.div>

        {/* Global Filter Bar */}
        <AnimatedCard delay={0.05}>
          <GlobalFilterBar />
        </AnimatedCard>

        {/* Calendar View */}
        {viewType === "calendar" && (
          <AnimatedCard delay={0.1}>
            <Card className="card-hover">
              <CardContent className="pt-6">
                <CalendarView data={dailyData} />
              </CardContent>
            </Card>
          </AnimatedCard>
        )}

        {/* Charts View */}
        {viewType === "charts" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard
                title="Net P&L"
                value={`${metrics.netPnL >= 0 ? "+" : "-"}${formatCurrency(metrics.netPnL)}`}
                icon={metrics.netPnL >= 0 ? TrendingUp : TrendingDown}
                iconColor={metrics.netPnL >= 0 ? "text-emerald-500" : "text-rose-500"}
                valueColor={getPnLColor(metrics.netPnL)}
                delay={0.1}
              />
              <SummaryCard
                title="Win Rate"
                value={`${metrics.winRate}%`}
                icon={Target}
                iconColor="text-amber-500"
                valueColor={
                  metrics.winRate >= 50
                    ? "text-emerald-500"
                    : "text-rose-500"
                }
                delay={0.15}
              />
              <SummaryCard
                title="Profit Factor"
                value={
                  metrics.profitFactor !== null
                    ? metrics.profitFactor.toFixed(2)
                    : "—"
                }
                icon={BarChart3}
                iconColor="text-blue-500"
                valueColor={
                  (metrics.profitFactor ?? 0) >= 1
                    ? "text-emerald-500"
                    : "text-rose-500"
                }
                delay={0.2}
              />
              <SummaryCard
                title="Risk/Reward"
                value={riskRewardRatio.toFixed(2)}
                icon={Zap}
                iconColor="text-purple-500"
                valueColor={
                  riskRewardRatio >= 1
                    ? "text-emerald-500"
                    : "text-rose-500"
                }
                delay={0.25}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard
                title="Max Win Streak"
                value={maxWinStreak}
                icon={Trophy}
                iconColor="text-emerald-500"
                delay={0.3}
              />
              <SummaryCard
                title="Max Loss Streak"
                value={maxLossStreak}
                icon={Flame}
                iconColor="text-rose-500"
                delay={0.35}
              />
              <SummaryCard
                title="Max Drawdown"
                value={`-${formatCurrency(maxDrawdown)}`}
                icon={TrendingDown}
                iconColor="text-orange-500"
                valueColor={maxDrawdown === 0 ? "text-emerald-500" : "text-rose-500"}
                delay={0.4}
              />
              <SummaryCard
                title="Avg Holding"
                value={`${avgHoldingPeriod.toFixed(1)} days`}
                icon={Clock}
                iconColor="text-cyan-500"
                delay={0.45}
              />
            </div>

            {/* Cumulative P&L Chart */}
            <AnimatedCard delay={0.5}>
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Equity Curve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cumulativePnL.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250} className="sm:h-[350px]">
                      <AreaChart data={cumulativePnL}>
                        <defs>
                          <linearGradient
                            id="colorCumulative"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={
                                metrics.netPnL >= 0
                                  ? "oklch(0.7 0.2 145)"
                                  : "oklch(0.65 0.2 25)"
                              }
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor={
                                metrics.netPnL >= 0
                                  ? "oklch(0.7 0.2 145)"
                                  : "oklch(0.65 0.2 25)"
                              }
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border/50"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "currentColor" }}
                          tickFormatter={(date) =>
                            new Date(date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })
                          }
                          className="text-muted-foreground"
                          stroke="currentColor"
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "currentColor" }}
                          tickFormatter={(value) => `$${value}`}
                          className="text-muted-foreground"
                          stroke="currentColor"
                        />
                        <Tooltip
                          content={({ active, payload, label }) => (
                            <CustomTooltip
                              active={active}
                              payload={payload?.map((p) => ({
                                value: p.value as number,
                                name: p.name as string,
                                color:
                                  metrics.netPnL >= 0
                                    ? "oklch(0.7 0.2 145)"
                                    : "oklch(0.65 0.2 25)",
                              }))}
                              label={String(label ?? "")}
                              formatter={(value) => [
                                formatCurrency(value),
                                "Cumulative P&L",
                              ]}
                              labelFormatter={(l) =>
                                new Date(l).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                  timeZone: "UTC",
                                })
                              }
                            />
                          )}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulative"
                          stroke={
                            metrics.netPnL >= 0
                              ? "oklch(0.7 0.2 145)"
                              : "oklch(0.65 0.2 25)"
                          }
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorCumulative)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>No trade data available for chart.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Monthly Performance */}
              <AnimatedCard delay={0.55}>
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Monthly Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
                        <BarChart data={monthlyData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border/50"
                          />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 10, fill: "currentColor" }}
                            tickFormatter={formatMonth}
                            stroke="currentColor"
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "currentColor" }}
                            tickFormatter={(value) => `$${value}`}
                            stroke="currentColor"
                          />
                          <Tooltip
                            content={({ active, payload, label }) => (
                              <CustomTooltip
                                active={active}
                                payload={payload?.map((p) => ({
                                  value: p.value as number,
                                  name: "P&L",
                                  color:
                                    (p.value as number) >= 0
                                      ? "oklch(0.7 0.2 145)"
                                      : "oklch(0.65 0.2 25)",
                                }))}
                                label={String(label ?? "")}
                                formatter={(value) => [
                                  formatCurrency(value),
                                  "P&L",
                                ]}
                                labelFormatter={formatMonth}
                              />
                            )}
                          />
                          <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                            {monthlyData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.pnl >= 0
                                    ? "oklch(0.7 0.2 145)"
                                    : "oklch(0.65 0.2 25)"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p>No monthly data available.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Win/Loss Distribution */}
              <AnimatedCard delay={0.6}>
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-primary" />
                      Win/Loss Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics.totalTrades > 0 ? (
                      <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
                        <PieChart>
                          <Pie
                            data={winLossData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value, percent }) =>
                              `${name}: ${value} (${(
                                (percent ?? 0) * 100
                              ).toFixed(0)}%)`
                            }
                            labelLine={{
                              stroke: "currentColor",
                              strokeWidth: 1,
                            }}
                          >
                            {winLossData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => (
                              <CustomTooltip
                                active={active}
                                payload={payload?.map((p) => ({
                                  value: p.value as number,
                                  name: p.name as string,
                                  color: p.payload?.fill || "currentColor",
                                }))}
                                formatter={(value, name) => [String(value), name]}
                              />
                            )}
                          />
                          <Legend
                            formatter={(value) => (
                              <span className="text-foreground">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p>No trades to display.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>

            {/* R Distribution */}
            <AnimatedCard delay={0.63}>
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    R Distribution ({rDistributionCount} trades)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rDistributionCount > 0 ? (
                    <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
                      <BarChart data={rDistribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="range"
                          tick={{ fontSize: 10, fill: "currentColor" }}
                          stroke="currentColor"
                          angle={-20}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "currentColor" }}
                          allowDecimals={false}
                          stroke="currentColor"
                        />
                        <Tooltip
                          content={({ active, payload, label }) => (
                            <CustomTooltip
                              active={active}
                              payload={payload?.map((p) => ({
                                value: p.value as number,
                                name: "Trades",
                                color: "oklch(0.68 0.17 250)",
                              }))}
                              label={String(label ?? "")}
                              formatter={(value) => [String(value), "Trades"]}
                            />
                          )}
                        />
                        <Bar dataKey="count" fill="oklch(0.68 0.17 250)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>No covered trades for R distribution.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Day of Week & Trading Profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Performance by Day of Week */}
              <AnimatedCard delay={0.65}>
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-primary" />
                      Performance by Day of Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
                      <BarChart data={dayOfWeekPerformance}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border/50"
                        />
                        <XAxis
                          dataKey="day"
                          tick={{ fontSize: 11, fill: "currentColor" }}
                          stroke="currentColor"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "currentColor" }}
                          tickFormatter={(value) => `$${value}`}
                          stroke="currentColor"
                        />
                        <Tooltip
                          content={({ active, payload, label }) => (
                            <CustomTooltip
                              active={active}
                              payload={payload?.map((p) => ({
                                value: p.value as number,
                                name: "P&L",
                                color:
                                  (p.value as number) >= 0
                                    ? "oklch(0.7 0.2 145)"
                                    : "oklch(0.65 0.2 25)",
                              }))}
                              label={String(label ?? "")}
                              formatter={(value) => [formatCurrency(value), "P&L"]}
                            />
                          )}
                        />
                        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                          {dayOfWeekPerformance.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.pnl >= 0
                                  ? "oklch(0.7 0.2 145)"
                                  : "oklch(0.65 0.2 25)"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Trading Profile Radar */}
              <AnimatedCard delay={0.7}>
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Trading Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
                      <RadarChart data={tradingProfileData}>
                        <PolarGrid
                          stroke="currentColor"
                          className="stroke-border/50"
                        />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fontSize: 11, fill: "currentColor" }}
                        />
                        <PolarRadiusAxis
                          tick={{ fontSize: 9, fill: "currentColor" }}
                          domain={[0, 100]}
                        />
                        <Radar
                          name="Performance"
                          dataKey="value"
                          stroke="oklch(0.7 0.18 45)"
                          fill="oklch(0.7 0.18 45)"
                          fillOpacity={0.4}
                        />
                        <Tooltip
                          content={({ active, payload }) => (
                            <CustomTooltip
                              active={active}
                              payload={payload?.map((p) => ({
                                value: p.value as number,
                                name: "Score",
                                color: "oklch(0.7 0.18 45)",
                              }))}
                              formatter={(value) => [
                                `${value.toFixed(0)}/100`,
                                "Score",
                              ]}
                            />
                          )}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>

            {/* Drawdown Chart */}
            {drawdownData.length > 0 && (
              <AnimatedCard delay={0.75}>
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-orange-500" />
                      Drawdown Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={drawdownData}>
                        <defs>
                          <linearGradient
                            id="colorDrawdown"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="oklch(0.65 0.2 25)"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="oklch(0.65 0.2 25)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border/50"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "currentColor" }}
                          tickFormatter={(date) =>
                            new Date(date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              timeZone: "UTC",
                            })
                          }
                          stroke="currentColor"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "currentColor" }}
                          tickFormatter={(value) => `$${value}`}
                          stroke="currentColor"
                          reversed
                        />
                        <Tooltip
                          content={({ active, payload, label }) => (
                            <CustomTooltip
                              active={active}
                              payload={payload?.map((p) => ({
                                value: p.value as number,
                                name: "Drawdown",
                                color: "oklch(0.65 0.2 25)",
                              }))}
                              label={String(label ?? "")}
                              formatter={(value) => [
                                formatCurrency(value),
                                "Drawdown",
                              ]}
                              labelFormatter={(l) =>
                                new Date(l).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                  timeZone: "UTC",
                                })
                              }
                            />
                          )}
                        />
                        <Area
                          type="monotone"
                          dataKey="drawdown"
                          stroke="oklch(0.65 0.2 25)"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorDrawdown)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedCard>
            )}

            {/* Performance by Symbol */}
            <AnimatedCard delay={0.8}>
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Performance by Symbol
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {symbolData.length > 0 ? (
                    <div className="space-y-6">
                      <ResponsiveContainer
                        width="100%"
                        height={Math.max(
                          200,
                          Math.min(symbolData.length, 10) * 45
                        )}
                      >
                        <BarChart
                          data={symbolData.slice(0, 10)}
                          layout="vertical"
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-border/50"
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11, fill: "currentColor" }}
                            tickFormatter={(value) => `$${value}`}
                            stroke="currentColor"
                          />
                          <YAxis
                            type="category"
                            dataKey="symbol"
                            tick={{ fontSize: 11, fill: "currentColor" }}
                            width={80}
                            stroke="currentColor"
                          />
                          <Tooltip
                            content={({ active, payload, label }) => (
                              <CustomTooltip
                                active={active}
                                payload={payload?.map((p) => ({
                                  value: p.value as number,
                                  name: "P&L",
                                  color:
                                    (p.value as number) >= 0
                                      ? "oklch(0.7 0.2 145)"
                                      : "oklch(0.65 0.2 25)",
                                }))}
                                label={String(label ?? "")}
                                formatter={(value) => [
                                  formatCurrency(value),
                                  "P&L",
                                ]}
                              />
                            )}
                          />
                          <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>
                            {symbolData.slice(0, 10).map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.pnl >= 0
                                    ? "oklch(0.7 0.2 145)"
                                    : "oklch(0.65 0.2 25)"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Symbol Stats Table */}
                      <div className="rounded-lg border bg-card overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-4 font-semibold text-foreground">
                                Symbol
                              </th>
                              <th className="text-right p-4 font-semibold text-foreground">
                                P&L
                              </th>
                              <th className="text-right p-4 font-semibold text-foreground">
                                Trades
                              </th>
                              <th className="text-right p-4 font-semibold text-foreground">
                                Win Rate
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {symbolData.map((symbol, index) => (
                              <tr
                                key={symbol.symbol}
                                className={cn(
                                  "border-b last:border-0 table-row-hover transition-colors",
                                  index % 2 === 0 ? "bg-background" : "bg-muted/20"
                                )}
                              >
                                <td className="p-4 font-medium text-foreground">
                                  {symbol.symbol}
                                </td>
                                <td
                                  className={cn(
                                    "p-4 text-right font-mono font-semibold",
                                    symbol.pnl >= 0
                                      ? "text-emerald-500"
                                      : "text-rose-500"
                                  )}
                                >
                                  {symbol.pnl >= 0 ? "+" : "-"}
                                  {formatCurrency(symbol.pnl)}
                                </td>
                                <td className="p-4 text-right text-muted-foreground">
                                  {symbol.trades}
                                </td>
                                <td
                                  className={cn(
                                    "p-4 text-right font-semibold",
                                    symbol.winRate >= 60
                                      ? "text-emerald-500"
                                      : symbol.winRate >= 50
                                        ? "text-amber-500"
                                        : "text-rose-500"
                                  )}
                                >
                                  {symbol.winRate}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p>No symbol data available.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </AnimatedCard>

            {/* Tag Performance Analysis */}
            <AnimatedCard delay={0.88}>
              <div className="space-y-4 pt-4 border-t border-dashed">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-purple-500" />
                  <h2 className="text-xl font-semibold">Tag Performance Analysis</h2>
                </div>
                <TagPerformance isDemo={isDemo} />
              </div>
            </AnimatedCard>

            {/* Stats Summary */}
            <AnimatedCard delay={0.85}>
              <Card className="card-hover bg-gradient-to-br from-primary/5 via-background to-background">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Key Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Trades</p>
                      <p className="text-lg sm:text-2xl font-bold text-foreground">{metrics.totalTrades}</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Avg Win</p>
                      <p className="text-lg sm:text-2xl font-bold text-emerald-500">+{formatCurrency(metrics.avgWin)}</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Avg Loss</p>
                      <p className="text-lg sm:text-2xl font-bold text-rose-500">-{formatCurrency(metrics.avgLoss)}</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">MTD P&L</p>
                      <p className={cn("text-lg sm:text-2xl font-bold", mtdPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {mtdPnL >= 0 ? "+" : "-"}{formatCurrency(mtdPnL)}
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">YTD P&L</p>
                      <p className={cn("text-lg sm:text-2xl font-bold", ytdPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {ytdPnL >= 0 ? "+" : "-"}{formatCurrency(ytdPnL)}
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Expectancy</p>
                      <p className={cn("text-lg sm:text-2xl font-bold", metrics.netPnL >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {metrics.totalTrades > 0 ? `${metrics.netPnL >= 0 ? "+" : "-"}${formatCurrency(metrics.netPnL / metrics.totalTrades)}` : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedCard>
          </>
        )}
      </div>
    </PageTransition>
  );
}
