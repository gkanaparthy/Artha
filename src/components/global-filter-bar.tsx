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
import { Search, Calendar as CalendarIcon, X, Filter } from "lucide-react";
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
    const [mobileFiltersExpanded, setMobileFiltersExpanded] = useState(false);

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
        <div className={cn("glass rounded-xl", className)}>
            {/* Mobile View */}
            <div className="md:hidden">
                {/* Always Visible: Symbol Search + Filter Toggle */}
                <div className="flex items-center gap-2 p-3">
                    <div className="flex items-center gap-2 flex-1">
                        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                            placeholder="Filter by symbol..."
                            value={filters.symbol}
                            onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
                            className="h-9"
                            aria-label="Filter trades by symbol"
                        />
                    </div>
                    <Button
                        variant={mobileFiltersExpanded ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMobileFiltersExpanded(!mobileFiltersExpanded)}
                        className="h-9 px-3 shrink-0"
                    >
                        <Filter className="h-4 w-4" />
                        {hasActiveFilters && !mobileFiltersExpanded && (
                            <span className="ml-1.5 flex h-2 w-2">
                                <span className="absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                            </span>
                        )}
                    </Button>
                </div>

                {/* Expandable Filters */}
                {mobileFiltersExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t pt-3">
                        {/* Account Filter */}
                        {accounts.length > 0 && (
                            <Select
                                value={filters.accountId}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, accountId: value }))}
                            >
                                <SelectTrigger className="w-full h-9">
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
                            <SelectTrigger className="w-full h-9">
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
                                            "flex-1 h-9 justify-start text-left font-normal text-xs sm:text-sm",
                                            !filters.startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
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

                            <span className="text-muted-foreground text-sm">-</span>

                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "flex-1 h-9 justify-start text-left font-normal text-xs sm:text-sm",
                                            !filters.endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
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
                                <SelectTrigger className="w-full h-9">
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

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                            {onExport && (
                                <Button variant="outline" size="sm" onClick={onExport} className="flex-1 h-9 text-xs">
                                    {exportLabel}
                                </Button>
                            )}
                            {hasActiveFilters && (
                                <Button size="sm" variant="ghost" onClick={handleClearFilters} className="flex-1 h-9 text-xs">
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View - Original Layout */}
            <div className="hidden md:flex flex-wrap items-center gap-3 p-4">
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
        </div>
    );
}
