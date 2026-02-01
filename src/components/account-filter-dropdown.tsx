"use client";

import { Wallet, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useFilters } from "@/contexts/filter-context";
import { cn } from "@/lib/utils";

interface AccountFilterDropdownProps {
    className?: string;
    isMobile?: boolean;
}

export function AccountFilterDropdown({ className, isMobile = false }: AccountFilterDropdownProps) {
    const { filters, setFilters, accounts } = useFilters();

    const selectedAccounts = filters.accountId || [];
    const isAllSelected = selectedAccounts.length === 0;

    const toggleAccount = (accountId: string) => {
        setFilters(prev => {
            const current = prev.accountId || [];
            // If selecting one, and it was empty (all), now it's just this one
            // If it's the last one being deselected, it becomes empty (all)
            const next = current.includes(accountId)
                ? current.filter(id => id !== accountId)
                : [...current, accountId];
            return { ...prev, accountId: next };
        });
    };

    const selectAll = () => {
        setFilters(prev => ({ ...prev, accountId: [] }));
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "gap-2 text-xs bg-background/50 border-border/50 text-left justify-start font-normal",
                        isMobile ? "w-full h-9 px-3" : "h-8 w-[150px]",
                        !isAllSelected && "border-primary bg-primary/5 text-primary",
                        className
                    )}
                >
                    <Wallet className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">
                        {isAllSelected
                            ? "All Accounts"
                            : selectedAccounts.length === 1
                                ? accounts.find(a => a.id === selectedAccounts[0])?.brokerName || "1 Account"
                                : `${selectedAccounts.length} Accounts`
                        }
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMobile ? "center" : "start"} className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Filter by Account</span>
                    {!isAllSelected && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.preventDefault();
                                selectAll();
                            }}
                            className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary"
                        >
                            Reset to All
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="max-h-[300px] overflow-y-auto">
                    <DropdownMenuCheckboxItem
                        checked={isAllSelected}
                        onCheckedChange={selectAll}
                        onSelect={(e) => e.preventDefault()}
                        className="text-xs"
                    >
                        All Accounts
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />

                    {accounts.map((account) => {
                        const last4 = account.accountNumber
                            ? account.accountNumber.slice(-4)
                            : account.snapTradeAccountId.slice(-4);
                        return (
                            <DropdownMenuCheckboxItem
                                key={account.id}
                                checked={selectedAccounts.includes(account.id)}
                                onCheckedChange={() => toggleAccount(account.id)}
                                onSelect={(e) => e.preventDefault()}
                                className="text-xs"
                            >
                                <div className="flex flex-col gap-0.5 pointer-events-none">
                                    <span className="font-medium leading-none">{account.brokerName || "Unknown"}</span>
                                    <span className="text-[10px] text-muted-foreground leading-none">****{last4}</span>
                                </div>
                            </DropdownMenuCheckboxItem>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
