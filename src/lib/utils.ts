import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency with 2 decimal places
export function formatCurrency(value: number): string {
  return Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Format currency in compact form for mobile (e.g., 1.1K, 2.5M)
export function formatCompactCurrency(value: number, showSign = false): string {
  const absValue = Math.abs(value);
  let formatted: string;

  if (absValue >= 1_000_000) {
    formatted = `${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    formatted = `${(absValue / 1_000).toFixed(1)}K`;
  } else {
    formatted = absValue.toFixed(0);
  }

  const sign = showSign && value !== 0 ? (value >= 0 ? '+' : '-') : '';
  return `${sign}$${formatted}`;
}

// Format date as "Jan 1, 2024"
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Calculate percentage return
export function calculateReturn(entry: number, exit: number | null): number | null {
  if (entry === 0 || exit === null) return null;
  return ((exit - entry) / entry) * 100;
}
