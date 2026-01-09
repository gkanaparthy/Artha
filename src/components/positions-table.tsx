"use client";

import { useState, useCallback, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, X, Calendar, TrendingUp, TrendingDown, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ClosedPosition {
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

// Union type for display
interface DisplayPosition {
    symbol: string;
    quantity: number;
    entryPrice: number;
    exitPrice: number | null;
    pnl: number | null;
    openedAt: string;
    closedAt: string | null;
    broker: string;
    status: "open" | "closed";
    tradeId?: string;
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
    closedTrades: ClosedPosition[];
    openPositions?: OpenPosition[];
}

interface Filters {
    symbol: string;
    startDate: string;
    endDate: string;
    result: "all" | "winners" | "losers" | "open";
    broker: string;
}

interface PositionsTableProps {
    onMetricsUpdate?: (metrics: Metrics) => void;
}

export function PositionsTable({ onMetricsUpdate }: PositionsTableProps) {
    const [allPositions, setAllPositions] = useState<DisplayPosition[]>([]);
    const [filteredPositions, setFilteredPositions] = useState<DisplayPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [brokers, setBrokers] = useState<string[]>([]);
    const [filters, setFilters] = useState<Filters>({
        symbol: "",
        startDate: "",
        endDate: "",
        result: "all",
        broker: "all",
    });
    const [rawMetrics, setRawMetrics] = useState<Metrics | null>(null);

    const fetchPositions = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            // Only apply server-side filters for date and symbol
            if (filters.symbol) params.append("symbol", filters.symbol);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);

            const res = await fetch(`/api/metrics?${params.toString()}`);
            const data: Metrics = await res.json();
            setRawMetrics(data);

            // Convert to display format
            const closedDisplayPositions: DisplayPosition[] = (data.closedTrades || []).map(p => ({
                symbol: p.symbol,
                quantity: p.quantity,
                entryPrice: p.entryPrice,
                exitPrice: p.exitPrice,
                pnl: p.pnl,
                openedAt: p.openedAt,
                closedAt: p.closedAt,
                broker: p.broker,
                status: "closed" as const,
            }));

            const openDisplayPositions: DisplayPosition[] = (data.openPositions || []).map(p => ({
                symbol: p.symbol,
                quantity: p.quantity,
                entryPrice: p.entryPrice,
                exitPrice: null,
                pnl: null,
                openedAt: p.openedAt,
                closedAt: null,
                broker: p.broker,
                status: "open" as const,
                tradeId: p.tradeId
            }));

            const combined = [...openDisplayPositions, ...closedDisplayPositions];
            setAllPositions(combined);

            // Get unique brokers
            const uniqueBrokers = [...new Set(combined.map(p => p.broker))].filter(Boolean);
            setBrokers(uniqueBrokers);

            // Apply client-side filters
            applyFilters(combined, data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filters.symbol, filters.startDate, filters.endDate]);

    const applyFilters = useCallback((positions: DisplayPosition[], metrics: Metrics | null) => {
        let filtered = positions;

        if (filters.result === "winners") {
            filtered = filtered.filter(p => p.status === "closed" && (p.pnl ?? 0) > 0);
        } else if (filters.result === "losers") {
            filtered = filtered.filter(p => p.status === "closed" && (p.pnl ?? 0) < 0);
        } else if (filters.result === "open") {
            filtered = filtered.filter(p => p.status === "open");
        }

        if (filters.broker && filters.broker !== "all") {
            filtered = filtered.filter(p => p.broker === filters.broker);
        }

        setFilteredPositions(filtered);

        // Update parent metrics based on filtered closed positions only
        if (onMetricsUpdate && metrics) {
            const closedFiltered = filtered.filter(p => p.status === "closed");
            const winningTrades = closedFiltered.filter(t => (t.pnl ?? 0) > 0);
            const losingTrades = closedFiltered.filter(t => (t.pnl ?? 0) < 0);
            const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
            const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0));

            onMetricsUpdate({
                ...metrics,
                netPnL: Math.round(closedFiltered.reduce((sum, t) => sum + (t.pnl ?? 0), 0) * 100) / 100,
                totalTrades: closedFiltered.length,
                winningTrades: winningTrades.length,
                losingTrades: losingTrades.length,
                winRate: closedFiltered.length > 0 ? Math.round((winningTrades.length / closedFiltered.length) * 1000) / 10 : 0,
                avgWin: winningTrades.length > 0 ? Math.round((totalWins / winningTrades.length) * 100) / 100 : 0,
                avgLoss: losingTrades.length > 0 ? Math.round((totalLosses / losingTrades.length) * 100) / 100 : 0,
                profitFactor: totalLosses > 0 ? Math.round((totalWins / totalLosses) * 100) / 100 : totalWins > 0 ? null : 0,
            });
        }
    }, [filters.result, filters.broker, onMetricsUpdate]);

    // Initial load
    useEffect(() => {
        fetchPositions();
    }, []);

    // Re-apply client-side filters when they change
    useEffect(() => {
        if (allPositions.length > 0 || rawMetrics) {
            applyFilters(allPositions, rawMetrics);
        }
    }, [filters.result, filters.broker, allPositions, rawMetrics, applyFilters]);

    const handleApplyFilters = () => {
        fetchPositions();
    };

    const handleClearFilters = () => {
        setFilters({
            symbol: "",
            startDate: "",
            endDate: "",
            result: "all",
            broker: "all",
        });
        setTimeout(() => fetchPositions(), 0);
    };

    const handleDelete = async (tradeId: string) => {
        if (!confirm("Are you sure you want to delete this position? This will delete the underlying trade.")) return;

        try {
            const res = await fetch(`/api/trades?id=${tradeId}`, { method: "DELETE" });
            if (res.ok) {
                // Refresh positions
                fetchPositions();
            } else {
                alert("Failed to delete position");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting position");
        }
    };

    const hasActiveFilters = filters.symbol || filters.startDate || filters.endDate ||
        filters.result !== "all" || filters.broker !== "all";

    const formatCurrency = (value: number) => {
        return Math.abs(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const calculateReturn = (entry: number, exit: number | null) => {
        if (entry === 0 || exit === null) return null;
        return ((exit - entry) / entry) * 100;
    };

    const openCount = allPositions.filter(p => p.status === "open").length;
    const closedCount = allPositions.filter(p => p.status === "closed").length;

    if (loading && allPositions.length === 0) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search symbol..."
                        value={filters.symbol}
                        onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                        className="h-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="h-9 w-[130px]"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="h-9 w-[130px]"
                    />
                </div>
                <Select
                    value={filters.result}
                    onValueChange={(value: "all" | "winners" | "losers" | "open") =>
                        setFilters({ ...filters, result: value })
                    }
                >
                    <SelectTrigger className="w-[130px] h-9">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All ({openCount + closedCount})</SelectItem>
                        <SelectItem value="open">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-blue-500" />
                                Open ({openCount})
                            </span>
                        </SelectItem>
                        <SelectItem value="winners">
                            <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-green-500" />
                                Winners
                            </span>
                        </SelectItem>
                        <SelectItem value="losers">
                            <span className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-red-500" />
                                Losers
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
                {brokers.length > 0 && (
                    <Select
                        value={filters.broker}
                        onValueChange={(value) => setFilters({ ...filters, broker: value })}
                    >
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Broker" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Brokers</SelectItem>
                            {brokers.map((broker) => (
                                <SelectItem key={broker} value={broker}>
                                    {broker}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleApplyFilters}>
                        Apply
                    </Button>
                    {hasActiveFilters && (
                        <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                            <X className="h-4 w-4 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead>Symbol</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Entry Date</TableHead>
                            <TableHead>Exit Date</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Entry</TableHead>
                            <TableHead className="text-right">Exit</TableHead>
                            <TableHead className="text-right">P&L</TableHead>
                            <TableHead className="text-right">Return</TableHead>
                            <TableHead>Broker</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPositions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center h-24 text-muted-foreground">
                                    {hasActiveFilters
                                        ? "No positions match your filters."
                                        : "No positions found. Connect your broker to sync data."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPositions.map((position, idx) => {
                                const returnPct = calculateReturn(position.entryPrice, position.exitPrice);
                                const isOpen = position.status === "open";
                                const isProfit = !isOpen && (position.pnl ?? 0) >= 0;
                                const isLoss = !isOpen && (position.pnl ?? 0) < 0;

                                return (
                                    <motion.tr
                                        key={`${position.symbol}-${position.openedAt}-${idx}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                                        className="table-row-hover transition-colors border-b"
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {isOpen ? (
                                                    <Clock className="h-4 w-4 text-blue-500" />
                                                ) : isProfit ? (
                                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                                )}
                                                {position.symbol}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    isOpen
                                                        ? "border-blue-500/50 text-blue-500 bg-blue-500/10"
                                                        : isProfit
                                                            ? "border-green-500/50 text-green-500 bg-green-500/10"
                                                            : "border-red-500/50 text-red-500 bg-red-500/10"
                                                )}
                                            >
                                                {isOpen ? "OPEN" : "CLOSED"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(position.openedAt)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {position.closedAt ? formatDate(position.closedAt) : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">{position.quantity}</TableCell>
                                        <TableCell className="text-right">${formatCurrency(position.entryPrice)}</TableCell>
                                        <TableCell className="text-right">
                                            {position.exitPrice !== null ? `$${formatCurrency(position.exitPrice)}` : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {position.pnl !== null ? (
                                                <span
                                                    className={cn(
                                                        "font-semibold",
                                                        isProfit ? "text-green-500" : "text-red-500"
                                                    )}
                                                >
                                                    {isProfit ? "+" : "-"}${formatCurrency(position.pnl)}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {returnPct !== null ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "font-mono",
                                                        isProfit
                                                            ? "border-green-500/50 text-green-500 bg-green-500/10"
                                                            : "border-red-500/50 text-red-500 bg-red-500/10"
                                                    )}
                                                >
                                                    {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {position.broker}
                                        </TableCell>
                                        <TableCell>
                                            {isOpen && position.tradeId && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(position.tradeId!)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </motion.tr>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Summary */}
            {filteredPositions.length > 0 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
                    <span>
                        Showing {filteredPositions.length} of {allPositions.length} position{allPositions.length !== 1 ? "s" : ""}
                        {hasActiveFilters && " (filtered)"}
                        {" • "}
                        <span className="text-blue-500">{openCount} open</span>
                        {" • "}
                        <span>{closedCount} closed</span>
                    </span>
                    <span>
                        Closed P&L:{" "}
                        <span
                            className={cn(
                                "font-semibold",
                                filteredPositions.filter(p => p.status === "closed").reduce((sum, p) => sum + (p.pnl ?? 0), 0) >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                            )}
                        >
                            ${formatCurrency(filteredPositions.filter(p => p.status === "closed").reduce((sum, p) => sum + (p.pnl ?? 0), 0))}
                        </span>
                    </span>
                </div>
            )}
        </div>
    );
}
