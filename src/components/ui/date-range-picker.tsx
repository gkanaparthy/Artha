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

    // Update local range when props change
    React.useEffect(() => {
        setRange(from ? { from, to } : undefined);
    }, [from, to]);

    const handleSelect = (newRange: DateRange | undefined) => {
        setRange(newRange);
    };

    const handleApply = () => {
        onSelect(range);
        setOpen(false);
    };

    const handlePresetClick = (presetRange: { from: Date; to: Date }) => {
        setRange(presetRange);
    };

    const isPresetSelected = (presetRange: { from: Date; to: Date }) => {
        if (!range || !range.from || !range.to) return false;
        return isSameDay(range.from, presetRange.from) && isSameDay(range.to, presetRange.to);
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal h-10 bg-background/50 border-border hover:bg-accent hover:text-accent-foreground",
                            !range && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 flex bg-background/95 backdrop-blur-md border-border shadow-2xl" align="start">
                    <div className="flex flex-col md:flex-row">
                        <div className="p-1">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={range?.from}
                                selected={range}
                                onSelect={handleSelect}
                                numberOfMonths={1}
                            />
                        </div>
                        <div className="flex flex-col border-l border-border min-w-[160px]">
                            <div className="flex-1 p-3 space-y-1">
                                {presets.map((preset) => {
                                    const presetValue = preset.getValue();
                                    const selected = isPresetSelected(presetValue);
                                    return (
                                        <button
                                            key={preset.label}
                                            onClick={() => handlePresetClick(presetValue)}
                                            className={cn(
                                                "flex items-center gap-3 w-full px-3 py-2 text-sm text-left rounded-md transition-colors",
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
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="p-3 bg-accent/20 border-t border-border">
                                <Button
                                    className="w-full font-semibold btn-glow"
                                    onClick={handleApply}
                                >
                                    Apply Date(S)
                                </Button>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
