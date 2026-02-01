"use client"

import * as React from "react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"
import "react-day-picker/style.css"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    const defaultClassNames = getDefaultClassNames();

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                root: `${defaultClassNames.root}`,
                months: `${defaultClassNames.months}`,
                month: `${defaultClassNames.month}`,
                caption_label: `${defaultClassNames.caption_label} text-sm font-medium`,
                nav: `${defaultClassNames.nav} flex gap-1`,
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
                ),
                weekday: `${defaultClassNames.weekday} text-muted-foreground font-normal text-[0.8rem]`,
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-9 sm:h-9 sm:w-9 p-0 font-normal transition-none md:scale-100 scale-110"
                ),
                range_start: "bg-primary text-primary-foreground rounded-r-none rounded-l-md",
                range_end: "bg-primary text-primary-foreground rounded-l-none rounded-r-md",
                range_middle: "bg-primary/20 text-foreground font-medium rounded-none hover:bg-primary/30",
                selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                today: "bg-accent/40 text-accent-foreground font-bold",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50",
                hidden: "invisible",
                ...classNames,
            }}
            {...props}
        />
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
