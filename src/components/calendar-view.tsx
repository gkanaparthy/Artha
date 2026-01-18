"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatCompactCurrency } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DayData {
  date: string;
  pnl: number;
  trades: number;
}

interface CalendarViewProps {
  data: DayData[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

import { ShareReport } from "@/components/share-report";

export function CalendarView({ data }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0);

  // Group data by date string for quick lookup
  const dataByDate = useMemo(() => {
    const map = new Map<string, DayData>();
    data.forEach(d => {
      const dateKey = new Date(d.date).toISOString().split('T')[0];
      const existing = map.get(dateKey);
      if (existing) {
        existing.pnl += d.pnl;
        existing.trades += d.trades;
      } else {
        map.set(dateKey, { ...d, date: dateKey });
      }
    });
    return map;
  }, [data]);

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const weeks: Array<Array<{ day: number | null; data: DayData | null; isCurrentMonth: boolean }>> = [];
    let currentWeek: Array<{ day: number | null; data: DayData | null; isCurrentMonth: boolean }> = [];

    // Add padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      const prevMonthDay = new Date(year, month, -startPadding + i + 1);
      const dateKey = prevMonthDay.toISOString().split('T')[0];
      currentWeek.push({
        day: prevMonthDay.getDate(),
        data: dataByDate.get(dateKey) || null,
        isCurrentMonth: false
      });
    }

    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      currentWeek.push({
        day,
        data: dataByDate.get(dateKey) || null,
        isCurrentMonth: true
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add padding for days after the last day
    if (currentWeek.length > 0) {
      let nextDay = 1;
      while (currentWeek.length < 7) {
        const nextMonthDay = new Date(year, month + 1, nextDay);
        const dateKey = nextMonthDay.toISOString().split('T')[0];
        currentWeek.push({
          day: nextDay,
          data: dataByDate.get(dateKey) || null,
          isCurrentMonth: false
        });
        nextDay++;
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentDate, dataByDate]);

  // Calculate weekly summaries
  const weeklySummaries = useMemo(() => {
    return calendarData.map(week => {
      const weekData = week.filter(d => d.data !== null);
      const totalPnL = weekData.reduce((sum, d) => sum + (d.data?.pnl || 0), 0);
      const totalTrades = weekData.reduce((sum, d) => sum + (d.data?.trades || 0), 0);
      return { pnl: totalPnL, trades: totalTrades };
    });
  }, [calendarData]);

  // Calculate monthly summary
  const monthlySummary = useMemo(() => {
    const monthData = calendarData.flat().filter(d => d.isCurrentMonth && d.data);
    const totalPnL = monthData.reduce((sum, d) => sum + (d.data?.pnl || 0), 0);
    const totalTrades = monthData.reduce((sum, d) => sum + (d.data?.trades || 0), 0);
    const profitDays = monthData.filter(d => (d.data?.pnl || 0) > 0).length;
    const lossDays = monthData.filter(d => (d.data?.pnl || 0) < 0).length;
    return { totalPnL, totalTrades, profitDays, lossDays };
  }, [calendarData]);

  const navigateMonth = (delta: number) => {
    setDirection(delta);
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setDirection(today > currentDate ? 1 : -1);
    setCurrentDate(today);
  };

  const getPnLTextColor = (pnl: number) => {
    if (pnl > 0) return "text-emerald-500";
    if (pnl < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  const getIntensity = (pnl: number, maxPnL: number) => {
    if (maxPnL === 0) return 0.2;
    const intensity = Math.min(Math.abs(pnl) / maxPnL, 1);
    return 0.15 + intensity * 0.45;
  };

  const maxAbsPnL = useMemo(() => {
    const allPnLs = Array.from(dataByDate.values()).map(d => Math.abs(d.pnl));
    return Math.max(...allPnLs, 1);
  }, [dataByDate]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 sm:h-9">
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2 no-export self-end sm:self-auto">
          <div className="hidden sm:block">
            <ShareReport elementId="share-calendar-capture" title={`${MONTHS[currentDate.getMonth()]} Performance`} />
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} className="h-8 w-8 sm:h-10 sm:w-10">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} className="h-8 w-8 sm:h-10 sm:w-10">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Shareable Area */}
      <div id="share-calendar-capture" className="space-y-4 p-4 -m-4 rounded-2xl bg-background">
        <div className="hidden show-on-export mb-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold text-primary">Artha Trading Journal</h2>
              <p className="text-sm text-muted-foreground">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">arthatrades.com</p>
            </div>
          </div>
        </div>

        {/* Monthly Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-lg sm:rounded-xl bg-card/50 border p-3 sm:p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly P&L</p>
            <p className={cn("font-bold mt-1", getPnLTextColor(monthlySummary.totalPnL))}>
              <span className="hidden sm:inline text-2xl">
                {monthlySummary.totalPnL >= 0 ? "+" : "-"}${formatCurrency(monthlySummary.totalPnL)}
              </span>
              <span className="sm:hidden text-lg">
                {formatCompactCurrency(monthlySummary.totalPnL, true)}
              </span>
            </p>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-card/50 border p-3 sm:p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Trades</p>
            <p className="text-lg sm:text-2xl font-bold mt-1">{monthlySummary.totalTrades}</p>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-card/50 border p-3 sm:p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit Days</p>
            <p className="text-lg sm:text-2xl font-bold mt-1 text-emerald-500">{monthlySummary.profitDays}</p>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-card/50 border p-3 sm:p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Loss Days</p>
            <p className="text-lg sm:text-2xl font-bold mt-1 text-red-500">{monthlySummary.lossDays}</p>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="rounded-lg sm:rounded-xl border bg-card/30 overflow-x-auto">
          {/* Day Headers */}
          <div className="grid grid-cols-7 md:grid-cols-8 border-b bg-muted/30">
            {DAYS.map(day => (
              <div key={day} className="p-1.5 sm:p-3 text-center text-xs sm:text-sm font-medium text-muted-foreground">
                <span className="sm:hidden">{day.slice(0, 2)}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
            <div className="hidden md:block p-3 text-center text-sm font-medium text-muted-foreground border-l">
              Week
            </div>
          </div>

          {/* Calendar Body */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentDate.toISOString()}
              initial={{ opacity: 0, x: direction * 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -50 }}
              transition={{ duration: 0.2 }}
            >
              {calendarData.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 md:grid-cols-8 border-b last:border-b-0">
                  {week.map((dayInfo, dayIdx) => {
                    const intensity = dayInfo.data ? getIntensity(dayInfo.data.pnl, maxAbsPnL) : 0;
                    const bgColor = dayInfo.data
                      ? dayInfo.data.pnl > 0
                        ? `rgba(16, 185, 129, ${intensity})`
                        : dayInfo.data.pnl < 0
                          ? `rgba(239, 68, 68, ${intensity})`
                          : undefined
                      : undefined;

                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "min-h-[70px] sm:min-h-[90px] md:min-h-[100px] p-1.5 sm:p-2 border-r last:border-r-0 md:last:border-r transition-all duration-200",
                          !dayInfo.isCurrentMonth && "opacity-40",
                          dayInfo.data && "cursor-pointer hover:brightness-110"
                        )}
                        style={{ backgroundColor: bgColor }}
                      >
                        <div className={cn(
                          "text-xs sm:text-sm font-medium mb-0.5 sm:mb-1",
                          !dayInfo.isCurrentMonth && "text-muted-foreground"
                        )}>
                          {dayInfo.day}
                        </div>
                        {dayInfo.data && (
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className={cn(
                              "font-bold leading-tight",
                              getPnLTextColor(dayInfo.data.pnl)
                            )}>
                              <span className="hidden md:inline text-lg">
                                {dayInfo.data.pnl >= 0 ? "+" : ""}${formatCurrency(dayInfo.data.pnl)}
                              </span>
                              <span className="md:hidden text-xs sm:text-sm">
                                {formatCompactCurrency(dayInfo.data.pnl, true)}
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">
                              {dayInfo.data.trades} trade{dayInfo.data.trades !== 1 ? "s" : ""}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Weekly Summary - Hidden on mobile */}
                  <div className={cn(
                    "hidden md:flex min-h-[100px] p-2 border-l flex-col justify-center items-center",
                    weeklySummaries[weekIdx].pnl > 0 && "bg-emerald-500/10",
                    weeklySummaries[weekIdx].pnl < 0 && "bg-red-500/10"
                  )}>
                    {weeklySummaries[weekIdx].trades > 0 ? (
                      <>
                        <div className={cn(
                          "font-bold",
                          getPnLTextColor(weeklySummaries[weekIdx].pnl)
                        )}>
                          <span className="hidden lg:inline text-lg">
                            {weeklySummaries[weekIdx].pnl >= 0 ? "+" : ""}${formatCurrency(weeklySummaries[weekIdx].pnl)}
                          </span>
                          <span className="lg:hidden text-sm">
                            {formatCompactCurrency(weeklySummaries[weekIdx].pnl, true)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {weeklySummaries[weekIdx].trades} trades
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm">—</span>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-emerald-500/30 border border-emerald-500/50" />
            <span>Profit Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-500/30 border border-red-500/50" />
            <span>Loss Day</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500" />
            <span className="hidden sm:inline">Higher intensity = larger P&L</span>
            <span className="sm:hidden">Intensity = P&L size</span>
          </div>
        </div>

        <div className="hidden show-on-export pt-4 border-t border-primary/20 text-center">
          <p className="text-xs text-muted-foreground">Generated by arthatrades.com — Professional Trading Journal</p>
        </div>
      </div>
    </div>
  );
}
