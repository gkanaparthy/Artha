"use client";

import { useState, useEffect } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Target,
    AlertTriangle,
    Smile,
    Tag as TagIcon,
    Loader2,
    Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/contexts/filter-context";
import { TagCategory } from "@/types/tags";
import { cn } from "@/lib/utils";

interface TagStats {
    id: string;
    name: string;
    color: string;
    category: TagCategory;
    totalPnL: number;
    tradeCount: number;
    winCount: number;
    lossCount: number;
    avgPnL: number;
    winRate: number;
}

export function TagPerformance() {
    const { filters } = useFilters();
    const [data, setData] = useState<TagStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (filters.startDate) params.append("startDate", filters.startDate);
                if (filters.endDate) params.append("endDate", filters.endDate);
                if (filters.accountId && filters.accountId !== "all") params.append("accountId", filters.accountId);

                const res = await fetch(`/api/tags/analytics?${params.toString()}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json.analytics);
                }
            } catch (error) {
                console.error("Failed to fetch tag analytics", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [filters.startDate, filters.endDate, filters.accountId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <Card className="bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <TagIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">No Tag Data Available</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Start tagging your trades in the journal to see performance analytics here.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const categoryStats = {
        [TagCategory.SETUP]: data.filter(d => d.category === TagCategory.SETUP),
        [TagCategory.MISTAKE]: data.filter(d => d.category === TagCategory.MISTAKE),
        [TagCategory.EMOTION]: data.filter(d => d.category === TagCategory.EMOTION),
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const totalMistakeCost = categoryStats[TagCategory.MISTAKE].reduce((sum, s) => sum + s.totalPnL, 0);
    const totalSetupPnL = categoryStats[TagCategory.SETUP].reduce((sum, s) => sum + s.totalPnL, 0);
    // currentTaggedPnL should be the sum of all tagged P&L (Bug #7)
    const currentTaggedPnL = data.reduce((sum, s) => sum + s.totalPnL, 0);

    return (
        <div className="space-y-6">
            {/* Impact Summary / What-If Analysis */}
            {categoryStats[TagCategory.MISTAKE].length > 0 && (
                <Card className="bg-gradient-to-br from-red-500/5 via-background to-background border-red-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            Behavioral Alpha
                        </CardTitle>
                        <CardDescription>How much your mistakes are costing you</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Mistake Cost</p>
                                <p className="text-2xl font-bold text-red-500">{formatCurrency(totalMistakeCost)}</p>
                            </div>
                            <div className="h-8 w-px bg-border hidden md:block" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">"What If" Performance</p>
                                <p className="text-2xl font-bold text-green-500 flex items-center gap-2">
                                    {formatCurrency(currentTaggedPnL - totalMistakeCost)}
                                    <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-600 bg-green-500/5">
                                        Potential
                                    </Badge>
                                </p>
                            </div>
                            <div className="flex-1 text-sm text-muted-foreground md:text-right italic">
                                "If you had avoided these mistakes, you'd be {formatCurrency(Math.abs(totalMistakeCost))} more profitable."
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* P&L by Setup */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            <CardTitle className="text-base">Setup Performance</CardTitle>
                        </div>
                        <CardDescription>Total P&L by strategy setup</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryStats[TagCategory.SETUP]} layout="vertical" margin={{ left: 40, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        fontSize={12}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [formatCurrency(value), "P&L"]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="totalPnL" radius={[0, 4, 4, 0]}>
                                        {categoryStats[TagCategory.SETUP].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? entry.color : entry.color + '80'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Mistakes impact */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <CardTitle className="text-base">Mistake Cost</CardTitle>
                        </div>
                        <CardDescription>P&L impact of trading errors</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {categoryStats[TagCategory.MISTAKE]
                                .sort((a, b) => a.totalPnL - b.totalPnL)
                                .map(mistake => (
                                    <div key={mistake.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mistake.color }} />
                                            <span className="text-sm font-medium">{mistake.name}</span>
                                        </div>
                                        <span className="text-sm font-mono text-red-500">
                                            {formatCurrency(mistake.totalPnL)}
                                        </span>
                                    </div>
                                ))
                            }
                            {categoryStats[TagCategory.MISTAKE].length === 0 && (
                                <p className="text-center text-sm text-muted-foreground py-8 italic">No mistakes logged! Keep it up.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Performing Tags List */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-base">Tag Metrics Detail</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-muted-foreground">
                                        <th className="text-left py-3 font-medium">Tag</th>
                                        <th className="text-right py-3 font-medium">Trades</th>
                                        <th className="text-right py-3 font-medium">Win Rate</th>
                                        <th className="text-right py-3 font-medium">Avg P&L</th>
                                        <th className="text-right py-3 font-medium">Total P&L</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.map(stats => (
                                        <tr key={stats.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stats.color }} />
                                                    <span className="font-medium">{stats.name}</span>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal opacity-60">
                                                        {stats.category.toLowerCase()}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 font-mono">{stats.tradeCount}</td>
                                            <td className="text-right py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={cn("h-full", stats.winRate >= 50 ? "bg-green-500" : "bg-red-500")}
                                                            style={{ width: `${stats.winRate}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-mono">{stats.winRate.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className={cn("text-right py-3 font-mono", stats.avgPnL >= 0 ? "text-green-600" : "text-red-600")}>
                                                {formatCurrency(stats.avgPnL)}
                                            </td>
                                            <td className={cn("text-right py-3 font-mono font-semibold", stats.totalPnL >= 0 ? "text-green-600" : "text-red-600")}>
                                                {formatCurrency(stats.totalPnL)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
