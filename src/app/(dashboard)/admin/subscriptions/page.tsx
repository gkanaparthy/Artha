"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    CreditCard,
    TrendingUp,
    RefreshCw,
    ShieldCheck,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { UserManagementTable } from "@/components/admin/user-management-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Stats {
    statusCounts: Record<string, number>;
    planCounts: Record<string, number>;
    founderCount: number;
    totalRevenue: number;
    recentPayments: any[];
}

export default function AdminSubscriptionsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats | null>(null);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/subscriptions/stats');
            if (!res.ok) throw new Error('Failed to fetch stats');
            const data = await res.json();
            setStats(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load subscription metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#2E4A3B]">Subscriptions Management</h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Monitor revenue, user tiers, and billing events.
                    </p>
                </div>
                <Button onClick={fetchStats} disabled={loading} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Stats
                </Button>
            </div>

            {/* Top Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="border-[#2E4A3B]/10 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold stat-number">${stats.totalRevenue.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Lifetime processed</p>
                    </CardContent>
                </Card>

                <Card className="border-[#2E4A3B]/10 shadow-sm hover:shadow-md transition-shadow ring-1 ring-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Est. MRR</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold stat-number text-primary">${(stats as any).mrr?.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">Monthly Recurring</p>
                    </CardContent>
                </Card>

                <Card className="border-[#2E4A3B]/10 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Active Founders</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold stat-number">{stats.founderCount} / 100</div>
                        <div className="w-full bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                            <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                                style={{ width: `${stats.founderCount}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[#2E4A3B]/10 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Trialing Users</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold stat-number">{stats.statusCounts['TRIALING'] || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Free 30-day trials</p>
                    </CardContent>
                </Card>

                <Card className="border-[#2E4A3B]/10 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Paying Active</CardTitle>
                        <CreditCard className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold stat-number">{stats.statusCounts['ACTIVE'] || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Recurring subscribers</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="bg-[#E8EFE0]/50 border border-[#2E4A3B]/10 p-1 rounded-xl">
                    <TabsTrigger value="users" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-[#2E4A3B] data-[state=active]:shadow-sm">
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-[#2E4A3B] data-[state=active]:shadow-sm">
                        Plan Distribution
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-lg px-6 py-2 data-[state=active]:bg-white data-[state=active]:text-[#2E4A3B] data-[state=active]:shadow-sm">
                        Recent Payments
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <UserManagementTable />
                </TabsContent>

                <TabsContent value="stats">
                    <div className="grid gap-8 md:grid-cols-2">
                        <Card className="border-[#2E4A3B]/10 overflow-hidden">
                            <CardHeader className="bg-[#FAFBF6] border-b border-[#2E4A3B]/5">
                                <CardTitle>Plan Distribution</CardTitle>
                                <CardDescription>Breakdown by billing cycle and status</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {Object.entries(stats.statusCounts).map(([status, count]) => (
                                        <div key={status} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={status} />
                                                <span className="text-sm font-medium uppercase tracking-wider text-[#2E4A3B]/60">{status.replace('_', ' ')}</span>
                                            </div>
                                            <span className="font-bold">{count}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 pt-6 border-t border-[#2E4A3B]/5">
                                    <h4 className="text-sm font-bold text-[#2E4A3B] mb-4 uppercase tracking-widest">Active Plans</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="text-center p-3 rounded-xl bg-primary/5">
                                            <p className="text-xs text-muted-foreground mb-1 uppercase">Monthly</p>
                                            <p className="text-lg font-bold">{stats.planCounts['MONTHLY'] || 0}</p>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-primary/5">
                                            <p className="text-xs text-muted-foreground mb-1 uppercase">Annual</p>
                                            <p className="text-lg font-bold">{stats.planCounts['ANNUAL'] || 0}</p>
                                        </div>
                                        <div className="text-center p-3 rounded-xl bg-primary/5">
                                            <p className="text-xs text-muted-foreground mb-1 uppercase">Lifetime</p>
                                            <p className="text-lg font-bold">{stats.planCounts['LIFETIME'] || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="activity">
                    <Card className="border-[#2E4A3B]/10 overflow-hidden">
                        <CardHeader className="bg-[#FAFBF6] border-b border-[#2E4A3B]/5">
                            <CardTitle>Recent Payments</CardTitle>
                            <CardDescription>Latest successful transactions</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-[#2E4A3B]/5">
                                {stats.recentPayments.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No payments recorded yet.
                                    </div>
                                ) : (
                                    stats.recentPayments.map((payment) => (
                                        <div key={payment.id} className="p-4 hover:bg-[#FAFBF6] transition-colors group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-[#E8EFE0] flex items-center justify-center text-[#2E4A3B] font-bold">
                                                        {payment.user?.name?.[0] || payment.user?.email?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-[#2E4A3B]">{payment.user?.name || 'Anonymous'}</p>
                                                        <p className="text-xs text-muted-foreground">{payment.user?.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-[#2E4A3B]">+${payment.amount}</p>
                                                    <p className="text-[10px] text-muted-foreground">{format(new Date(payment.createdAt), 'MMM d, h:mm a')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'ACTIVE': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
        case 'TRIALING': return <Clock className="h-4 w-4 text-amber-500" />;
        case 'PAST_DUE': return <AlertCircle className="h-4 w-4 text-red-500" />;
        case 'CANCELLED': return <XCircle className="h-4 w-4 text-gray-400" />;
        case 'GRANDFATHERED': return <ShieldCheck className="h-4 w-4 text-blue-500" />;
        default: return <div className="h-2 w-2 rounded-full bg-gray-300" />;
    }
}
