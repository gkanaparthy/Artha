"use client";

import { useState } from "react";
import { useFilters } from "@/contexts/filter-context";
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
import { Search, Calendar as CalendarIcon, X, Filter, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

    // Get active filter labels for display
    const getActiveFilterLabels = () => {
        const labels: Array<{ key: string; label: string; onRemove: () => void }> = [];

        if (filters.symbol) {
            labels.push({
                key: 'symbol',
                label: `Symbol: ${filters.symbol}`,
                onRemove: () => setFilters(prev => ({ ...prev, symbol: '' }))
            });
        }

        if (filters.startDate) {
            labels.push({
                key: 'startDate',
                label: `From: ${format(new Date(filters.startDate), "MMM dd, yyyy")}`,
                onRemove: () => setFilters(prev => ({ ...prev, startDate: '' }))
            });
        }

        if (filters.endDate) {
            labels.push({
                key: 'endDate',
                label: `To: ${format(new Date(filters.endDate), "MMM dd, yyyy")}`,
                onRemove: () => setFilters(prev => ({ ...prev, endDate: '' }))
            });
        }

        if (filters.accountId && filters.accountId !== 'all') {
            const account = accounts.find(a => a.id === filters.accountId);
            const accountLabel = account ? `${account.brokerName}` : 'Account';
            labels.push({
                key: 'accountId',
                label: `Account: ${accountLabel}`,
                onRemove: () => setFilters(prev => ({ ...prev, accountId: 'all' }))
            });
        }

        if (filters.assetType && filters.assetType !== 'all') {
            labels.push({
                key: 'assetType',
                label: `Type: ${filters.assetType === 'STOCK' ? 'Stocks' : 'Options'}`,
                onRemove: () => setFilters(prev => ({ ...prev, assetType: 'all' }))
            });
        }

        if (filters.status && filters.status !== 'all') {
            const statusLabel = filters.status.charAt(0).toUpperCase() + filters.status.slice(1);
            labels.push({
                key: 'status',
                label: `Status: ${statusLabel}`,
                onRemove: () => setFilters(prev => ({ ...prev, status: 'all' }))
            });
        }

        return labels;
    };

    const activeFilterLabels = getActiveFilterLabels();
    const activeFilterCount = activeFilterLabels.length;

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

                        {/* Date Range - Native inputs for mobile */}
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={filters.startDate || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm touch-manipulation"
                                    placeholder="From date"
                                />
                            </div>

                            <span className="text-muted-foreground text-sm">-</span>

                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={filters.endDate || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm touch-manipulation"
                                    placeholder="To date"
                                />
                            </div>
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
                                    "w-[130px] h-10 justify-start text-left font-normal touch-manipulation",
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
                        <PopoverContent className="w-auto p-0 z-[100]" align="center" sideOffset={5}>
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
                                    "w-[130px] h-10 justify-start text-left font-normal touch-manipulation",
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
                        <PopoverContent className="w-auto p-0 z-[100]" align="center" sideOffset={5}>
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
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleClearFilters}
                        className="h-9"
                    >
                        <X className="h-4 w-4 mr-1" />
                        Clear All Filters
                    </Button>
                )}
            </div>

            {/* Active Filters Indicator */}
            {hasActiveFilters && (
                <div className="border-t border-border/50 bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="font-medium text-muted-foreground">
                                {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
                            </span>
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClearFilters}
                            className="h-7 text-xs hidden md:flex"
                        >
                            <X className="h-3 w-3 mr-1" />
                            Clear all
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {activeFilterLabels.map((filter) => (
                            <Badge
                                key={filter.key}
                                variant="secondary"
                                className="pr-1 gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                            >
                                <span className="text-xs">{filter.label}</span>
                                <button
                                    onClick={filter.onRemove}
                                    className="ml-1 rounded-sm hover:bg-amber-500/30 p-0.5 transition-colors"
                                    aria-label={`Remove ${filter.label} filter`}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
