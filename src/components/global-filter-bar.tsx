"use client";

import { useState } from "react";
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
import { Search, Calendar as CalendarIcon, X, Clock, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GlobalFilterBarProps {
    showActionFilter?: boolean; // enable optional Action filter for Journal
    className?: string;
    onApply?: () => void;
}

export function GlobalFilterBar({ showActionFilter = false, className, onApply }: GlobalFilterBarProps) {
    const { filters, setFilters, resetFilters, brokers } = useFilters();
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

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
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[140px] h-9 justify-start text-left font-normal",
                                !filters.startDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.startDate ? (
                                format(new Date(new Date(filters.startDate).getTime() + new Date(filters.startDate).getTimezoneOffset() * 60000), "MMM dd, yyyy")
                            ) : (
                                <span>Start Date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={filters.startDate ? new Date(new Date(filters.startDate).getTime() + new Date(filters.startDate).getTimezoneOffset() * 60000) : undefined}
                            onSelect={(date) => {
                                if (date) {
                                    // Format as YYYY-MM-DD local
                                    const offset = date.getTimezoneOffset();
                                    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                                    setFilters(prev => ({ ...prev, startDate: localDate.toISOString().split('T')[0] }));
                                } else {
                                    setFilters(prev => ({ ...prev, startDate: "" }));
                                }
                                setStartDateOpen(false);
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">-</span>

                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[140px] h-9 justify-start text-left font-normal",
                                !filters.endDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.endDate ? (
                                format(new Date(new Date(filters.endDate).getTime() + new Date(filters.endDate).getTimezoneOffset() * 60000), "MMM dd, yyyy")
                            ) : (
                                <span>End Date</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={filters.endDate ? new Date(new Date(filters.endDate).getTime() + new Date(filters.endDate).getTimezoneOffset() * 60000) : undefined}
                            onSelect={(date) => {
                                if (date) {
                                    const offset = date.getTimezoneOffset();
                                    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                                    setFilters(prev => ({ ...prev, endDate: localDate.toISOString().split('T')[0] }));
                                } else {
                                    setFilters(prev => ({ ...prev, endDate: "" }));
                                }
                                setEndDateOpen(false);
                            }}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
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
