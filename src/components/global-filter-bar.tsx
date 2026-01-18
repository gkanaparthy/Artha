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
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface GlobalFilterBarProps {
    showStatusFilter?: boolean;
    className?: string;
    onExport?: () => void;
    exportLabel?: string;
}

export function GlobalFilterBar({ showStatusFilter = true, className, onExport, exportLabel = "Export" }: GlobalFilterBarProps) {
    const { filters, setFilters, resetFilters, accounts } = useFilters();
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

    const handleClearFilters = () => {
        resetFilters();
    };

    const hasActiveFilters =
        filters.symbol ||
        filters.startDate ||
        filters.endDate ||
        filters.status !== "all" ||
        filters.accountId !== "all" ||
        filters.assetType !== "all";

    return (
        <div className={cn("flex flex-wrap items-center gap-3 p-4 glass rounded-xl", className)}>
            {/* Symbol Search */}
            <div className="flex items-center gap-2 min-w-[180px] flex-1 max-w-[250px]">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                    placeholder="Filter by symbol..."
                    value={filters.symbol}
                    onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
                    className="h-9"
                    aria-label="Filter trades by symbol"
                />
            </div>

            {/* Account Filter */}
            {accounts.length > 0 && (
                <Select
                    value={filters.accountId}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, accountId: value }))}
                >
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                                {account.brokerName || "Unknown"} ({account.accountNumber ? `****${account.accountNumber.slice(-4)}` : account.snapTradeAccountId.slice(-4)})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Asset Type Filter */}
            <Select
                value={filters.assetType}
                onValueChange={(value: "all" | "STOCK" | "OPTION") =>
                    setFilters(prev => ({ ...prev, assetType: value }))
                }
            >
                <SelectTrigger className="w-[110px] h-9">
                    <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="STOCK">Stocks</SelectItem>
                    <SelectItem value="OPTION">Options</SelectItem>
                </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-[130px] h-9 justify-start text-left font-normal",
                                !filters.startDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.startDate ? (
                                format(new Date(new Date(filters.startDate).getTime() + new Date(filters.startDate).getTimezoneOffset() * 60000), "MMM dd, yy")
                            ) : (
                                <span>From</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={filters.startDate ? new Date(new Date(filters.startDate).getTime() + new Date(filters.startDate).getTimezoneOffset() * 60000) : undefined}
                            onSelect={(date) => {
                                if (date) {
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
                                "w-[130px] h-9 justify-start text-left font-normal",
                                !filters.endDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.endDate ? (
                                format(new Date(new Date(filters.endDate).getTime() + new Date(filters.endDate).getTimezoneOffset() * 60000), "MMM dd, yy")
                            ) : (
                                <span>To</span>
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

            {/* Status Filter (Optional) */}
            {showStatusFilter && (
                <Select
                    value={filters.status}
                    onValueChange={(value: "all" | "open" | "winners" | "losers") =>
                        setFilters(prev => ({ ...prev, status: value }))
                    }
                >
                    <SelectTrigger className="w-[120px] h-9">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="winners">Winners</SelectItem>
                        <SelectItem value="losers">Losers</SelectItem>
                    </SelectContent>
                </Select>
            )}

            <div className="flex-1" />

            {/* Export Button */}
            {onExport && (
                <Button variant="outline" size="sm" onClick={onExport} className="h-9">
                    {exportLabel}
                </Button>
            )}

            {/* Clear Button */}
            {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                </Button>
            )}
        </div>
    );
}
