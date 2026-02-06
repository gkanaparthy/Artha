"use client";

import { useState, useEffect } from "react";
import {
    Search,
    Filter,
    MoreHorizontal,
    ShieldCheck,
    Clock,
    Mail,
    Loader2,
    Database,
    History
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    subscriptionStatus: string;
    subscriptionPlan: string | null;
    subscriptionTier: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    isGrandfathered: boolean;
    isFounder: boolean;
    createdAt: string;
}

export function UserManagementTable() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/subscriptions/users?q=${search}&status=${statusFilter}&page=${page}`);
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
            setUsers(data.users);
            setTotalPages(data.pagination.pages);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, statusFilter, page]);

    const handleAction = async (userId: string, action: string, data?: any) => {
        try {
            const res = await fetch("/api/admin/subscriptions/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action, data })
            });
            const result = await res.json();
            if (res.ok) {
                toast.success(result.message);
                fetchUsers();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Action failed");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {["ALL", "ACTIVE", "TRIALING", "GRANDFATHERED", "CANCELLED", "EXPIRED", "PAST_DUE"].map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setStatusFilter(s);
                                setPage(1);
                            }}
                            className="text-[10px] h-7 px-2"
                        >
                            {s}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="border border-[#2E4A3B]/10 dark:border-[#E8EFE0]/10 rounded-xl overflow-hidden bg-white dark:bg-transparent">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#FAFBF6] dark:bg-[#2E4A3B]/20 border-b border-[#2E4A3B]/5 dark:border-[#E8EFE0]/10 text-[#2E4A3B]/60 dark:text-[#E8EFE0]/70 uppercase text-[10px] tracking-widest font-bold">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status & Plan</th>
                                <th className="px-6 py-4">Billing Details</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2E4A3B]/5 dark:divide-[#E8EFE0]/10">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        <p className="mt-2 text-muted-foreground">Loading users...</p>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-muted-foreground">
                                        No users found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-[#FAFBF6]/50 dark:hover:bg-[#2E4A3B]/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-[#E8EFE0] dark:bg-[#2E4A3B]/50 flex items-center justify-center text-[#2E4A3B] dark:text-[#E8EFE0] font-bold text-xs">
                                                    {user.name?.[0] || user.email?.[0]?.toUpperCase()}
                                                </div>
                                                <div className="max-w-[150px] truncate">
                                                    <p className="font-bold text-[#2E4A3B] dark:text-[#E8EFE0] truncate">{user.name || "No name"}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className={`w-fit text-[10px] ${getStatusColor(user.subscriptionStatus)}`}>
                                                    {user.subscriptionStatus}
                                                </Badge>
                                                <span className="text-xs text-[#2E4A3B]/70 dark:text-[#E8EFE0]/70 capitalize">
                                                    {user.subscriptionPlan?.toLowerCase().replace('_', ' ') || 'No plan'} • {user.subscriptionTier}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-serif text-[#2E4A3B]/80 dark:text-[#E8EFE0]/80">
                                            {user.subscriptionStatus === 'TRIALING' ? (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-amber-500" />
                                                    Trial: {user.trialEndsAt ? format(new Date(user.trialEndsAt), 'MMM d, yyyy') : 'No date'}
                                                </div>
                                            ) : user.currentPeriodEnd ? (
                                                <div className="flex items-center gap-1">
                                                    <Database className="h-3 w-3 text-primary" />
                                                    Renews: {format(new Date(user.currentPeriodEnd), 'MMM d, yyyy')}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground opacity-50 italic">No active billing</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted-foreground">
                                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 font-serif">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />

                                                    {user.subscriptionStatus !== 'GRANDFATHERED' && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                if (confirm(`Are you sure you want to GRANDFATHER ${user.email}? This gives them Pro for life for free.`)) {
                                                                    handleAction(user.id, 'grandfather', { sendEmail: true });
                                                                }
                                                            }}
                                                            className="text-blue-600"
                                                        >
                                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                                            Mark Grandfathered
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            const days = prompt("How many days to extend trial?", "14");
                                                            if (days) {
                                                                handleAction(user.id, 'extend-trial', { days: parseInt(days) });
                                                            }
                                                        }}
                                                    >
                                                        <Clock className="mr-2 h-4 w-4" />
                                                        Extend Trial
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            window.open(`https://dashboard.stripe.com/customers/${user.id}`, '_blank');
                                                            // Note: This URL might need adjustment if stripeCustomerId isn't available in this view
                                                        }}
                                                    >
                                                        <Mail className="mr-2 h-4 w-4" />
                                                        View in Stripe
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-[#2E4A3B]/5 dark:border-[#E8EFE0]/10 flex items-center justify-between bg-[#FAFBF6] dark:bg-[#2E4A3B]/20">
                        <p className="text-xs text-muted-foreground font-serif">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-8"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="h-8"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case 'ACTIVE': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
        case 'TRIALING': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        case 'GRANDFATHERED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        case 'CANCELLED': return 'bg-gray-100 dark:bg-gray-800/30 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700';
        case 'EXPIRED': return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800';
        case 'PAST_DUE': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
        default: return 'bg-gray-50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
}
