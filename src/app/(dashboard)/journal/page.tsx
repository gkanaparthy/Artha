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
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  X,
  BookOpen,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { TradeDetailSheet } from "@/components/trade-detail-sheet";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";

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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filters
  const [searchSymbol, setSearchSymbol] = useState("");
  const [actionFilter, setActionFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchTrades = async () => {
    try {
      const res = await fetch(`/api/trades`);
      const data = await res.json();
      setTrades(data.trades || []);
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
    if (searchSymbol) {
      const symbols = searchSymbol.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s.length > 0);
      if (symbols.length > 0) {
        result = result.filter((t) => symbols.includes(t.symbol.toLowerCase()));
      }
    }

    // Filter by action
    if (actionFilter !== "ALL") {
      result = result.filter((t) => t.action === actionFilter);
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter((t) => new Date(t.timestamp) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((t) => new Date(t.timestamp) <= toDate);
    }

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

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [trades, searchSymbol, actionFilter, dateFrom, dateTo, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const clearFilters = () => {
    setSearchSymbol("");
    setActionFilter("ALL");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchSymbol || actionFilter !== "ALL" || dateFrom || dateTo;

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown
          className={cn(
            "h-3 w-3 transition-opacity",
            sortField === field ? "opacity-100" : "opacity-30"
          )}
        />
      </div>
    </TableHead>
  );

  // Calculate quick stats
  const buyCount = filteredAndSortedTrades.filter(t => t.action === "BUY").length;
  const sellCount = filteredAndSortedTrades.filter(t => t.action === "SELL").length;
  const totalValue = filteredAndSortedTrades.reduce((sum, t) => sum + (t.price * Math.abs(t.quantity)), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

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
              <Sparkles className="h-6 w-6 text-amber-500 float" />
            </h1>
            <p className="text-muted-foreground">
              Complete history of all your trading activity
            </p>
          </div>
          <div className="text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
            <span className="font-semibold text-foreground">{filteredAndSortedTrades.length}</span> of{" "}
            <span className="font-semibold text-foreground">{trades.length}</span> trades
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <AnimatedCard delay={0.1}>
            <Card className="card-hover overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Buy Orders</p>
                    <p className="text-2xl font-bold text-green-500">{buyCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.15}>
            <Card className="card-hover overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-transparent" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Sell Orders</p>
                    <p className="text-2xl font-bold text-red-500">{sellCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <Card className="card-hover overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Filters */}
        <AnimatedCard delay={0.25}>
          <Card className="card-hover overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Filter className="h-4 w-4 text-primary" />
                  </div>
                  Filters
                </CardTitle>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {/* Symbol Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search symbol..."
                    value={searchSymbol}
                    onChange={(e) => setSearchSymbol(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>

                {/* Action Filter */}
                <div>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value as "ALL" | "BUY" | "SELL")}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="BUY">Buy Only</option>
                    <option value="SELL">Sell Only</option>
                  </select>
                </div>

                {/* Date From */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pl-9 bg-background"
                    placeholder="From date"
                  />
                </div>

                {/* Date To */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pl-9 bg-background"
                    placeholder="To date"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Trade Table */}
        <AnimatedCard delay={0.3}>
          <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <SortableHeader field="timestamp">Date</SortableHeader>
                  <SortableHeader field="symbol">Symbol</SortableHeader>
                  <SortableHeader field="action">Action</SortableHeader>
                  <SortableHeader field="quantity">Qty</SortableHeader>
                  <SortableHeader field="price">Price</SortableHeader>
                  <SortableHeader field="value">Value</SortableHeader>
                  <TableHead>Fees</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center h-32">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                        <p className="font-medium">
                          {trades.length === 0
                            ? "No trades found"
                            : "No trades match your filters"}
                        </p>
                        <p className="text-sm">
                          {trades.length === 0
                            ? "Connect your broker to sync data."
                            : "Try adjusting your filter criteria."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedTrades.map((trade, index) => (
                    <motion.tr
                      key={trade.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      className="cursor-pointer table-row-hover transition-colors border-b"
                      onClick={() => {
                        setSelectedTrade(trade);
                        setSheetOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-sm">
                        <div className="text-foreground">
                          {format(new Date(trade.timestamp), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(trade.timestamp), "HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {trade.symbol}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            trade.action === "BUY"
                              ? "bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20"
                          )}
                        >
                          {trade.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-foreground">
                        {Math.abs(trade.quantity)}
                      </TableCell>
                      <TableCell className="font-mono text-foreground">
                        ${trade.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono font-medium text-foreground">
                        ${(trade.price * Math.abs(trade.quantity)).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        ${trade.fees?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {trade.account?.brokerName || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
