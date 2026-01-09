"use client";

import { useState, useMemo, useCallback } from "react";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";

type SortDirection = "asc" | "desc";

interface UseSortOptions<T, F extends string> {
  data: T[];
  defaultField: F;
  defaultDirection?: SortDirection;
  getValueForField: (item: T, field: F) => string | number;
}

export function useSort<T, F extends string>({
  data,
  defaultField,
  defaultDirection = "desc",
  getValueForField,
}: UseSortOptions<T, F>) {
  const [sortField, setSortField] = useState<F>(defaultField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const handleSort = useCallback((field: F) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }, [sortField]);

  const getSortIcon = useCallback((field: F) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/30" />;
    }
    return sortDirection === "asc"
      ? <TrendingUp className="h-4 w-4 text-primary" />
      : <TrendingDown className="h-4 w-4 text-primary" />;
  }, [sortField, sortDirection]);

  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      const aVal = getValueForField(a, sortField);
      const bVal = getValueForField(b, sortField);

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    return sorted;
  }, [data, sortField, sortDirection, getValueForField]);

  return {
    sortedData,
    sortField,
    sortDirection,
    handleSort,
    getSortIcon,
  };
}
