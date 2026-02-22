import React from "react";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
    value: number;
    className?: string;
    signDisplay?: "auto" | "always" | "never" | "brackets";
    prefix?: string;
}

export function CurrencyDisplay({
    value,
    className,
    signDisplay = "auto",
    prefix = "$",
}: CurrencyDisplayProps) {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return <span className={cn("text-muted-foreground", className)}>—</span>;
    }

    const isBrackets = signDisplay === "brackets" && value < 0;
    const showNegativeSign =
        value < 0 && signDisplay !== "never" && signDisplay !== "brackets";
    const showPositiveSign = signDisplay === "always" && value >= 0;

    const sign = showNegativeSign ? "-" : showPositiveSign ? "+" : "";

    const absValue = Math.abs(value);
    const parts = absValue.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).split(".");
    const intPart = parts[0];
    const decPart = parts[1];

    return (
        <span className={cn("tabular-nums inline-flex items-baseline", className)}>
            {isBrackets && <span>(</span>}
            <span>{sign}{prefix}</span>
            <span>{intPart}</span>
            {decPart && (
                <span className="text-[0.7em] opacity-60 font-medium">.{decPart}</span>
            )}
            {isBrackets && <span>)</span>}
        </span>
    );
}
