"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-card/50 border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly P&L</p>
          <p className={cn("text-2xl font-bold mt-1", getPnLTextColor(monthlySummary.totalPnL))}>
            {monthlySummary.totalPnL >= 0 ? "+" : "-"}${formatCurrency(monthlySummary.totalPnL)}
          </p>
        </div>
        <div className="rounded-xl bg-card/50 border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Trades</p>
          <p className="text-2xl font-bold mt-1">{monthlySummary.totalTrades}</p>
        </div>
        <div className="rounded-xl bg-card/50 border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit Days</p>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{monthlySummary.profitDays}</p>
        </div>
        <div className="rounded-xl bg-card/50 border p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Loss Days</p>
          <p className="text-2xl font-bold mt-1 text-red-500">{monthlySummary.lossDays}</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card/30 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b bg-muted/30">
          {DAYS.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          <div className="p-3 text-center text-sm font-medium text-muted-foreground border-l">
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
              <div key={weekIdx} className="grid grid-cols-8 border-b last:border-b-0">
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
                        "min-h-[100px] p-2 border-r last:border-r-0 transition-all duration-200",
                        !dayInfo.isCurrentMonth && "opacity-40",
                        dayInfo.data && "cursor-pointer hover:brightness-110"
                      )}
                      style={{ backgroundColor: bgColor }}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        !dayInfo.isCurrentMonth && "text-muted-foreground"
                      )}>
                        {dayInfo.day}
                      </div>
                      {dayInfo.data && (
                        <div className="space-y-1">
                          <div className={cn(
                            "text-lg font-bold",
                            getPnLTextColor(dayInfo.data.pnl)
                          )}>
                            {dayInfo.data.pnl >= 0 ? "+" : ""}${formatCurrency(dayInfo.data.pnl)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dayInfo.data.trades} trade{dayInfo.data.trades !== 1 ? "s" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Weekly Summary */}
                <div className={cn(
                  "min-h-[100px] p-2 border-l flex flex-col justify-center items-center",
                  weeklySummaries[weekIdx].pnl > 0 && "bg-emerald-500/10",
                  weeklySummaries[weekIdx].pnl < 0 && "bg-red-500/10"
                )}>
                  {weeklySummaries[weekIdx].trades > 0 ? (
                    <>
                      <div className={cn(
                        "text-lg font-bold",
                        getPnLTextColor(weeklySummaries[weekIdx].pnl)
                      )}>
                        {weeklySummaries[weekIdx].pnl >= 0 ? "+" : ""}${formatCurrency(weeklySummaries[weekIdx].pnl)}
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
      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500/50" />
          <span>Profit Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/30 border border-red-500/50" />
          <span>Loss Day</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span>Higher intensity = larger P&L</span>
        </div>
      </div>
    </div>
  );
}
