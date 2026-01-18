"use client";

import { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface Trade {
    id: string;
    symbol: string;
    action: string;
    quantity: number;
    price: number;
    timestamp: string;
    type: string;
    account: {
        brokerName: string;
    }
}

export function TradeTable() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTrades = async () => {
        try {
            const userId = localStorage.getItem("trade_journal_user_id") || "DEMO_USER";
            const res = await fetch(`/api/trades?userId=${userId}`);
            const data = await res.json();
            setTrades(data.trades || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (tradeId: string) => {
        if (!confirm("Are you sure you want to delete this trade?")) return;

        try {
            const res = await fetch(`/api/trades?id=${tradeId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setTrades((prev) => prev.filter((t) => t.id !== tradeId));
            } else {
                alert("Failed to delete trade");
            }
        } catch (e) {
            console.error(e);
            alert("Error deleting trade");
        }
    };

    useEffect(() => {
        fetchTrades();
    }, []);

    // Mobile Card Component
    const MobileTradeCard = ({ trade, idx }: { trade: Trade; idx: number }) => {
        const isBuy = trade.action === "BUY";
        const totalValue = trade.price * trade.quantity;

        return (
            <div
                key={`${trade.id}-${idx}`}
                className="bg-card border rounded-xl p-4 space-y-3 shadow-sm"
            >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{trade.symbol}</h3>
                        <p className="text-xs text-muted-foreground truncate">{trade.account?.brokerName}</p>
                    </div>
                    <Badge variant={isBuy ? "default" : "secondary"} className="shrink-0">
                        {trade.action}
                    </Badge>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Date</p>
                        <p className="text-sm font-medium">
                            {trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                        <p className="text-sm font-medium">{trade.quantity}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Price</p>
                        <p className="text-sm font-medium">${trade.price.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                        <p className="text-sm font-semibold">${totalValue.toFixed(2)}</p>
                    </div>
                </div>

                {/* Delete Action */}
                <div className="pt-3 border-t">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(trade.id)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Trade
                    </Button>
                </div>
            </div>
        );
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-3">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {trades.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
                        No trades found. Connect your broker to sync data.
                    </div>
                ) : (
                    trades.map((trade, idx) => (
                        <MobileTradeCard key={trade.id} trade={trade} idx={idx} />
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border bg-card">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Broker</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {trades.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                No trades found. Connect your broker to sync data.
                            </TableCell>
                        </TableRow>
                    ) : (
                        trades.map((trade) => (
                            <TableRow key={trade.id}>
                                <TableCell>{trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : '-'}</TableCell>
                                <TableCell className="font-medium">{trade.symbol}</TableCell>
                                <TableCell>
                                    <Badge variant={trade.action === "BUY" ? "default" : "secondary"}>
                                        {trade.action}
                                    </Badge>
                                </TableCell>
                                <TableCell>{trade.quantity}</TableCell>
                                <TableCell>${trade.price.toFixed(2)}</TableCell>
                                <TableCell>${(trade.price * trade.quantity).toFixed(2)}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{trade.account?.brokerName}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(trade.id)}
                                        aria-label={`Delete ${trade.symbol} trade from ${trade.timestamp ? new Date(trade.timestamp).toLocaleDateString() : 'unknown date'}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            </div>
        </div>
    );
}
