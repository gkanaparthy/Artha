"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Target, BarChart3, Calendar, Activity, Zap, Trophy, Flame, Clock, Sparkles, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";
import { CalendarView } from "@/components/calendar-view";

// Dynamic import for heavy Recharts components - only loaded when needed
const ReportsCharts = dynamic(
  () => import("@/components/reports-charts").then((mod) => mod.ReportsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    ),
  }
);

interface CumulativePnLData {
  date: string;
  pnl: number;
  cumulative: number;
  symbol: string;
}

interface MonthlyData {
  month: string;
  pnl: number;
}

interface SymbolData {
  symbol: string;
  pnl: number;
  trades: number;
  winRate: number;
}

interface ClosedTrade {
  symbol: string;
  pnl: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  closedAt: string;
  openedAt: string;
  broker: string;
}

interface OpenPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  openedAt: string;
  broker: string;
  currentValue: number;
  tradeId: string;
}

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
  cumulativePnL: CumulativePnLData[];
  monthlyData: MonthlyData[];
  symbolData: SymbolData[];
  closedTrades?: ClosedTrade[];
  openPositions?: OpenPosition[];
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

export default function ReportsPage() {
  const { filters } = useFilters();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("charts");

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.symbol) params.append("symbol", filters.symbol);
      if (filters.accountId && filters.accountId !== 'all') params.append("accountId", filters.accountId);
      if (filters.assetType && filters.assetType !== 'all') params.append("assetType", filters.assetType);

      const res = await fetch(`/api/metrics?${params.toString()}`);
      const data: Metrics = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters.symbol, filters.startDate, filters.endDate, filters.accountId, filters.assetType]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatCurrency = (value: number) =>
    `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-gradient-green";
    if (value < 0) return "text-gradient-red";
    return "text-muted-foreground";
  };

  // Memoized chart data calculations - must be called before early returns
  const chartData = useMemo(() => {
    if (!metrics) {
      return {
        winLossData: [],
        dailyData: [],
        maxWinStreak: 0,
        maxLossStreak: 0,
        maxDrawdown: 0,
        drawdownData: [],
        dayOfWeekPerformance: [],
        avgHoldingPeriod: 0,
        riskRewardRatio: 0,
        tradingProfileData: [],
      };
    }

    const closedTrades = metrics.closedTrades || [];

    // Win/Loss data for pie chart
    const winLossData = [
      { name: "Wins", value: metrics.winningTrades, fill: "oklch(0.7 0.2 145)" },
      { name: "Losses", value: metrics.losingTrades, fill: "oklch(0.65 0.2 25)" },
    ];

    // Daily performance
    const dailyPerformance = new Map<string, { pnl: number; trades: number }>();
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

    // Win/loss streaks
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentStreakType: "win" | "loss" | null = null;

    const sortedTrades = [...closedTrades].sort((a, b) => a.closedAt.localeCompare(b.closedAt));
    for (const trade of sortedTrades) {
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

    // Drawdown calculation
    let peak = -Infinity;
    let maxDrawdown = 0;
    const drawdownData = metrics.cumulativePnL.map(d => {
      const cumulative = d.cumulative;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak !== -Infinity ? Math.max(0, peak - cumulative) : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      return {
        date: d.date,
        cumulative,
        drawdown: Math.round(drawdown * 100) / 100,
      };
    });

    // Day of week performance
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

    // Average holding period
    let totalHoldingDays = 0;
    for (const trade of closedTrades) {
      const opened = new Date(trade.openedAt);
      const closed = new Date(trade.closedAt);
      const days = (closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
      totalHoldingDays += days;
    }
    const avgHoldingPeriod = closedTrades.length > 0 ? totalHoldingDays / closedTrades.length : 0;

    // Risk/Reward ratio
    const riskRewardRatio = metrics.avgLoss > 0 ? metrics.avgWin / metrics.avgLoss : 0;

    // Trading profile radar data
    const tradingProfileData = [
      { metric: "Win Rate", value: metrics.winRate, fullMark: 100 },
      { metric: "Profit Factor", value: Math.min((metrics.profitFactor ?? 0) * 25, 100), fullMark: 100 },
      { metric: "Risk/Reward", value: Math.min(riskRewardRatio * 25, 100), fullMark: 100 },
      { metric: "Consistency", value: Math.max(0, 100 - (metrics.netPnL > 0 ? (maxDrawdown / metrics.netPnL) * 100 : 0)), fullMark: 100 },
      { metric: "Activity", value: Math.min(metrics.totalTrades * 2, 100), fullMark: 100 },
    ];

    return {
      winLossData,
      dailyData,
      maxWinStreak,
      maxLossStreak,
      maxDrawdown,
      drawdownData,
      dayOfWeekPerformance,
      avgHoldingPeriod,
      riskRewardRatio,
      tradingProfileData,
    };
  }, [metrics]);

  // Early returns after all hooks
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
        <p>Failed to load metrics data.</p>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 sm:space-y-8">
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
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 float" />
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">In-depth analysis of your trading performance</p>
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
                <CalendarView data={chartData.dailyData} />
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
                iconColor={metrics.netPnL >= 0 ? "text-green-500" : "text-red-500"}
                valueColor={getPnLColor(metrics.netPnL)}
                delay={0.1}
              />
              <SummaryCard
                title="Win Rate"
                value={`${metrics.winRate}%`}
                icon={Target}
                iconColor="text-amber-500"
                valueColor={metrics.winRate >= 50 ? "text-gradient-green" : "text-gradient-red"}
                delay={0.15}
              />
              <SummaryCard
                title="Profit Factor"
                value={metrics.profitFactor !== null ? metrics.profitFactor.toFixed(2) : "—"}
                icon={BarChart3}
                iconColor="text-blue-500"
                valueColor={(metrics.profitFactor ?? 0) >= 1 ? "text-gradient-green" : "text-gradient-red"}
                delay={0.2}
              />
              <SummaryCard
                title="Risk/Reward"
                value={chartData.riskRewardRatio.toFixed(2)}
                icon={Zap}
                iconColor="text-purple-500"
                valueColor={chartData.riskRewardRatio >= 1 ? "text-gradient-green" : "text-gradient-red"}
                delay={0.25}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <SummaryCard
                title="Max Win Streak"
                value={chartData.maxWinStreak}
                icon={Trophy}
                iconColor="text-green-500"
                delay={0.3}
              />
              <SummaryCard
                title="Max Loss Streak"
                value={chartData.maxLossStreak}
                icon={Flame}
                iconColor="text-red-500"
                delay={0.35}
              />
              <SummaryCard
                title="Max Drawdown"
                value={`-${formatCurrency(chartData.maxDrawdown)}`}
                icon={TrendingDown}
                iconColor="text-orange-500"
                valueColor={chartData.maxDrawdown === 0 ? "text-green-500" : "text-red-500"}
                delay={0.4}
              />
              <SummaryCard
                title="Avg Holding"
                value={`${chartData.avgHoldingPeriod.toFixed(1)} days`}
                icon={Clock}
                iconColor="text-cyan-500"
                delay={0.45}
              />
            </div>

            {/* Charts - dynamically loaded */}
            <ReportsCharts
              cumulativePnL={metrics.cumulativePnL}
              monthlyData={metrics.monthlyData}
              symbolData={metrics.symbolData}
              dayOfWeekPerformance={chartData.dayOfWeekPerformance}
              tradingProfileData={chartData.tradingProfileData}
              drawdownData={chartData.drawdownData}
              winLossData={chartData.winLossData}
              netPnL={metrics.netPnL}
              totalTrades={metrics.totalTrades}
            />

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
                      <p className="text-lg sm:text-2xl font-bold text-green-500">+{formatCurrency(metrics.avgWin)}</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Avg Loss</p>
                      <p className="text-lg sm:text-2xl font-bold text-red-500">-{formatCurrency(metrics.avgLoss)}</p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">MTD P&L</p>
                      <p className={cn("text-lg sm:text-2xl font-bold", metrics.mtdPnL >= 0 ? "text-green-500" : "text-red-500")}>
                        {metrics.mtdPnL >= 0 ? "+" : "-"}{formatCurrency(metrics.mtdPnL)}
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">YTD P&L</p>
                      <p className={cn("text-lg sm:text-2xl font-bold", metrics.ytdPnL >= 0 ? "text-green-500" : "text-red-500")}>
                        {metrics.ytdPnL >= 0 ? "+" : "-"}{formatCurrency(metrics.ytdPnL)}
                      </p>
                    </div>
                    <div className="text-center p-3 sm:p-4 rounded-lg bg-card/50 border">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">Expectancy</p>
                      <p className={cn("text-lg sm:text-2xl font-bold", metrics.netPnL >= 0 ? "text-green-500" : "text-red-500")}>
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
