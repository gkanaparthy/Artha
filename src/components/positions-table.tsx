"use client";

import { useCallback, useEffect, useMemo } from "react";
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
import { Loader2, Clock, TrendingUp, TrendingDown, Trash2, AlertTriangle } from "lucide-react";
import { cn, formatCurrency, formatDate, formatRMultiple } from "@/lib/utils";
import { motion } from "framer-motion";
import { useFilters } from "@/contexts/filter-context";
import { useSort } from "@/hooks/use-sort";
import type { DisplayPosition, Metrics } from "@/types/trading";
import { InlineRiskInput } from "@/components/inline-risk-input";

interface LivePosition {
    symbol: string;
    universalSymbolId?: string | null;
    units: number;
    price: number | null;
    averageCost: number | null;
    openPnl: number | null;
    marketValue: number | null;
    type: 'STOCK' | 'OPTION';
    accountId: string;
    brokerName: string;
    optionType?: string | null;
    strikePrice?: number | null;
    expirationDate?: string | null;
}

interface EnrichedLivePosition {
    livePrice: number | null;
    unrealizedPnl: number | null;
    marketValue: number | null;
    units: number;
}

interface PositionsTableProps {
    onMetricsUpdate?: (metrics: Metrics) => void;
    onOpenUnrealizedChange?: (totalUnrealizedPnl: number | null) => void;
    onRiskSaved?: () => void;
    initialPositions?: DisplayPosition[];
    isDemo?: boolean;
    livePositions?: LivePosition[];
    positions?: DisplayPosition[];
    loading?: boolean;
}

type SortField = "symbol" | "status" | "entryDate" | "exitDate" | "quantity" | "entryPrice" | "exitPrice" | "pnl" | "rMultiple" | "return" | "broker";

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

const normalizeOptionType = (optionType?: string | null) => (optionType || '').trim().toUpperCase();

const normalizeStrike = (strikePrice?: number | null) => {
    if (strikePrice === null || strikePrice === undefined || Number.isNaN(Number(strikePrice))) return '';
    return Number(strikePrice).toFixed(4);
};

const normalizeExpiry = (expiryDate?: string | null) => {
    if (!expiryDate) return '';
    const parsed = new Date(expiryDate);
    if (Number.isNaN(parsed.getTime())) return String(expiryDate).slice(0, 10);
    return parsed.toISOString().slice(0, 10);
};

const getInstrumentKeyPart = (params: {
    symbol: string;
    universalSymbolId?: string | null;
    type?: string;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: string | null;
}) => {
    if (params.universalSymbolId) {
        return `uid:${params.universalSymbolId}`;
    }

    if ((params.type || '').toUpperCase() === 'OPTION') {
        return `opt:${normalizeSymbol(params.symbol)}:${normalizeOptionType(params.optionType)}:${normalizeStrike(params.strikePrice)}:${normalizeExpiry(params.expiryDate)}`;
    }

    return `sym:${normalizeSymbol(params.symbol)}:${(params.type || '').toUpperCase()}`;
};

const getLivePositionKey = (params: {
    accountId: string;
    symbol: string;
    universalSymbolId?: string | null;
    type?: string;
    optionType?: string | null;
    strikePrice?: number | null;
    expiryDate?: string | null;
}) => `${params.accountId}::${getInstrumentKeyPart(params)}`;

const addNullable = (a: number | null, b: number | null): number | null => {
    if (a === null && b === null) return null;
    return (a ?? 0) + (b ?? 0);
};

const mergeLivePosition = (
    map: Map<string, EnrichedLivePosition>,
    key: string,
    position: LivePosition
) => {
    const existing = map.get(key);

    if (!existing) {
        map.set(key, {
            livePrice: position.price,
            unrealizedPnl: position.openPnl,
            marketValue: position.marketValue,
            units: position.units,
        });
        return;
    }

    const existingWeight = Math.abs(existing.units);
    const nextWeight = Math.abs(position.units);
    const totalWeight = existingWeight + nextWeight;
    const weightedPrice = existing.livePrice !== null && position.price !== null && totalWeight > 0
        ? ((existing.livePrice * existingWeight) + (position.price * nextWeight)) / totalWeight
        : null;

    map.set(key, {
        livePrice: weightedPrice ?? position.price ?? existing.livePrice,
        unrealizedPnl: addNullable(existing.unrealizedPnl, position.openPnl),
        marketValue: addNullable(existing.marketValue, position.marketValue),
        units: existing.units + position.units,
    });
};

// Get sort value for a position based on field
const getSortValue = (p: DisplayPosition, field: SortField): string | number => {
    const comparePrice = p.status === 'open' ? p.livePrice : p.exitPrice;
    const isShort = p.side === 'short';
    switch (field) {
        case "symbol": return p.symbol;
        case "status": return p.status;
        case "entryDate": return new Date(p.openedAt).getTime();
        case "exitDate": return p.closedAt ? new Date(p.closedAt).getTime() : 0;
        case "quantity": return p.quantity;
        case "entryPrice": return p.entryPrice;
        case "exitPrice": return comparePrice ?? 0;
        case "pnl": return p.status === 'open' ? (p.unrealizedPnl ?? 0) : (p.pnl ?? 0);
        case "rMultiple": return p.status === 'closed' ? (p.rMultiple ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY;
        case "return":
            return comparePrice !== null && comparePrice !== undefined && p.entryPrice
                ? (isShort
                    ? (p.entryPrice - comparePrice) / p.entryPrice
                    : (comparePrice - p.entryPrice) / p.entryPrice)
                : 0;
        case "broker": return p.broker;
        default: return 0;
    }
};

export function PositionsTable({
    onMetricsUpdate,
    onOpenUnrealizedChange,
    onRiskSaved,
    initialPositions = [],
    isDemo = false,
    livePositions,
    positions: externalPositions,
    loading: externalLoading
}: PositionsTableProps) {
    const { filters } = useFilters();
    // Use external positions if provided, otherwise fallback to local/initial
    const allPositions = externalPositions || initialPositions;
    const loading = externalLoading ?? false;

    // Aggregate live positions by account/symbol/type so open rows can display current price + unrealized P&L.
    const livePositionMap = useMemo(() => {
        const map = new Map<string, EnrichedLivePosition>();

        for (const position of livePositions || []) {
            const keys = new Set<string>([
                // Most specific key (UID if available)
                getLivePositionKey({
                    accountId: position.accountId,
                    symbol: position.symbol,
                    universalSymbolId: position.universalSymbolId,
                    type: position.type,
                    optionType: position.optionType,
                    strikePrice: position.strikePrice,
                    expiryDate: position.expirationDate,
                }),
                // Symbol-based fallback key for rows without universalSymbolId
                getLivePositionKey({
                    accountId: position.accountId,
                    symbol: position.symbol,
                    type: position.type,
                    optionType: position.optionType,
                    strikePrice: position.strikePrice,
                    expiryDate: position.expirationDate,
                }),
            ]);

            for (const key of keys) {
                mergeLivePosition(map, key, position);
            }
        }

        return map;
    }, [livePositions]);

    // The API now handles all filtering (status, tags, etc.)
    // We no longer need client-side filtering here
    const filteredPositions = allPositions;

    // Handle metrics update if needed
    useEffect(() => {
        if (onMetricsUpdate && !isDemo) {
            const closed = filteredPositions.filter((p: DisplayPosition) => p.status === "closed");
            const wins = closed.filter((p: DisplayPosition) => (p.pnl ?? 0) > 0);
            const losses = closed.filter((p: DisplayPosition) => (p.pnl ?? 0) < 0);
            const netPnL = closed.reduce((sum: number, p: DisplayPosition) => sum + (p.pnl ?? 0), 0);

            onMetricsUpdate({
                netPnL,
                totalTrades: closed.length,
                winningTrades: wins.length,
                losingTrades: losses.length,
                winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
                avgWin: wins.length > 0 ? wins.reduce((sum: number, p: DisplayPosition) => sum + (p.pnl ?? 0), 0) / wins.length : 0,
                avgLoss: losses.length > 0 ? Math.abs(losses.reduce((sum: number, p: DisplayPosition) => sum + (p.pnl ?? 0), 0) / losses.length) : 0,
                profitFactor: losses.length > 0 ? wins.reduce((sum: number, p: DisplayPosition) => sum + (p.pnl ?? 0), 0) / Math.abs(losses.reduce((sum: number, p: DisplayPosition) => sum + (p.pnl ?? 0), 0)) : 1,
                largestWin: wins.length > 0 ? Math.max(...wins.map((p: DisplayPosition) => p.pnl ?? 0)) : 0,
                largestLoss: losses.length > 0 ? Math.min(...losses.map((p: DisplayPosition) => p.pnl ?? 0)) : 0,
                avgTrade: closed.length > 0 ? netPnL / closed.length : 0,
                avgWinPct: 0, // Simplified
                avgLossPct: 0,
                monthlyData: [],
                symbolData: [],
                cumulativePnL: [],
                openPositionsCount: allPositions.filter((p: DisplayPosition) => p.status === "open").length,
                closedTrades: []
            });
        }
    }, [filteredPositions, onMetricsUpdate, isDemo, allPositions]);

    const getLiveForPosition = useCallback((position: DisplayPosition): { key: string; live: EnrichedLivePosition } | null => {
        if (position.status !== "open") return null;

        const candidateKeys = [
            getLivePositionKey({
                accountId: position.accountId,
                symbol: position.symbol,
                universalSymbolId: position.universalSymbolId,
                type: position.type,
                optionType: position.optionType,
                strikePrice: position.strikePrice,
                expiryDate: position.expiryDate,
            }),
            getLivePositionKey({
                accountId: position.accountId,
                symbol: position.symbol,
                type: position.type,
                optionType: position.optionType,
                strikePrice: position.strikePrice,
                expiryDate: position.expiryDate,
            }),
            getLivePositionKey({
                accountId: position.accountId,
                symbol: position.symbol,
                type: 'STOCK',
            }),
            getLivePositionKey({
                accountId: position.accountId,
                symbol: position.symbol,
                type: 'OPTION',
                optionType: position.optionType,
                strikePrice: position.strikePrice,
                expiryDate: position.expiryDate,
            }),
        ];

        for (const key of candidateKeys) {
            const matched = livePositionMap.get(key);
            if (matched) return { key, live: matched };
        }

        return null;
    }, [livePositionMap]);

    // Enrich open positions with live market data.
    // Prefer row-level unrealized from live price + lot entry to keep split lots accurate.
    // Fall back to proportional allocation only when live price is unavailable.
    const positionsWithLiveData = useMemo(() => {
        const matches = filteredPositions.map((position) => getLiveForPosition(position));
        const groupTotals = new Map<string, { totalAbsQty: number; rows: number }>();

        matches.forEach((match, idx) => {
            if (!match) return;
            const position = filteredPositions[idx];
            const existing = groupTotals.get(match.key) || { totalAbsQty: 0, rows: 0 };
            existing.totalAbsQty += Math.abs(position.quantity || 0);
            existing.rows += 1;
            groupTotals.set(match.key, existing);
        });

        return filteredPositions.map((position, idx) => {
            const match = matches[idx];
            if (!match) return position;

            const livePrice = match.live.livePrice;
            const absQty = Math.abs(position.quantity || 0);
            const inferredMultiplier = (
                livePrice !== null &&
                livePrice !== undefined &&
                livePrice !== 0 &&
                match.live.marketValue !== null &&
                match.live.marketValue !== undefined &&
                match.live.units !== 0
            )
                ? Math.abs(match.live.marketValue) / (Math.abs(livePrice) * Math.abs(match.live.units))
                : null;
            const multiplier = position.contractMultiplier
                ?? inferredMultiplier
                ?? (position.type === 'OPTION' ? 100 : 1);

            let rowUnrealized: number | null = null;
            let rowMarketValue: number | null = null;

            if (livePrice !== null && livePrice !== undefined) {
                const isShort = position.side === 'short' || (position.side !== 'long' && position.quantity < 0);
                const priceDiff = isShort
                    ? position.entryPrice - livePrice
                    : livePrice - position.entryPrice;

                rowUnrealized = priceDiff * absQty * multiplier;
                rowMarketValue = livePrice * absQty * multiplier;
            } else {
                const total = groupTotals.get(match.key);
                if (total) {
                    const weight = total.totalAbsQty > 0
                        ? absQty / total.totalAbsQty
                        : 1 / Math.max(total.rows, 1);

                    rowUnrealized = match.live.unrealizedPnl === null
                        ? null
                        : match.live.unrealizedPnl * weight;
                    rowMarketValue = match.live.marketValue === null
                        ? null
                        : match.live.marketValue * weight;
                }
            }

            return {
                ...position,
                livePrice,
                unrealizedPnl: rowUnrealized,
                marketValue: rowMarketValue,
            };
        });
    }, [filteredPositions, getLiveForPosition]);

    useEffect(() => {
        if (!onOpenUnrealizedChange) return;

        const openPositions = positionsWithLiveData.filter((p) => p.status === 'open');
        if (openPositions.length === 0) {
            onOpenUnrealizedChange(0);
            return;
        }

        let total = 0;
        let hasValue = false;

        for (const position of openPositions) {
            if (position.unrealizedPnl !== null && position.unrealizedPnl !== undefined) {
                total += position.unrealizedPnl;
                hasValue = true;
            }
        }

        onOpenUnrealizedChange(hasValue ? Math.round(total * 100) / 100 : null);
    }, [positionsWithLiveData, onOpenUnrealizedChange]);

    const { sortedData: sortedPositions, handleSort, getSortIcon } = useSort<DisplayPosition, SortField>({
        data: positionsWithLiveData,
        defaultField: "entryDate",
        defaultDirection: "desc",
        getValueForField: getSortValue,
    });

    // Handle Delete (disabled in demo mode)
    const handleDelete = async (tradeId: string) => {
        if (isDemo) return;
        if (!confirm("Are you sure you want to delete this position? This will delete the underlying trade.")) return;

        try {
            const res = await fetch(`/api/trades?id=${tradeId}`, { method: "DELETE" });
            if (!res.ok) {
                alert("Failed to delete position");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting position");
        }
    };

    const hasActiveFilters = filters.symbol || filters.startDate || filters.endDate ||
        filters.status !== "all" || filters.action !== "ALL" || (filters.accountId && filters.accountId.length > 0) || filters.assetType !== "all";

    const openCount = allPositions.filter(p => p.status === "open").length;
    const closedCount = allPositions.filter(p => p.status === "closed").length;
    const riskEligibleClosedCount = sortedPositions.filter(
        (p) => p.status === "closed" && Boolean(p.positionKey)
    ).length;
    const missingRiskCount = sortedPositions.filter(
        (p) =>
            p.status === "closed" &&
            Boolean(p.positionKey) &&
            (p.rMultiple === null || p.rMultiple === undefined || !Number.isFinite(p.rMultiple))
    ).length;

    // Mobile Card Component
    const MobilePositionCard = ({ position, idx }: { position: DisplayPosition; idx: number }) => {
        const isOpen = position.status === "open";
        const displayPnl = isOpen ? (position.unrealizedPnl ?? null) : position.pnl;
        const displayPrice = isOpen ? (position.livePrice ?? null) : position.exitPrice;
        const isShort = position.side === "short";
        const returnPct = displayPrice !== null && displayPrice !== undefined && position.entryPrice
            ? (isShort
                ? ((position.entryPrice - displayPrice) / position.entryPrice) * 100
                : ((displayPrice - position.entryPrice) / position.entryPrice) * 100)
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
                            <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
                        ) : (
                            <TrendingDown className="h-5 w-5 text-rose-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">{position.symbol}</h3>
                            <p className="text-xs text-muted-foreground truncate">{position.broker}</p>
                            {position.futuresMultiplierWarning && (
                                <p
                                    className="text-[10px] text-amber-600 mt-1 line-clamp-2"
                                    title={position.futuresMultiplierWarning}
                                >
                                    {position.futuresMultiplierWarning}
                                </p>
                            )}
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn(
                            "shrink-0",
                            isOpen
                                ? "border-blue-500/50 text-blue-500 bg-blue-500/10"
                                : isProfit
                                    ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
                                    : "border-rose-500/50 text-rose-500 bg-rose-500/10"
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

                {/* Price / Return / P&L */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">{isOpen ? "Now Price" : "Exit Price"}</p>
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
                                        ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
                                        : "border-rose-500/50 text-rose-500 bg-rose-500/10"
                                )}
                            >
                                {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
                            </Badge>
                        ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">R Multiple</p>
                        <InlineRiskInput position={position} isDemo={isDemo} onRiskSaved={onRiskSaved} />
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">{isOpen ? "Unrealized P&L" : "P&L"}</p>
                        {displayPnl !== null && displayPnl !== undefined ? (
                            <p
                                className={cn(
                                    "text-lg font-bold",
                                    isProfit ? "text-emerald-500" : "text-rose-500"
                                )}
                            >
                                {isProfit ? "+" : "-"}${formatCurrency(Math.abs(displayPnl))}
                            </p>
                        ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                        )}
                    </div>
                </div>

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
                            Delete
                        </Button>
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Filter indicator removed - all filtering is server-side now */}
            {!isDemo && riskEligibleClosedCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4" />
                        <span>
                            Set 1R risk per closed position to unlock accurate R-multiples.
                            Click the <span className="font-medium">pencil icon</span> in the R column.
                        </span>
                    </div>
                    <span className="text-xs text-amber-700/90 dark:text-amber-300/90">
                        {missingRiskCount}/{riskEligibleClosedCount} need risk
                    </span>
                </div>
            )}

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {loading && allPositions.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-primary h-6 w-6" />
                    </div>
                ) : sortedPositions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {hasActiveFilters
                            ? "No positions match your filters."
                            : isDemo
                                ? "No demo positions available."
                                : "No positions found. Connect your broker to sync data."}
                    </div>
                ) : (
                    sortedPositions.map((position, idx) => (
                        <MobilePositionCard key={`${position.symbol}-${position.openedAt}-${idx}`} position={position} idx={idx} />
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-xl border-0 px-1">
                <Table className="border-separate border-spacing-y-2">
                    <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-md z-10 shadow-sm">
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
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("rMultiple")}>
                                <div className="flex items-center justify-end gap-2">R {getSortIcon("rMultiple")}</div>
                            </TableHead>
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("return")}>
                                <div className="flex items-center justify-end gap-2">Return {getSortIcon("return")}</div>
                            </TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort("broker")}>
                                <div className="flex items-center gap-2">Broker {getSortIcon("broker")}</div>
                            </TableHead>
                            <TableHead className="text-right w-[140px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && allPositions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center h-24">
                                    <div className="flex justify-center">
                                        <Loader2 className="animate-spin text-primary h-6 w-6" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : sortedPositions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={13} className="text-center h-24 text-muted-foreground">
                                    {hasActiveFilters
                                        ? "No positions match your filters."
                                        : isDemo
                                            ? "No demo positions available."
                                            : "No positions found. Connect your broker to sync data."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedPositions.map((position, idx) => {
                                const isOpen = position.status === "open";
                                const displayPnl = isOpen ? (position.unrealizedPnl ?? null) : position.pnl;
                                const displayPrice = isOpen ? (position.livePrice ?? null) : position.exitPrice;
                                const isShort = position.side === "short";
                                const returnPct = displayPrice !== null && displayPrice !== undefined && position.entryPrice
                                    ? (isShort
                                        ? ((position.entryPrice - displayPrice) / position.entryPrice) * 100
                                        : ((displayPrice - position.entryPrice) / position.entryPrice) * 100)
                                    : null;
                                const isProfit = (displayPnl ?? 0) >= 0;

                                const shouldAnimate = idx < 10;

                                return (
                                    <motion.tr
                                        key={`${position.symbol}-${position.openedAt}-${idx}`}
                                        initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
                                        animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                                        transition={shouldAnimate ? { duration: 0.2, delay: idx * 0.02 } : undefined}
                                        className="group transition-all hover:translate-y-[-2px] hover:shadow-lg bg-card/40 hover:bg-card border-0 [&_td:first-child]:rounded-l-xl [&_td:last-child]:rounded-r-xl even:bg-muted/30"
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {isOpen ? (
                                                    <Clock className="h-4 w-4 text-blue-500" />
                                                ) : isProfit ? (
                                                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                                                ) : (
                                                    <TrendingDown className="h-4 w-4 text-rose-500" />
                                                )}
                                                <span>{position.symbol}</span>
                                                {position.futuresMultiplierWarning && (
                                                    <span title={position.futuresMultiplierWarning}>
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    isOpen
                                                        ? "border-blue-500/50 text-blue-500 bg-blue-500/10"
                                                        : isProfit
                                                            ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
                                                            : "border-rose-500/50 text-rose-500 bg-rose-500/10"
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
                                        <TableCell className="text-right tabular-nums">{position.quantity}</TableCell>
                                        <TableCell className="text-right tabular-nums">${formatCurrency(position.entryPrice)}</TableCell>
                                        <TableCell className="text-right">
                                            {displayPrice !== null && displayPrice !== undefined ? (
                                                <span>
                                                    ${formatCurrency(displayPrice)}
                                                    {isOpen && (
                                                        <span className="ml-1 text-[10px] text-muted-foreground">live</span>
                                                    )}
                                                </span>
                                            ) : "—"}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums">
                                            {displayPnl !== null && displayPnl !== undefined ? (
                                                <span
                                                    className={cn(
                                                        "font-semibold",
                                                        isProfit ? "text-emerald-500" : "text-rose-500"
                                                    )}
                                                >
                                                    {isProfit ? "+" : "-"}${formatCurrency(Math.abs(displayPnl))}
                                                    {isOpen && (
                                                        <span className="ml-1 text-[10px] text-muted-foreground">unrealized</span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <InlineRiskInput position={position} isDemo={isDemo} onRiskSaved={onRiskSaved} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {returnPct !== null ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "font-mono",
                                                        isProfit
                                                            ? "border-emerald-500/50 text-emerald-500 bg-emerald-500/10"
                                                            : "border-rose-500/50 text-rose-500 bg-rose-500/10"
                                                    )}
                                                >
                                                    {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1 flex-wrap max-w-[100px]">
                                                {position.tags && position.tags.map(tag => (
                                                    <div
                                                        key={tag.id}
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: tag.color }}
                                                        title={tag.name}
                                                    />
                                                ))}
                                                {(!position.tags || position.tags.length === 0) && (
                                                    <span className="text-[10px] text-muted-foreground opacity-30">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {position.broker}
                                        </TableCell>
                                        <TableCell>
                                            {!isDemo && isOpen && position.tradeId && (
                                                <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(position.tradeId!)}
                                                        className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        <span className="hidden sm:inline">Delete</span>
                                                    </Button>
                                                </div>
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
                    <div className="text-right">
                        <span>
                            Closed P&L:{" "}
                            <span
                                className={cn(
                                    "font-semibold",
                                    filteredPositions.filter(p => p.status === "closed").reduce((sum, p) => sum + (p.pnl ?? 0), 0) >= 0
                                        ? "text-emerald-500"
                                        : "text-rose-500"
                                )}
                            >
                                ${formatCurrency(filteredPositions.filter(p => p.status === "closed").reduce((sum, p) => sum + (p.pnl ?? 0), 0))}
                            </span>
                        </span>
                        <div className="text-xs mt-0.5">
                            Net R:{" "}
                            <span className="font-semibold">
                                {(() => {
                                    const rTrades = filteredPositions.filter(
                                        (p) => p.status === "closed" && p.rMultiple !== null && p.rMultiple !== undefined
                                    );
                                    const netR = rTrades.reduce((sum, p) => sum + (p.rMultiple || 0), 0);
                                    return rTrades.length > 0 ? formatRMultiple(netR) : "—";
                                })()}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
