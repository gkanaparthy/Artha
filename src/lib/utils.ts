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
