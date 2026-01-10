"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";

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

// Helper to safely load filters from localStorage (only called once via lazy init)
function loadFiltersFromStorage(): FilterState {
    if (typeof window === 'undefined') return defaultFilters;

    try {
        const saved = localStorage.getItem("dashboard_filters");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                return {
                    symbol: typeof parsed.symbol === 'string' ? parsed.symbol : '',
                    startDate: typeof parsed.startDate === 'string' ? parsed.startDate : '',
                    endDate: typeof parsed.endDate === 'string' ? parsed.endDate : '',
                    status: ['all', 'open', 'winners', 'losers'].includes(parsed.status) ? parsed.status : 'all',
                    action: ['ALL', 'BUY', 'SELL'].includes(parsed.action) ? parsed.action : 'ALL',
                    broker: typeof parsed.broker === 'string' ? parsed.broker : 'all',
                };
            }
        }
    } catch (e) {
        console.error("Failed to parse saved filters", e);
    }
    return defaultFilters;
}

export function FilterProvider({ children }: { children: ReactNode }) {
    // Use lazy initialization - the function is only called once on mount
    // This avoids hydration mismatch because useState with a function initializer
    // runs after hydration on the client
    const [filters, setFilters] = useState<FilterState>(loadFiltersFromStorage);
    const [brokers, setBrokers] = useState<string[]>([]);
    // Use ref to track if we've mounted (avoids saving on initial render)
    const isMounted = useRef(false);

    // Fetch brokers from connected accounts on mount
    useEffect(() => {
        const fetchBrokers = async () => {
            try {
                const res = await fetch('/api/accounts');
                if (res.ok) {
                    const data = await res.json();
                    const accounts = data.accounts || [];
                    // Get unique broker names from all connected accounts
                    const uniqueBrokers = [...new Set(accounts.map((a: { brokerName: string }) => a.brokerName))].filter(Boolean) as string[];
                    setBrokers(uniqueBrokers);
                }
            } catch (e) {
                console.error("Failed to fetch broker accounts", e);
            }
        };
        fetchBrokers();
    }, []);

    // Persist to localStorage when filters change (skip initial render)
    useEffect(() => {
        if (isMounted.current) {
            localStorage.setItem("dashboard_filters", JSON.stringify(filters));
        } else {
            isMounted.current = true;
        }
    }, [filters]);

    const resetFilters = useCallback(() => setFilters(defaultFilters), []);

    const setBrokersStable = useCallback((newBrokers: string[]) => {
        setBrokers(prev => {
            // Merge new brokers with existing ones to ensure we don't lose any
            const merged = [...new Set([...prev, ...newBrokers])];
            return merged;
        });
    }, []);

    return (
        <FilterContext.Provider value={{ filters, setFilters, resetFilters, brokers, setBrokers: setBrokersStable }}>
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
