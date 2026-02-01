"use client";

import * as React from "react";
import { CalendarIcon, Check } from "lucide-react";
import {
    subDays,
    startOfToday,
    startOfYesterday,
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfYear,
    endOfYear,
    subYears,
    format,
    isSameDay
} from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface DateRangePickerProps {
    from?: Date;
    to?: Date;
    onSelect: (range: DateRange | undefined) => void;
    className?: string;
}

const presets = [
    { label: "Today", getValue: () => ({ from: startOfToday(), to: startOfToday() }) },
    { label: "Yesterday", getValue: () => ({ from: startOfYesterday(), to: startOfYesterday() }) },
    { label: "Last 7 days", getValue: () => ({ from: subDays(startOfToday(), 6), to: startOfToday() }) },
    { label: "Last 30 days", getValue: () => ({ from: subDays(startOfToday(), 29), to: startOfToday() }) },
    { label: "This Month", getValue: () => ({ from: startOfMonth(startOfToday()), to: endOfMonth(startOfToday()) }) },
    { label: "Last Month", getValue: () => ({ from: startOfMonth(subMonths(startOfToday(), 1)), to: endOfMonth(subMonths(startOfToday(), 1)) }) },
    { label: "Last 12 Months", getValue: () => ({ from: subMonths(startOfToday(), 12), to: startOfToday() }) },
    { label: "Last Year", getValue: () => ({ from: startOfYear(subYears(startOfToday(), 1)), to: endOfYear(subYears(startOfToday(), 1)) }) },
    { label: "YTD", getValue: () => ({ from: startOfYear(startOfToday()), to: startOfToday() }) },
];

export function DateRangePicker({
    from,
    to,
    onSelect,
    className,
}: DateRangePickerProps) {
    const [range, setRange] = React.useState<DateRange | undefined>(
        from ? { from, to } : undefined
    );
    const [open, setOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

    // Detect mobile for responsive UI
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Update local range when props change
    React.useEffect(() => {
        setRange(from ? { from, to } : undefined);
    }, [from, to]);

    const handleSelect = (newRange: DateRange | undefined) => {
        setRange(newRange);
        // On mobile, we might want to automatically apply if both are selected? 
        // No, keep the Apply button for consistency.
    };

    const handleApply = (finalRange: DateRange | undefined) => {
        onSelect(finalRange);
        setOpen(false);
    };

    const handlePresetClick = (presetRange: { from: Date; to: Date }) => {
        setRange(presetRange);
        handleApply(presetRange);
    };

    const isPresetSelected = (presetRange: { from: Date; to: Date }) => {
        if (!range || !range.from || !range.to) return false;
        return isSameDay(range.from, presetRange.from) && isSameDay(range.to, presetRange.to);
    };

    const trigger = (
        <Button
            id="date"
            variant={"outline"}
            className={cn(
                "w-full md:w-[260px] justify-start text-left font-normal h-9 md:h-8 text-xs bg-background/50 border-border hover:bg-accent hover:text-accent-foreground px-3",
                !range && "text-muted-foreground"
            )}
        >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">
                {range?.from ? (
                    range.to ? (
                        <>
                            {format(range.from, "LLL dd, y")} -{" "}
                            {format(range.to, "LLL dd, y")}
                        </>
                    ) : (
                        format(range.from, "LLL dd, y")
                    )
                ) : (
                    <span>Pick a date range</span>
                )}
            </span>
        </Button>
    );

    const content = (
        <div className="flex flex-col md:flex-row max-w-full overflow-hidden">
            <div className="p-1 flex justify-center overflow-x-auto">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={range?.from}
                    selected={range}
                    onSelect={handleSelect}
                    numberOfMonths={1}
                    className="max-w-full"
                />
            </div>
            <div className="flex flex-col border-t md:border-t-0 md:border-l border-border min-w-[160px]">
                <div className="flex-1 p-3 space-y-1 grid grid-cols-2 md:grid-cols-1 gap-1">
                    {presets.map((preset) => {
                        const presetValue = preset.getValue();
                        const selected = isPresetSelected(presetValue);
                        return (
                            <button
                                key={preset.label}
                                onClick={() => handlePresetClick(presetValue)}
                                className={cn(
                                    "flex items-center gap-2 md:gap-3 w-full px-3 py-2 text-xs md:text-sm text-left rounded-md transition-colors",
                                    selected
                                        ? "bg-primary/20 text-primary font-medium"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-sm border transition-colors flex items-center justify-center shrink-0",
                                    selected
                                        ? "bg-primary border-primary"
                                        : "border-border bg-background/50"
                                )}>
                                    {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>
                                <span className="truncate">{preset.label}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="p-3 bg-accent/20 border-t border-border mt-auto">
                    <Button
                        className="w-full font-semibold btn-glow h-11 md:h-9 text-sm md:text-xs"
                        onClick={() => handleApply(range)}
                        disabled={!range?.from}
                    >
                        Apply Filter
                    </Button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div className={cn("grid gap-2", className)}>
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        {trigger}
                    </SheetTrigger>
                    <SheetContent side="bottom" className="p-0 sm:max-w-full rounded-t-xl h-[90vh] overflow-y-auto">
                        <SheetTitle className="sr-only">Select Date Range</SheetTitle>
                        <div className="pt-6 px-4 pb-6">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold">Select Date Range</h3>
                                <p className="text-xs text-muted-foreground">Pick a start and end date or use a preset below.</p>
                            </div>
                            {content}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        );
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    {trigger}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 flex bg-background/95 backdrop-blur-md border-border shadow-2xl overflow-hidden" align="start">
                    {content}
                </PopoverContent>
            </Popover>
        </div>
    );
}

