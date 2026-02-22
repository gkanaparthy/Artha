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
    Cell
} from "recharts";
import {
    Target,
    AlertTriangle,
    Tag as TagIcon,
    Loader2,
    Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFilters } from "@/contexts/filter-context";
import { TagCategory } from "@/types/tags";
import { cn } from "@/lib/utils";
import { DEMO_POSITIONS } from "@/lib/demo-data";
import type { DisplayPosition } from "@/types/trading";

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

interface TagPerformanceProps {
    isDemo?: boolean;
}

function computeDemoTagStats(positions: DisplayPosition[], filters: ReturnType<typeof useFilters>["filters"]): TagStats[] {
    const symbolFilters = filters.symbol
        ? filters.symbol.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
        : [];

    const fromDate = filters.startDate ? new Date(filters.startDate + "T00:00:00") : null;
    const toDate = filters.endDate ? new Date(filters.endDate + "T23:59:59") : null;

    const filtered = positions.filter((position) => {
        if (filters.accountId && filters.accountId.length > 0 && !filters.accountId.includes(position.accountId)) {
            return false;
        }

        if (symbolFilters.length > 0 && !symbolFilters.some(symbol => position.symbol.toLowerCase().includes(symbol))) {
            return false;
        }

        if (filters.assetType && filters.assetType !== "all" && position.type !== filters.assetType) {
            return false;
        }

        if (filters.action && filters.action !== "ALL") {
            const side = filters.action === "BUY" ? "long" : "short";
            if (position.side !== side) return false;
        }

        const effectiveDate = new Date(
            (position.status === "closed" ? position.closedAt : position.openedAt) || position.openedAt
        );

        if (fromDate && effectiveDate < fromDate) {
            return false;
        }
        if (toDate && effectiveDate > toDate) {
            return false;
        }

        if (filters.status && filters.status !== "all") {
            if (filters.status === "open" && position.status !== "open") return false;
            if (filters.status === "winners" && !(position.status === "closed" && (position.pnl ?? 0) > 0)) return false;
            if (filters.status === "losers" && !(position.status === "closed" && (position.pnl ?? 0) < 0)) return false;
        }

        if (filters.tagIds && filters.tagIds.length > 0) {
            const positionTagIds = (position.tags || []).map(tag => tag.id);
            if (filters.tagFilterMode === "all") {
                return filters.tagIds.every(id => positionTagIds.includes(id));
            }
            return filters.tagIds.some(id => positionTagIds.includes(id));
        }

        return true;
    });

    const statsMap = new Map<string, TagStats>();

    for (const position of filtered) {
        const tags = position.tags || [];
        if (tags.length === 0) continue;

        const pnl = position.status === "closed" ? (position.pnl ?? 0) : 0;
        const isClosed = position.status === "closed";

        for (const tag of tags) {
            if (!statsMap.has(tag.id)) {
                statsMap.set(tag.id, {
                    id: tag.id,
                    name: tag.name,
                    color: tag.color,
                    category: (tag.category as TagCategory),
                    totalPnL: 0,
                    tradeCount: 0,
                    winCount: 0,
                    lossCount: 0,
                    avgPnL: 0,
                    winRate: 0,
                });
            }

            const stats = statsMap.get(tag.id)!;
            stats.totalPnL += pnl;
            stats.tradeCount += 1;
            if (isClosed) {
                if (pnl > 0) stats.winCount += 1;
                if (pnl < 0) stats.lossCount += 1;
            }
        }
    }

    return Array.from(statsMap.values())
        .map((stats) => {
            const tradeCount = stats.tradeCount || 1;
            return {
                ...stats,
                totalPnL: Math.round(stats.totalPnL * 100) / 100,
                avgPnL: Math.round((stats.totalPnL / tradeCount) * 100) / 100,
                winRate: Math.round((stats.winCount / tradeCount) * 1000) / 10,
            };
        })
        .sort((a, b) => b.totalPnL - a.totalPnL);
}

export function TagPerformance({ isDemo = false }: TagPerformanceProps) {
    const { filters } = useFilters();
    const [data, setData] = useState<TagStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isDemo) {
            setLoading(true);
            setData(computeDemoTagStats(DEMO_POSITIONS, filters));
            setLoading(false);
            return;
        }
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const params = new URLSearchParams();
                if (filters.startDate) params.append("startDate", filters.startDate);
                if (filters.endDate) params.append("endDate", filters.endDate);
                if (filters.accountId && filters.accountId.length > 0) {
                    params.append("accountId", filters.accountId.join(","));
                }

                const res = await fetch(`/api/tags/analytics?${params.toString()}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json.analytics);
                } else {
                    setData([]);
                }
            } catch (error) {
                console.error("Failed to fetch tag analytics", error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [isDemo, filters]);

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
    // currentTaggedPnL should be the sum of all tagged P&L (Bug #7)
    const currentTaggedPnL = data.reduce((sum, s) => sum + s.totalPnL, 0);

    return (
        <div className="space-y-6">
            {/* Impact Summary / What-If Analysis */}
            {categoryStats[TagCategory.MISTAKE].length > 0 && (
                <Card className="bg-gradient-to-br from-red-500/5 via-background to-background border-rose-500/20">
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
                                <p className="text-2xl font-bold text-rose-500">{formatCurrency(totalMistakeCost)}</p>
                            </div>
                            <div className="h-8 w-px bg-border hidden md:block" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">What-If Performance</p>
                                <p className="text-2xl font-bold text-emerald-500 flex items-center gap-2">
                                    {formatCurrency(currentTaggedPnL - totalMistakeCost)}
                                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-green-600 bg-emerald-500/5">
                                        Potential
                                    </Badge>
                                </p>
                            </div>
                            <div className="flex-1 text-sm text-muted-foreground md:text-right italic">
                                If you had avoided these mistakes, you would be {formatCurrency(Math.abs(totalMistakeCost))} more profitable.
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
                            <Target className="h-4 w-4 text-emerald-500" />
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
                                        formatter={(value: number | string | undefined) => [formatCurrency(Number(value ?? 0)), "P&L"]}
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
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
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
                                        <span className="text-sm font-mono text-rose-500">
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
                                                            className={cn("h-full", stats.winRate >= 50 ? "bg-emerald-500" : "bg-rose-500")}
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
