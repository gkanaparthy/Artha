"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type FilterStatus = "all" | "open" | "winners" | "losers";
export type FilterAction = "ALL" | "BUY" | "SELL";

interface FilterState {
    symbol: string;
    startDate: string;
    endDate: string;
    status: FilterStatus;
    action: FilterAction;
    broker: string;
}

interface FilterContextType {
    filters: FilterState;
    setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
    resetFilters: () => void;
    brokers: string[];
    setBrokers: (brokers: string[]) => void;
}

const defaultFilters: FilterState = {
    symbol: "",
    startDate: "",
    endDate: "",
    status: "all",
    action: "ALL",
    broker: "all",
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const [brokers, setBrokers] = useState<string[]>([]);

    // Optional: Persist to localStorage to keep defaults across reload
    useEffect(() => {
        const saved = localStorage.getItem("dashboard_filters");
        if (saved) {
            try {
                setFilters(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved filters", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("dashboard_filters", JSON.stringify(filters));
    }, [filters]);

    const resetFilters = () => setFilters(defaultFilters);

    return (
        <FilterContext.Provider value={{ filters, setFilters, resetFilters, brokers, setBrokers }}>
            {children}
        </FilterContext.Provider>
    );
}

export function useFilters() {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error("useFilters must be used within a FilterProvider");
    }
    return context;
}
