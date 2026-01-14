"use client";

/**
 * Export data to Excel (CSV format that Excel opens directly)
 */
export function exportToExcel<T extends object>(
    data: T[],
    filename: string,
    columns: { key: keyof T; header: string; formatter?: (value: unknown) => string }[]
) {
    if (data.length === 0) {
        alert("No data to export");
        return;
    }

    // Build header row
    const headers = columns.map(col => col.header);

    // Build data rows
    const rows = data.map(item =>
        columns.map(col => {
            const value = item[col.key];
            if (col.formatter) {
                return escapeCSV(col.formatter(value));
            }
            if (value === null || value === undefined) {
                return "";
            }
            if (value instanceof Date) {
                return escapeCSV(value.toISOString().split('T')[0]);
            }
            return escapeCSV(String(value));
        })
    );

    // Combine into CSV
    const csv = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    // Create and download file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
    // If value contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(value: unknown): string {
    if (typeof value !== "number") return "";
    return value.toFixed(2);
}

/**
 * Format date for export
 */
export function formatDateForExport(value: unknown): string {
    if (!value) return "";
    if (typeof value === "string") {
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
    }
    if (value instanceof Date) {
        return value.toISOString().split('T')[0];
    }
    return "";
}
