"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";

export type FilterStatus = "all" | "open" | "winners" | "losers";
export type FilterAction = "ALL" | "BUY" | "SELL";

export interface Account {
    id: string;
    brokerName: string;
    snapTradeAccountId: string;
    accountNumber: string | null;
}

interface FilterState {
    symbol: string;
    startDate: string;
    endDate: string;
    status: FilterStatus;
    action: FilterAction;
    accountId: string; // Changed from broker to accountId
}

interface FilterContextType {
    filters: FilterState;
    setFilters: (filters: FilterState | ((prev: FilterState) => FilterState)) => void;
    resetFilters: () => void;
    accounts: Account[];
    setAccounts: (accounts: Account[]) => void;
}

const defaultFilters: FilterState = {
    symbol: "",
    startDate: "",
    endDate: "",
    status: "all",
    action: "ALL",
    accountId: "all",
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Helper to safely load filters from localStorage (only called once via lazy init)
function loadFiltersFromStorage(): FilterState {
    if (typeof window === 'undefined') return defaultFilters;

    try {
        const saved = localStorage.getItem("dashboard_filters_v2");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                return {
                    symbol: typeof parsed.symbol === 'string' ? parsed.symbol : '',
                    startDate: typeof parsed.startDate === 'string' ? parsed.startDate : '',
                    endDate: typeof parsed.endDate === 'string' ? parsed.endDate : '',
                    status: ['all', 'open', 'winners', 'losers'].includes(parsed.status) ? parsed.status : 'all',
                    action: ['ALL', 'BUY', 'SELL'].includes(parsed.action) ? parsed.action : 'ALL',
                    accountId: typeof parsed.accountId === 'string' ? parsed.accountId : 'all',
                };
            }
        }
    } catch (e) {
        console.error("Failed to parse saved filters", e);
    }
    return defaultFilters;
}

export function FilterProvider({ children }: { children: ReactNode }) {
    const [filters, setFilters] = useState<FilterState>(loadFiltersFromStorage);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const isMounted = useRef(false);

    // Fetch accounts on mount
    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                const res = await fetch('/api/accounts');
                if (res.ok) {
                    const data = await res.json();
                    setAccounts(data.accounts || []);
                }
            } catch (e) {
                console.error("Failed to fetch accounts", e);
            }
        };
        fetchAccounts();
    }, []);

    // Persist to localStorage when filters change (skip initial render)
    useEffect(() => {
        if (isMounted.current) {
            localStorage.setItem("dashboard_filters_v2", JSON.stringify(filters));
        } else {
            isMounted.current = true;
        }
    }, [filters]);

    const resetFilters = useCallback(() => setFilters(defaultFilters), []);

    const setAccountsStable = useCallback((newAccounts: Account[]) => {
        setAccounts(newAccounts);
    }, []);

    return (
        <FilterContext.Provider value={{ filters, setFilters, resetFilters, accounts, setAccounts: setAccountsStable }}>
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
