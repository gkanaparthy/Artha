"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Calendar, Activity, Target, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface DayOfWeekData {
  day: string;
  pnl: number;
  trades: number;
}

interface TradingProfileData {
  metric: string;
  value: number;
  fullMark: number;
}

interface DrawdownData {
  date: string;
  cumulative: number;
  drawdown: number;
}

interface ReportsChartsProps {
  cumulativePnL: CumulativePnLData[];
  monthlyData: MonthlyData[];
  symbolData: SymbolData[];
  dayOfWeekPerformance: DayOfWeekData[];
  tradingProfileData: TradingProfileData[];
  drawdownData: DrawdownData[];
  winLossData: Array<{ name: string; value: number; fill: string }>;
  netPnL: number;
  totalTrades: number;
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

const formatCurrency = (value: number) =>
  `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatMonth = (month: string) => {
  const [year, m] = month.split("-");
  const date = new Date(parseInt(year), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

export function ReportsCharts({
  cumulativePnL,
  monthlyData,
  symbolData,
  dayOfWeekPerformance,
  tradingProfileData,
  drawdownData,
  winLossData,
  netPnL,
  totalTrades,
}: ReportsChartsProps) {
  return (
    <>
      {/* Cumulative P&L Chart */}
      <Card className="card-hover">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Equity Curve
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {cumulativePnL.length > 0 ? (
            <ResponsiveContainer width="100%" height={300} className="sm:h-[350px]">
              <AreaChart data={cumulativePnL}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  className="text-muted-foreground"
                  stroke="currentColor"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(value) => `$${value}`}
                  className="text-muted-foreground"
                  stroke="currentColor"
                  width={50}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <CustomTooltip
                      active={active}
                      payload={payload?.map(p => ({ value: p.value as number, name: p.name as string, color: netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)" }))}
                      label={String(label ?? "")}
                      formatter={(value) => [formatCurrency(value), "Cumulative P&L"]}
                      labelFormatter={(l) => new Date(l).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={netPnL >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"}
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

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Performance */}
        <Card className="card-hover">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Monthly Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    tickFormatter={formatMonth}
                    stroke="currentColor"
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    tickFormatter={(value) => `$${value}`}
                    stroke="currentColor"
                    width={45}
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
                    {monthlyData.map((entry, index) => (
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

        {/* Win/Loss Distribution */}
        <Card className="card-hover">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Win/Loss Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {totalTrades > 0 ? (
              <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value, percent }) => {
                      // On mobile, show shorter labels
                      if (window.innerWidth < 640) {
                        return `${value}`;
                      }
                      return `${name}: ${value} (${((percent ?? 0) * 100).toFixed(0)}%)`;
                    }}
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
      </div>

      {/* Day of Week & Trading Profile */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Performance by Day of Week */}
        <Card className="card-hover">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Performance by Day
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
              <BarChart data={dayOfWeekPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  stroke="currentColor"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(value) => `$${value}`}
                  stroke="currentColor"
                  width={45}
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

        {/* Trading Profile Radar */}
        <Card className="card-hover">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Trading Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={250} className="sm:h-[280px]">
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
      </div>

      {/* Drawdown Chart */}
      {drawdownData.length > 0 && (
        <Card className="card-hover">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
              Drawdown Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={220} className="sm:h-[250px]">
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
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  stroke="currentColor"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickFormatter={(value) => `$${value}`}
                  stroke="currentColor"
                  reversed
                  width={50}
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
                      formatter={(value) => [formatCurrency(value), "Drawdown"]}
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
      )}

      {/* Performance by Symbol */}
      <Card className="card-hover">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Performance by Symbol
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {symbolData.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              <ResponsiveContainer width="100%" height={Math.max(180, Math.min(symbolData.length, 10) * 40)} className="sm:h-auto">
                <BarChart data={symbolData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    tickFormatter={(value) => `$${value}`}
                    stroke="currentColor"
                  />
                  <YAxis
                    type="category"
                    dataKey="symbol"
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    width={60}
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
                    {symbolData.slice(0, 10).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.pnl >= 0 ? "oklch(0.7 0.2 145)" : "oklch(0.65 0.2 25)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Symbol Stats Table */}
              <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 sm:p-4 font-semibold text-foreground">Symbol</th>
                      <th className="text-right p-2 sm:p-4 font-semibold text-foreground">P&L</th>
                      <th className="text-right p-2 sm:p-4 font-semibold text-foreground">Trades</th>
                      <th className="text-right p-2 sm:p-4 font-semibold text-foreground">Win Rate</th>
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
                        <td className="p-2 sm:p-4 font-medium text-foreground">{symbol.symbol}</td>
                        <td className={cn(
                          "p-2 sm:p-4 text-right font-mono font-semibold",
                          symbol.pnl >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          {symbol.pnl >= 0 ? "+" : "-"}{formatCurrency(symbol.pnl)}
                        </td>
                        <td className="p-2 sm:p-4 text-right text-muted-foreground">{symbol.trades}</td>
                        <td className={cn(
                          "p-2 sm:p-4 text-right font-semibold",
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
    </>
  );
}
