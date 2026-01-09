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
import { Loader2 } from "lucide-react";
import { format } from "date-fns"; // Need to install date-fns

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

    useEffect(() => {
        fetchTrades();
    }, []);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="rounded-md border bg-card">
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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {trades.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
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
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
