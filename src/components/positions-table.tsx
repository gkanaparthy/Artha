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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, TrendingUp, TrendingDown, Trash2, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import { useFilters } from "@/contexts/filter-context";
import { GlobalFilterBar } from "@/components/global-filter-bar";
import { useSort } from "@/hooks/use-sort";
import type { DisplayPosition, Metrics } from "@/types/trading";
import { exportToExcel, formatCurrencyForExport, formatDateForExport } from "@/lib/export";

interface LivePosition {
    symbol: string;
    units: number;
    price: number | null;
    averageCost: number | null;
    openPnl: number | null;
    marketValue: number | null;
    type: 'STOCK' | 'OPTION';
    accountId: string;
    brokerName: string;
}

interface PositionsTableProps {
    onMetricsUpdate?: (metrics: Metrics) => void;
    initialPositions?: DisplayPosition[];
    isDemo?: boolean;
    livePositions?: LivePosition[];
}

type SortField = "symbol" | "status" | "entryDate" | "exitDate" | "quantity" | "entryPrice" | "exitPrice" | "pnl" | "return" | "broker";

// Get sort value for a position based on field
const getSortValue = (p: DisplayPosition, field: SortField): string | number => {
    switch (field) {
        case "symbol": return p.symbol;
        case "status": return p.status;
        case "entryDate": return new Date(p.openedAt).getTime();
        case "exitDate": return p.closedAt ? new Date(p.closedAt).getTime() : 0;
        case "quantity": return p.quantity;
        case "entryPrice": return p.entryPrice;
        case "exitPrice": return p.exitPrice ?? 0;
        case "pnl": return p.pnl ?? 0;
        case "return": return p.exitPrice && p.entryPrice ? (p.exitPrice - p.entryPrice) / p.entryPrice : 0;
        case "broker": return p.broker;
        default: return 0;
    }
};

export function PositionsTable({ onMetricsUpdate, initialPositions, isDemo = false, livePositions }: PositionsTableProps) {
    const { filters } = useFilters();
    const [allPositions, setAllPositions] = useState<DisplayPosition[]>(initialPositions || []);
    const [filteredPositions, setFilteredPositions] = useState<DisplayPosition[]>(initialPositions || []);
    const [loading, setLoading] = useState(!isDemo);
    const [rawMetrics, setRawMetrics] = useState<Metrics | null>(null);

    const { sortedData: sortedPositions, handleSort, getSortIcon } = useSort<DisplayPosition, SortField>({
        data: filteredPositions,
        defaultField: "entryDate",
        defaultDirection: "desc",
        getValueForField: getSortValue,
    });

    // Check if filters are hiding positions
    const hasFiltersApplied =
        filters.symbol ||
        filters.startDate ||
        filters.endDate ||
        filters.status !== "all" ||
        filters.accountId !== "all" ||
        filters.assetType !== "all";

    const isFilteringPositions = hasFiltersApplied && sortedPositions.length < allPositions.length;

    /* 
    // Merge live positions data with open positions
    const positionsWithLiveData = useMemo(() => {
        if (!livePositions || livePositions.length === 0) {
            return sortedPositions;
        }

        // Create a lookup map for live positions by symbol
        const liveMap = new Map<string, LivePosition>();
        for (const live of livePositions) {
            // Key by symbol (could also include accountId for more precision)
            liveMap.set(live.symbol, live);
        }

        return sortedPositions.map(position => {
            if (position.status !== 'open') {
                return position;
            }

            // Try to find matching live position
            const liveData = liveMap.get(position.symbol);
            if (liveData) {
                return {
                    ...position,
                    livePrice: liveData.price,
                    unrealizedPnl: liveData.openPnl,
                    marketValue: liveData.marketValue,
                };
            }

            return position;
        });
    }, [sortedPositions, livePositions]);
    */
    const positionsWithLiveData = sortedPositions;

    const applyFilters = useCallback((positions: DisplayPosition[], metrics: Metrics | null) => {
        let filtered = positions;

        // Status Filter
        if (filters.status === "winners") {
            filtered = filtered.filter(p => p.status === "closed" && (p.pnl ?? 0) > 0);
        } else if (filters.status === "losers") {
            filtered = filtered.filter(p => p.status === "closed" && (p.pnl ?? 0) < 0);
        } else if (filters.status === "open") {
            filtered = filtered.filter(p => p.status === "open");
        }

        // Account Filter
        if (filters.accountId && filters.accountId !== "all") {
            filtered = filtered.filter(p => p.accountId === filters.accountId);
        }

        // Asset Type Filter
        if (filters.assetType && filters.assetType !== "all") {
            filtered = filtered.filter(p => p.type === filters.assetType);
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
    }, [filters.status, filters.accountId, filters.assetType, onMetricsUpdate]);

    const fetchPositions = useCallback(async () => {
        // In demo mode, just apply filters to initial positions
        if (isDemo) {
            if (initialPositions) {
                applyFilters(initialPositions, null);
            }
            return;
        }

        try {
            setLoading(true);
            const params = new URLSearchParams();

            // Apply all filters server-side
            if (filters.symbol) params.append("symbol", filters.symbol);
            if (filters.startDate) params.append("startDate", filters.startDate);
            if (filters.endDate) params.append("endDate", filters.endDate);
            if (filters.accountId && filters.accountId !== 'all') params.append("accountId", filters.accountId);
            if (filters.assetType && filters.assetType !== 'all') params.append("assetType", filters.assetType);

            const res = await fetch(`/api/metrics?${params.toString()}`);
            const data: Metrics = await res.json();
            setRawMetrics(data);

            const closedDisplayPositions: DisplayPosition[] = (data.closedTrades || []).map(p => ({
                symbol: p.symbol,
                quantity: p.quantity,
                entryPrice: p.entryPrice,
                exitPrice: p.exitPrice,
                pnl: p.pnl,
                openedAt: p.openedAt,
                closedAt: p.closedAt,
                broker: p.broker,
                accountId: p.accountId,
                status: "closed" as const,
                type: p.type,
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
                accountId: p.accountId,
                status: "open" as const,
                tradeId: p.tradeId,
                type: p.type,
            }));

            const combined = [...openDisplayPositions, ...closedDisplayPositions];
            setAllPositions(combined);

            // Apply client-side filters
            applyFilters(combined, data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [filters.symbol, filters.startDate, filters.endDate, filters.accountId, filters.assetType, applyFilters, isDemo, initialPositions]);

    // Refetch when any filter changes
    useEffect(() => {
        fetchPositions();
    }, [fetchPositions]);

    useEffect(() => {
        if (allPositions.length > 0 || rawMetrics) {
            applyFilters(allPositions, rawMetrics);
        }
    }, [filters.status, filters.accountId, filters.assetType, allPositions, rawMetrics, applyFilters]);

    // Handle Delete (disabled in demo mode)
    const handleDelete = async (tradeId: string) => {
        if (isDemo) return; // Disabled in demo mode
        if (!confirm("Are you sure you want to delete this position? This will delete the underlying trade.")) return;

        try {
            const res = await fetch(`/api/trades?id=${tradeId}`, { method: "DELETE" });
            if (res.ok) {
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
        filters.status !== "all" || filters.accountId !== "all" || filters.assetType !== "all";

    const openCount = allPositions.filter(p => p.status === "open").length;
    const closedCount = allPositions.filter(p => p.status === "closed").length;

    // Mobile Card Component
    const MobilePositionCard = ({ position, idx }: { position: DisplayPosition; idx: number }) => {
        const isOpen = position.status === "open";
        const displayPnl = isOpen ? null : position.pnl;
        const displayPrice = isOpen ? null : position.exitPrice;
        const returnPct = !isOpen && displayPrice && position.entryPrice
            ? ((displayPrice - position.entryPrice) / position.entryPrice) * 100
            : null;
        const isProfit = (displayPnl ?? 0) >= 0;
        const shouldAnimate = idx < 10;

        return (
            <motion.div
                key={`${position.symbol}-${position.openedAt}-${idx}`}
                initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                transition={shouldAnimate ? { duration: 0.2, delay: idx * 0.02 } : undefined}
                className="bg-card border rounded-xl p-4 space-y-3 shadow-sm hover:shadow-md transition-all"
            >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {isOpen ? (
                            <Clock className="h-5 w-5 text-blue-500 shrink-0" />
                        ) : isProfit ? (
                            <TrendingUp className="h-5 w-5 text-green-500 shrink-0" />
                        ) : (
                            <TrendingDown className="h-5 w-5 text-red-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">{position.symbol}</h3>
                            <p className="text-xs text-muted-foreground truncate">{position.broker}</p>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            "shrink-0",
                            isOpen
                                ? "border-blue-500/50 text-blue-500 bg-blue-500/10"
                                : isProfit
                                    ? "border-green-500/50 text-green-500 bg-green-500/10"
                                    : "border-red-500/50 text-red-500 bg-red-500/10"
                        )}
                    >
                        {isOpen ? "OPEN" : "CLOSED"}
                    </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                        <p className="text-sm font-medium">{position.quantity}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
                        <p className="text-sm font-medium">${formatCurrency(position.entryPrice)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Entry Date</p>
                        <p className="text-sm font-medium">{formatDate(position.openedAt)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Exit Date</p>
                        <p className="text-sm font-medium">{position.closedAt ? formatDate(position.closedAt) : "—"}</p>
                    </div>
                </div>

                {/* P&L Section - Only for closed positions */}
                {!isOpen && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Exit Price</p>
                            <p className="text-sm font-medium">
                                {displayPrice !== null && displayPrice !== undefined ? `$${formatCurrency(displayPrice)}` : "—"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Return</p>
                            {returnPct !== null ? (
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "font-mono text-xs",
                                        isProfit
                                            ? "border-green-500/50 text-green-500 bg-green-500/10"
                                            : "border-red-500/50 text-red-500 bg-red-500/10"
                                    )}
                                >
                                    {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
                                </Badge>
                            ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                            )}
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-1">P&L</p>
                            {displayPnl !== null && displayPnl !== undefined ? (
                                <p
                                    className={cn(
                                        "text-lg font-bold",
                                        isProfit ? "text-green-500" : "text-red-500"
                                    )}
                                >
                                    {isProfit ? "+" : "-"}${formatCurrency(Math.abs(displayPnl))}
                                </p>
                            ) : (
                                <span className="text-sm text-muted-foreground">—</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {!isDemo && isOpen && position.tradeId && (
                    <div className="pt-3 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(position.tradeId!)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Position
                        </Button>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Global Filter Bar with Export */}
            <GlobalFilterBar
                onExport={() => exportToExcel(
                    sortedPositions,
                    'positions',
                    [
                        { key: 'symbol', header: 'Symbol' },
                        { key: 'status', header: 'Status' },
                        { key: 'type', header: 'Type' },
                        { key: 'broker', header: 'Broker' },
                        { key: 'quantity', header: 'Quantity' },
                        { key: 'entryPrice', header: 'Entry Price', formatter: formatCurrencyForExport },
                        { key: 'exitPrice', header: 'Exit Price', formatter: formatCurrencyForExport },
                        { key: 'pnl', header: 'P&L', formatter: formatCurrencyForExport },
                        { key: 'openedAt', header: 'Entry Date', formatter: formatDateForExport },
                        { key: 'closedAt', header: 'Exit Date', formatter: formatDateForExport },
                    ]
                )}
            />

            {/* Position Count Indicator */}
            {!loading && isFilteringPositions && (
                <div className="glass rounded-xl p-3 sm:p-4 border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-muted-foreground">
                            Showing <span className="font-semibold text-foreground">{sortedPositions.length}</span> of{" "}
                            <span className="font-semibold text-foreground">{allPositions.length}</span> positions
                            {allPositions.length - sortedPositions.length > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 ml-1">
                                    ({allPositions.length - sortedPositions.length} hidden by filters)
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            )}

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {loading && allPositions.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-primary h-6 w-6" />
                    </div>
                ) : positionsWithLiveData.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {hasActiveFilters
                            ? "No positions match your filters."
                            : isDemo
                                ? "No demo positions available."
                                : "No positions found. Connect your broker to sync data."}
                    </div>
                ) : (
                    positionsWithLiveData.map((position, idx) => (
                        <MobilePositionCard key={`${position.symbol}-${position.openedAt}-${idx}`} position={position} idx={idx} />
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border-0 px-2">
                <Table className="border-separate border-spacing-y-2">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("symbol")}>
                                <div className="flex items-center gap-2">Symbol {getSortIcon("symbol")}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("status")}>
                                <div className="flex items-center gap-2">Status {getSortIcon("status")}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("entryDate")}>
                                <div className="flex items-center gap-2">Entry Date {getSortIcon("entryDate")}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("exitDate")}>
                                <div className="flex items-center gap-2">Exit Date {getSortIcon("exitDate")}</div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("quantity")}>
                                <div className="flex items-center justify-end gap-2">Qty {getSortIcon("quantity")}</div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("entryPrice")}>
                                <div className="flex items-center justify-end gap-2">Entry {getSortIcon("entryPrice")}</div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("exitPrice")}>
                                <div className="flex items-center justify-end gap-2">Exit {getSortIcon("exitPrice")}</div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("pnl")}>
                                <div className="flex items-center justify-end gap-2">P&L {getSortIcon("pnl")}</div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("return")}>
                                <div className="flex items-center justify-end gap-2">Return {getSortIcon("return")}</div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("broker")}>
                                <div className="flex items-center gap-2">Broker {getSortIcon("broker")}</div>
                            </TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && allPositions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center h-24">
                                    <div className="flex justify-center">
                                        <Loader2 className="animate-spin text-primary h-6 w-6" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : positionsWithLiveData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                                    {hasActiveFilters
                                        ? "No positions match your filters."
                                        : isDemo
                                            ? "No demo positions available."
                                            : "No positions found. Connect your broker to sync data."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            positionsWithLiveData.map((position, idx) => {
                                const isOpen = position.status === "open";
                                // For open positions, we don't show P&L anymore as requested
                                const displayPnl = isOpen ? null : position.pnl;
                                const displayPrice = isOpen ? null : position.exitPrice;
                                const returnPct = !isOpen && displayPrice && position.entryPrice
                                    ? ((displayPrice - position.entryPrice) / position.entryPrice) * 100
                                    : null;
                                const isProfit = (displayPnl ?? 0) >= 0;

                                // Limit animations to first 10 rows for performance
                                const shouldAnimate = idx < 10;

                                return (
                                    <motion.tr
                                        key={`${position.symbol}-${position.openedAt}-${idx}`}
                                        initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
                                        animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                                        transition={shouldAnimate ? { duration: 0.2, delay: idx * 0.02 } : undefined}
                                        className="group transition-all hover:translate-y-[-2px] hover:shadow-lg bg-card/40 hover:bg-card border-0 [&_td:first-child]:rounded-l-xl [&_td:last-child]:rounded-r-xl"
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
                                            {displayPrice !== null && displayPrice !== undefined ? (
                                                <span>
                                                    ${formatCurrency(displayPrice)}
                                                </span>
                                            ) : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {displayPnl !== null && displayPnl !== undefined ? (
                                                <span
                                                    className={cn(
                                                        "font-semibold",
                                                        isProfit ? "text-green-500" : "text-red-500"
                                                    )}
                                                >
                                                    {isProfit ? "+" : "-"}${formatCurrency(Math.abs(displayPnl))}
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
                                            {!isDemo && isOpen && position.tradeId && (
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
                        Showing {sortedPositions.length} of {allPositions.length} position{allPositions.length !== 1 ? "s" : ""}
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
