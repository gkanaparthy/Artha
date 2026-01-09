"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Target, BarChart3, Calendar, Activity, Zap, Trophy, Flame, Clock, PieChart as PieChartIcon, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";
import {
  LineChart,
  Line,
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

// Custom tooltip component with proper dark/light theme support
function CustomTooltip({ active, payload, label, formatter, labelFormatter }: {
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
        const [value, name] = formatter ? formatter(item.value, item.name) : [String(item.value), item.name];
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="metric-icon-bg">
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </CardHeader>
        <CardContent>
          <motion.div
            className={cn("text-2xl font-bold", valueColor)}
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

export default function ReportsPage() {
  const { filters, setBrokers } = useFilters();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const brokersInitialized = useRef(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.symbol) params.append("symbol", filters.symbol);
      if (filters.broker && filters.broker !== 'all') params.append("broker", filters.broker);

      const res = await fetch(`/api/metrics?${params.toString()}`);
      const data: Metrics = await res.json();
      setMetrics(data);

      // Populate brokers from data only on initial load or when viewing all brokers
      // This prevents the broker list from shrinking when a specific broker is filtered
      const allBrokers = new Set<string>();
      data.closedTrades?.forEach(t => allBrokers.add(t.broker));
      data.openPositions?.forEach(p => allBrokers.add(p.broker));
      const brokerList = Array.from(allBrokers).filter(Boolean);

      if (!brokersInitialized.current || (filters.broker === 'all' && brokerList.length > 0)) {
        setBrokers(brokerList);
        brokersInitialized.current = true;
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.symbol, filters.broker, setBrokers]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

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

  const formatCurrency = (value: number) =>
    `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-gradient-green";
    if (value < 0) return "text-gradient-red";
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
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Last 30 days

  // Calculate win/loss streaks
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentStreakType: "win" | "loss" | null = null;

  for (const trade of closedTrades.sort((a, b) => a.closedAt.localeCompare(b.closedAt))) {
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
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  const drawdownData = metrics.cumulativePnL.map(d => {
    cumulative = d.cumulative;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
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
    const days = (closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24);
    totalHoldingDays += days;
  }
  const avgHoldingPeriod = closedTrades.length > 0 ? totalHoldingDays / closedTrades.length : 0;

  // Risk/Reward ratio
  const riskRewardRatio = metrics.avgLoss > 0 ? metrics.avgWin / metrics.avgLoss : 0;

  // Radar chart data for trading profile
  const tradingProfileData = [
    { metric: "Win Rate", value: metrics.winRate, fullMark: 100 },
    { metric: "Profit Factor", value: Math.min((metrics.profitFactor ?? 0) * 25, 100), fullMark: 100 },
    { metric: "Risk/Reward", value: Math.min(riskRewardRatio * 25, 100), fullMark: 100 },
    { metric: "Consistency", value: Math.max(0, 100 - maxDrawdown), fullMark: 100 },
    { metric: "Activity", value: Math.min(metrics.totalTrades * 2, 100), fullMark: 100 },
  ];

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
              <span className="text-gradient">Reports</span>
              <Sparkles className="h-6 w-6 text-amber-500 float" />
            </h1>
            <p className="text-muted-foreground">In-depth analysis of your trading performance</p>
          </div>
        </motion.div>

        {/* Global Filter Bar */}
        <AnimatedCard delay={0.05}>
          <GlobalFilterBar onApply={fetchMetrics} />
        </AnimatedCard>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            value={riskRewardRatio.toFixed(2)}
            icon={Zap}
            iconColor="text-purple-500"
            valueColor={riskRewardRatio >= 1 ? "text-gradient-green" : "text-gradient-red"}
            delay={0.25}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Max Win Streak"
            value={maxWinStreak}
            icon={Trophy}
            iconColor="text-green-500"
            delay={0.3}
          />
          <SummaryCard
            title="Max Loss Streak"
            value={maxLossStreak}
            icon={Flame}
            iconColor="text-red-500"
            delay={0.35}
          />
          <SummaryCard
            title="Max Drawdown"
            value={`${maxDrawdown.toFixed(1)}%`}
            icon={TrendingDown}
            iconColor="text-orange-500"
            valueColor={maxDrawdown <= 10 ? "text-green-500" : maxDrawdown <= 25 ? "text-amber-500" : "text-red-500"}
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
              {metrics.cumulativePnL.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={metrics.cumulativePnL}>
                    <defs>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={metrics.netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={metrics.netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      className="text-muted-foreground"
                      stroke="currentColor"
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
                          payload={payload?.map(p => ({ value: p.value as number, name: p.name as string, color: metrics.netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)" }))}
                          label={String(label ?? "")}
                          formatter={(value) => [formatCurrency(value), "Cumulative P&L"]}
                          labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        />
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke={metrics.netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"}
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
        <div className="grid gap-4 md:grid-cols-2">
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
                {metrics.monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={metrics.monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "currentColor" }}
                        tickFormatter={formatMonth}
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
                            payload={payload?.map(p => ({
                              value: p.value as number,
                              name: "P&L",
                              color: (p.value as number) >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"
                            }))}
                            label={String(label ?? "")}
                            formatter={(value) => [formatCurrency(value), "P&L"]}
                            labelFormatter={formatMonth}
                          />
                        )}
                      />
                      <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                        {metrics.monthlyData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pnl >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"}
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
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: "currentColor", strokeWidth: 1 }}
                      >
                        {winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => (
                          <CustomTooltip
                            active={active}
                            payload={payload?.map(p => ({
                              value: p.value as number,
                              name: p.name as string,
                              color: p.payload?.fill || "currentColor"
                            }))}
                            formatter={(value, name) => [String(value), name]}
                          />
                        )}
                      />
                      <Legend
                        formatter={(value) => <span className="text-foreground">{value}</span>}
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

        {/* Day of Week & Daily Performance */}
        <div className="grid gap-4 md:grid-cols-2">
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
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dayOfWeekPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
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
                          payload={payload?.map(p => ({
                            value: p.value as number,
                            name: "P&L",
                            color: (p.value as number) >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"
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
                          fill={entry.pnl >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"}
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
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={tradingProfileData}>
                    <PolarGrid stroke="currentColor" className="stroke-border/50" />
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
                          payload={payload?.map(p => ({
                            value: p.value as number,
                            name: "Score",
                            color: "oklch(0.7 0.18 45)"
                          }))}
                          formatter={(value) => [`${value.toFixed(0)}/100`, "Score"]}
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
                      <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      stroke="currentColor"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      tickFormatter={(value) => `${value}%`}
                      stroke="currentColor"
                      reversed
                    />
                    <Tooltip
                      content={({ active, payload, label }) => (
                        <CustomTooltip
                          active={active}
                          payload={payload?.map(p => ({
                            value: p.value as number,
                            name: "Drawdown",
                            color: "oklch(0.65 0.2 25)"
                          }))}
                          label={String(label ?? "")}
                          formatter={(value) => [`${value.toFixed(2)}%`, "Drawdown"]}
                          labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
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
              {metrics.symbolData.length > 0 ? (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={Math.max(200, Math.min(metrics.symbolData.length, 10) * 45)}>
                    <BarChart data={metrics.symbolData.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
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
                            payload={payload?.map(p => ({
                              value: p.value as number,
                              name: "P&L",
                              color: (p.value as number) >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"
                            }))}
                            label={String(label ?? "")}
                            formatter={(value) => [formatCurrency(value), "P&L"]}
                          />
                        )}
                      />
                      <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>
                        {metrics.symbolData.slice(0, 10).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pnl >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"}
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
                          <th className="text-left p-4 font-semibold text-foreground">Symbol</th>
                          <th className="text-right p-4 font-semibold text-foreground">P&L</th>
                          <th className="text-right p-4 font-semibold text-foreground">Trades</th>
                          <th className="text-right p-4 font-semibold text-foreground">Win Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.symbolData.map((symbol, index) => (
                          <tr
                            key={symbol.symbol}
                            className={cn(
                              "border-b last:border-0 table-row-hover transition-colors",
                              index % 2 === 0 ? "bg-background" : "bg-muted/20"
                            )}
                          >
                            <td className="p-4 font-medium text-foreground">{symbol.symbol}</td>
                            <td className={cn(
                              "p-4 text-right font-mono font-semibold",
                              symbol.pnl >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {symbol.pnl >= 0 ? "+" : "-"}{formatCurrency(symbol.pnl)}
                            </td>
                            <td className="p-4 text-right text-muted-foreground">{symbol.trades}</td>
                            <td className={cn(
                              "p-4 text-right font-semibold",
                              symbol.winRate >= 60 ? "text-green-500" : symbol.winRate >= 50 ? "text-amber-500" : "text-red-500"
                            )}>
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

        {/* Stats Summary */}
        <AnimatedCard delay={0.85}>
          <Card className="card-hover bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Key Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <div className="text-center p-4 rounded-lg bg-card/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.totalTrades}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Avg Win</p>
                  <p className="text-2xl font-bold text-green-500">+{formatCurrency(metrics.avgWin)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Avg Loss</p>
                  <p className="text-2xl font-bold text-red-500">-{formatCurrency(metrics.avgLoss)}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card/50 border">
                  <p className="text-sm text-muted-foreground mb-1">MTD P&L</p>
                  <p className={cn("text-2xl font-bold", metrics.mtdPnL >= 0 ? "text-green-500" : "text-red-500")}>
                    {metrics.mtdPnL >= 0 ? "+" : "-"}{formatCurrency(metrics.mtdPnL)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card/50 border">
                  <p className="text-sm text-muted-foreground mb-1">YTD P&L</p>
                  <p className={cn("text-2xl font-bold", metrics.ytdPnL >= 0 ? "text-green-500" : "text-red-500")}>
                    {metrics.ytdPnL >= 0 ? "+" : "-"}{formatCurrency(metrics.ytdPnL)}
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-card/50 border">
                  <p className="text-sm text-muted-foreground mb-1">Expectancy</p>
                  <p className={cn("text-2xl font-bold", metrics.netPnL >= 0 ? "text-green-500" : "text-red-500")}>
                    {metrics.totalTrades > 0 ? `${metrics.netPnL >= 0 ? "+" : "-"}${formatCurrency(metrics.netPnL / metrics.totalTrades)}` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </PageTransition>
  );
}
