"use client";

import { useEffect, useState, useMemo } from "react";
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
import {
  Loader2,
  ArrowUpDown,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Trash2,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { TradeDetailSheet } from "@/components/trade-detail-sheet";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";

interface Trade {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  timestamp: string;
  type: string;
  fees: number;
  account: {
    brokerName: string;
  };
  tags: { id: string; name: string; color: string }[];
}

type SortField = "timestamp" | "symbol" | "action" | "quantity" | "price" | "value";
type SortDirection = "asc" | "desc";

export default function JournalPage() {
  const { filters, setBrokers } = useFilters();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trades`);
      const data = await res.json();
      const loadedTrades: Trade[] = data.trades || [];
      setTrades(loadedTrades);

      // Extract brokers and update context
      const uniqueBrokers = [...new Set(loadedTrades.map(t => t.account?.brokerName))].filter(Boolean) as string[];
      setBrokers(uniqueBrokers);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const handleDelete = async (tradeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const filteredAndSortedTrades = useMemo(() => {
    let result = [...trades];

    // Filter by symbol
    if (filters.symbol) {
      const symbols = filters.symbol.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
      if (symbols.length > 0) {
        result = result.filter((t) => symbols.some(s => t.symbol.toLowerCase().includes(s)));
      }
    }

    // Filter by action
    if (filters.action && filters.action !== "ALL") {
      // SnapTrade often uses "BUY", "SELL", "BUY_TO_OPEN" etc.
      // We map specific actions to rough Categories "BUY" or "SELL".
      result = result.filter((t) => {
        const a = t.action.toUpperCase();
        if (filters.action === "BUY") return a.includes("BUY") || a === "ASSIGNMENT";
        if (filters.action === "SELL") return a.includes("SELL") || a === "EXERCISES";
        return true;
      });
    }

    // Filter by broker
    if (filters.broker && filters.broker !== "all") {
      result = result.filter(t => t.account?.brokerName === filters.broker);
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

    // Status filter is ignored for Raw Trades

    // Sort
    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case "timestamp":
          aVal = new Date(a.timestamp).getTime();
          bVal = new Date(b.timestamp).getTime();
          break;
        case "symbol":
          aVal = a.symbol;
          bVal = b.symbol;
          break;
        case "action":
          aVal = a.action;
          bVal = b.action;
          break;
        case "quantity":
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "value":
          aVal = a.price * a.quantity;
          bVal = b.price * b.quantity;
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [trades, filters, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground/30" />;
    return sortDirection === "asc" ?
      <TrendingUp className="h-4 w-4 text-primary" /> :
      <TrendingDown className="h-4 w-4 text-primary" />;
  };

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
              <span className="text-gradient">Trade Journal</span>
              <BookOpen className="h-6 w-6 text-blue-500 float" />
            </h1>
            <p className="text-muted-foreground">
              Review and manage your trading history
            </p>
          </div>
          <Button onClick={() => fetchTrades && fetchTrades()} variant="outline" size="sm" className="hidden md:flex">
            Refresh
          </Button>
        </motion.div>

        {/* Global Filter Bar */}
        <AnimatedCard delay={0.1}>
          <GlobalFilterBar showActionFilter={true} onApply={fetchTrades} />
        </AnimatedCard>

        {/* Table Card */}
        <AnimatedCard delay={0.2}>
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[180px] cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("timestamp")}>
                        <div className="flex items-center gap-2">Date & Time {getSortIcon("timestamp")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("symbol")}>
                        <div className="flex items-center gap-2">Symbol {getSortIcon("symbol")}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("action")}>
                        <div className="flex items-center gap-2">Action {getSortIcon("action")}</div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("quantity")}>
                        <div className="flex items-center justify-end gap-2">Quantity {getSortIcon("quantity")}</div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("price")}>
                        <div className="flex items-center justify-end gap-2">Price {getSortIcon("price")}</div>
                      </TableHead>
                      <TableHead className="text-right cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("value")}>
                        <div className="flex items-center justify-end gap-2">Value {getSortIcon("value")}</div>
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
                    ) : filteredAndSortedTrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No trades found matching your criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedTrades.map((trade, i) => (
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
                            {format(new Date(trade.timestamp), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {trade.symbol}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              trade.action.includes("BUY") || trade.action === "ASSIGNMENT" ? "outline" : "secondary"
                            } className={cn(
                              "font-mono uppercase text-xs",
                              (trade.action.includes("BUY") || trade.action === "ASSIGNMENT")
                                ? "border-green-500 text-green-500 bg-green-500/10"
                                : "text-red-500 bg-red-500/10"
                            )}>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleDelete(trade.id, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        <TradeDetailSheet
          trade={selectedTrade as any}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      </div>
    </PageTransition>
  );
}
