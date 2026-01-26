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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface GlobalFilterBarProps {
    showStatusFilter?: boolean;
    className?: string;
    onExport?: () => void;
    exportLabel?: string;
}

export function GlobalFilterBar({ showStatusFilter = true, className, onExport, exportLabel = "Export" }: GlobalFilterBarProps) {
    const { filters, setFilters, resetFilters, accounts } = useFilters();
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
                label: `From: ${format(new Date(filters.startDate + 'T00:00:00'), "MMM dd, yyyy")}`,
                onRemove: () => setFilters(prev => ({ ...prev, startDate: '' }))
            });
        }

        if (filters.endDate) {
            labels.push({
                key: 'endDate',
                label: `To: ${format(new Date(filters.endDate + 'T00:00:00'), "MMM dd, yyyy")}`,
                onRemove: () => setFilters(prev => ({ ...prev, endDate: '' }))
            });
        }

        if (filters.accountId && filters.accountId !== 'all') {
            const account = accounts.find(a => a.id === filters.accountId);
            const last4 = account ? (account.accountNumber ? account.accountNumber.slice(-4) : account.snapTradeAccountId.slice(-4)) : '';
            const accountLabel = account ? `${account.brokerName} (${last4})` : 'Account';
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

                        {/* Date Range - Unified Picker for mobile */}
                        <DateRangePicker
                            className="w-full"
                            from={filters.startDate ? new Date(filters.startDate + 'T00:00:00') : undefined}
                            to={filters.endDate ? new Date(filters.endDate + 'T00:00:00') : undefined}
                            onSelect={(range) => {
                                setFilters(prev => ({
                                    ...prev,
                                    startDate: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                                    endDate: range?.to ? format(range.to, "yyyy-MM-dd") : ""
                                }));
                            }}
                        />

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

            {/* Desktop View - Compact One-Line Layout */}
            <div className="hidden md:flex items-center gap-2 p-2 px-3 overflow-x-auto no-scrollbar">
                {/* Symbol Search */}
                <div className="flex items-center gap-2 min-w-[140px] flex-1 max-w-[200px] relative">
                    <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search Symbol"
                        value={filters.symbol}
                        onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
                        className="h-8 pl-8 text-xs bg-background/50 border-border/50 focus:bg-background"
                        aria-label="Filter trades by symbol"
                    />
                </div>

                {/* Account Filter */}
                {accounts.length > 0 && (
                    <Select
                        value={filters.accountId}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, accountId: value }))}
                    >
                        <SelectTrigger className="w-[140px] h-8 text-xs bg-background/50 border-border/50">
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map((account) => {
                                const last4 = account.accountNumber
                                    ? account.accountNumber.slice(-4)
                                    : account.snapTradeAccountId.slice(-4);
                                return (
                                    <SelectItem key={account.id} value={account.id} className="text-xs">
                                        {account.brokerName || "Unknown"} ({last4})
                                    </SelectItem>
                                );
                            })}
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
                    <SelectTrigger className="w-[100px] h-8 text-xs bg-background/50 border-border/50">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">All Types</SelectItem>
                        <SelectItem value="STOCK" className="text-xs">Stocks</SelectItem>
                        <SelectItem value="OPTION" className="text-xs">Options</SelectItem>
                    </SelectContent>
                </Select>

                {/* Date Range */}
                <DateRangePicker
                    className="shrink-0"
                    from={filters.startDate ? new Date(filters.startDate + 'T00:00:00') : undefined}
                    to={filters.endDate ? new Date(filters.endDate + 'T00:00:00') : undefined}
                    onSelect={(range) => {
                        setFilters(prev => ({
                            ...prev,
                            startDate: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                            endDate: range?.to ? format(range.to, "yyyy-MM-dd") : ""
                        }));
                    }}
                />

                {/* Status Filter (Optional) */}
                {showStatusFilter && (
                    <Select
                        value={filters.status}
                        onValueChange={(value: "all" | "open" | "winners" | "losers") =>
                            setFilters(prev => ({ ...prev, status: value }))
                        }
                    >
                        <SelectTrigger className="w-[110px] h-8 text-xs bg-background/50 border-border/50">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">All Status</SelectItem>
                            <SelectItem value="open" className="text-xs">Open</SelectItem>
                            <SelectItem value="winners" className="text-xs">Winners</SelectItem>
                            <SelectItem value="losers" className="text-xs">Losers</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                <div className="flex-1" />

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Export Button */}
                    {onExport && (
                        <Button variant="outline" size="sm" onClick={onExport} className="h-8 text-xs px-3">
                            {exportLabel}
                        </Button>
                    )}

                    {/* Clear Button */}
                    {hasActiveFilters && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClearFilters}
                            className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Active Filters Bar - Slimmer version */}
            {hasActiveFilters && (
                <div className="hidden md:flex border-t border-border/30 px-3 py-1.5 gap-2 items-center flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mr-1">Active:</span>
                    {activeFilterLabels.map((filter) => (
                        <div
                            key={filter.key}
                            className="flex items-center gap-1.5 bg-primary/5 text-primary border border-primary/10 rounded-full pl-2 pr-1 py-0.5 text-[10px] font-medium transition-colors hover:bg-primary/10"
                        >
                            {filter.label}
                            <button
                                onClick={filter.onRemove}
                                className="rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                            >
                                <X className="h-2.5 w-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
