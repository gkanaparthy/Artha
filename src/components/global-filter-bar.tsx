"use client";

import { useFilters } from "@/contexts/filter-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Calendar, X, Clock, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalFilterBarProps {
    showActionFilter?: boolean; // enable optional Action filter for Journal
    className?: string;
    onApply?: () => void;
}

export function GlobalFilterBar({ showActionFilter = false, className, onApply }: GlobalFilterBarProps) {
    const { filters, setFilters, resetFilters, brokers } = useFilters();

    const handleClearFilters = () => {
        resetFilters();
        if (onApply) setTimeout(onApply, 0);
    };

    // Helper to trigger apply if parent wants it (e.g. force refetch)
    // But generally filters update context, and parents listen to context.
    // We'll keep 'Apply' button to be explicit if needed, or remove it if instant.
    // Dashboard had "Apply". 

    const hasActiveFilters =
        filters.symbol ||
        filters.startDate ||
        filters.endDate ||
        filters.status !== "all" ||
        filters.broker !== "all" ||
        (showActionFilter && filters.action !== "ALL");

    return (
        <div className={cn("flex flex-wrap gap-3 p-4 bg-muted/30 rounded-xl border border-border/50", className)}>
            {/* Symbol Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search symbol..."
                    value={filters.symbol}
                    onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
                    className="h-9"
                />
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="h-9 w-[130px]"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="h-9 w-[130px]"
                />
            </div>

            {/* Status Filter */}
            <Select
                value={filters.status}
                onValueChange={(value: "all" | "open" | "winners" | "losers") =>
                    setFilters(prev => ({ ...prev, status: value }))
                }
            >
                <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-500" />
                            Open
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

            {/* Optional Action Filter */}
            {showActionFilter && (
                <Select
                    value={filters.action}
                    onValueChange={(value: "ALL" | "BUY" | "SELL") =>
                        setFilters(prev => ({ ...prev, action: value }))
                    }
                >
                    <SelectTrigger className="w-[130px] h-9">
                        <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Actions</SelectItem>
                        <SelectItem value="BUY">Buy</SelectItem>
                        <SelectItem value="SELL">Sell</SelectItem>
                    </SelectContent>
                </Select>
            )}

            {/* Broker Filter */}
            {brokers.length > 0 && (
                <Select
                    value={filters.broker}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, broker: value }))}
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

            {/* Actions */}
            <div className="flex items-center gap-2">
                {onApply && (
                    <Button size="sm" onClick={onApply}>
                        Apply
                    </Button>
                )}
                {hasActiveFilters && (
                    <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                        <X className="h-4 w-4 mr-1" />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
}
