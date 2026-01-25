"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, BookOpen, Activity } from "lucide-react";
import { format } from "date-fns";
import { TradeDetailSheet } from "@/components/trade-detail-sheet";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn, formatCompactCurrency } from "@/lib/utils";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";
import { useSort } from "@/hooks/use-sort";
import type { Trade } from "@/types/trading";

interface JournalViewProps {
  initialTrades?: Trade[];
  isDemo?: boolean;
}

type SortField =
  | "timestamp"
  | "symbol"
  | "action"
  | "quantity"
  | "price"
  | "value";

// Get sort value for a trade based on field
const getTradeSortValue = (t: Trade, field: SortField): string | number => {
  switch (field) {
    case "timestamp":
      return new Date(t.timestamp).getTime();
    case "symbol":
      return t.symbol;
    case "action":
      return t.action;
    case "quantity":
      return t.quantity;
    case "price":
      return t.price;
    case "value":
      return t.price * t.quantity;
    default:
      return 0;
  }
};

// Mobile Trade Card Component
function MobileTradeCard({
  trade,
  idx,
  onClick,
  onDelete,
  isDemo
}: {
  trade: Trade;
  idx: number;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDemo: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: idx * 0.05 }}
      className="bg-card border rounded-xl p-4 space-y-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate">{trade.symbol}</div>
          <div className="text-sm text-muted-foreground">
            {format(new Date(trade.timestamp), "MMM d, yyyy")}
          </div>
        </div>
        <Badge
          variant={
            trade.action.includes("BUY") || trade.action === "ASSIGNMENT"
              ? "outline"
              : "secondary"
          }
          className={cn(
            "font-mono uppercase text-xs shrink-0",
            trade.action.includes("BUY") || trade.action === "ASSIGNMENT"
              ? "border-green-500 text-green-500 bg-green-500/10"
              : "text-red-500 bg-red-500/10"
          )}
        >
          {trade.action}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Quantity</div>
          <div className="font-mono font-semibold">{trade.quantity}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Price</div>
          <div className="font-mono font-semibold">
            {trade.price >= 1000
              ? formatCompactCurrency(trade.price).replace(/^\$/, '$')
              : `$${trade.price.toFixed(2)}`
            }
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Value</div>
          <div className="font-mono font-semibold text-muted-foreground">
            {(trade.quantity * trade.price) >= 1000
              ? formatCompactCurrency(trade.quantity * trade.price).replace(/^\$/, '$')
              : `$${(trade.quantity * trade.price).toFixed(2)}`
            }
          </div>
        </div>
        {!isDemo && (
          <div className="flex items-end justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function JournalView({ initialTrades, isDemo = false }: JournalViewProps) {
  const { filters } = useFilters();
  const [trades, setTrades] = useState<Trade[]>(initialTrades || []);
  const [loading, setLoading] = useState(!isDemo);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchTrades = useCallback(async () => {
    if (isDemo) return; // Don't fetch in demo mode

    try {
      setLoading(true);
      const res = await fetch(`/api/trades`);
      const data = await res.json();
      const loadedTrades: Trade[] = data.trades || [];
      setTrades(loadedTrades);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    if (!isDemo) {
      fetchTrades();
    }
  }, [fetchTrades, isDemo]);

  const handleDelete = async (tradeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDemo) return; // Disabled in demo mode
    if (!confirm("Are you sure you want to delete this trade?")) return;

    try {
      const res = await fetch(`/api/trades?id=${tradeId}`, { method: "DELETE" });
      if (res.ok) {
        setTrades((prev) => prev.filter((t) => t.id !== tradeId));
      } else {
        alert("Failed to delete trade");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting trade");
    }
  };

  // Apply filters
  const filteredTrades = useMemo(() => {
    let result = [...trades];

    // Filter by symbol (exact match, case-insensitive)
    if (filters.symbol) {
      const symbols = filters.symbol
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 0);
      if (symbols.length > 0) {
        result = result.filter((t) => symbols.includes(t.symbol.toLowerCase()));
      }
    }

    // Filter by action
    if (filters.action && filters.action !== "ALL") {
      result = result.filter((t) => {
        const a = t.action.toUpperCase();
        if (filters.action === "BUY")
          return a.includes("BUY") || a === "ASSIGNMENT";
        if (filters.action === "SELL")
          return a.includes("SELL") || a === "EXERCISES";
        return true;
      });
    }

    // Filter by account
    if (filters.accountId && filters.accountId !== "all") {
      result = result.filter((t) => t.accountId === filters.accountId);
    }

    // Filter by date range
    if (filters.startDate) {
      const fromDate = new Date(filters.startDate);
      result = result.filter((t) => new Date(t.timestamp) >= fromDate);
    }
    if (filters.endDate) {
      const toDate = new Date(filters.endDate);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.timestamp) <= toDate);
    }

    // Filter by asset type
    if (filters.assetType && filters.assetType !== "all") {
      result = result.filter((t) => t.type === filters.assetType);
    }

    return result;
  }, [trades, filters]);

  // Apply sorting using the shared hook
  const {
    sortedData: sortedTrades,
    handleSort,
    getSortIcon,
  } = useSort<Trade, SortField>({
    data: filteredTrades,
    defaultField: "timestamp",
    defaultDirection: "desc",
    getValueForField: getTradeSortValue,
  });

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
              <span className="text-gradient">Trade Journal</span>
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 float" />
              {isDemo && (
                <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                  (Demo Mode)
                </span>
              )}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isDemo
                ? "Sample trading history data"
                : "Review and manage your trading history"}
            </p>
          </div>
          {!isDemo && (
            <Button
              onClick={() => fetchTrades && fetchTrades()}
              variant="outline"
              size="sm"
              className="hidden md:flex h-9"
            >
              Refresh
            </Button>
          )}
        </motion.div>

        {/* Global Filter Bar */}
        <AnimatedCard delay={0.1}>
          <GlobalFilterBar />
        </AnimatedCard>

        {/* Table Card - Desktop */}
        <AnimatedCard delay={0.2} className="hidden md:block">
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead
                        className="w-[180px] cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("timestamp")}
                      >
                        <div className="flex items-center gap-2">
                          Date {getSortIcon("timestamp")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("symbol")}
                      >
                        <div className="flex items-center gap-2">
                          Symbol {getSortIcon("symbol")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("action")}
                      >
                        <div className="flex items-center gap-2">
                          Action {getSortIcon("action")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("quantity")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Quantity {getSortIcon("quantity")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("price")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Price {getSortIcon("price")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                        onClick={() => handleSort("value")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Value {getSortIcon("value")}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex justify-center items-center">
                            <Loader2 className="animate-spin h-6 w-6 text-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sortedTrades.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {isDemo
                            ? "No demo trades available."
                            : "No trades found matching your criteria."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedTrades.map((trade, i) => (
                        <motion.tr
                          key={trade.id}
                          className="table-row-hover cursor-pointer"
                          onClick={() => {
                            setSelectedTrade(trade);
                            setSheetOpen(true);
                          }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                        >
                          <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                            {format(
                              new Date(trade.timestamp),
                              "MMM d, yyyy"
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {trade.symbol}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                trade.action.includes("BUY") ||
                                  trade.action === "ASSIGNMENT"
                                  ? "outline"
                                  : "secondary"
                              }
                              className={cn(
                                "font-mono uppercase text-xs",
                                trade.action.includes("BUY") ||
                                  trade.action === "ASSIGNMENT"
                                  ? "border-green-500 text-green-500 bg-green-500/10"
                                  : "text-red-500 bg-red-500/10"
                              )}
                            >
                              {trade.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {trade.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${trade.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            ${(trade.quantity * trade.price).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isDemo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleDelete(trade.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Mobile Card View */}
        <AnimatedCard delay={0.2} className="md:hidden">
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                </div>
              ) : sortedTrades.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  {isDemo
                    ? "No demo trades available."
                    : "No trades found matching your criteria."}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedTrades.map((trade, i) => (
                    <MobileTradeCard
                      key={trade.id}
                      trade={trade}
                      idx={i}
                      onClick={() => {
                        setSelectedTrade(trade);
                        setSheetOpen(true);
                      }}
                      onDelete={(e) => handleDelete(trade.id, e)}
                      isDemo={isDemo}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        <TradeDetailSheet
          trade={selectedTrade}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </PageTransition>
  );
}
