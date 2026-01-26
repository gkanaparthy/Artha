"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Hash,
  Building2,
  Tag,
  Plus,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { TagAssignment } from "./tag-assignment";

interface Trade {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  timestamp: string;
  type: string;
  fees: number;
  account: {
    brokerName: string | null;
  };
  tags: { id: string; name: string; color: string }[];
  accountId: string;
}

interface TradeDetailSheetProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagAdd?: (tradeId: string, tagName: string) => void;
  onTagRemove?: (tradeId: string, tagId: string) => void;
}

export function TradeDetailSheet({
  trade,
  open,
  onOpenChange,
}: TradeDetailSheetProps) {
  if (!trade) return null;

  const positionKey = `${trade.accountId}:${trade.symbol}:${trade.timestamp}`;
  const value = trade.price * trade.quantity;
  const isBuy = trade.action.includes("BUY") || trade.action === "ASSIGNMENT";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-lg flex items-center justify-center ${isBuy ? "bg-green-500/20" : "bg-red-500/20"
                }`}
            >
              {isBuy ? (
                <TrendingUp className="h-6 w-6 text-green-500" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div>
              <SheetTitle className="text-xl">{trade.symbol}</SheetTitle>
              <SheetDescription>
                <Badge
                  variant="outline"
                  className={
                    isBuy
                      ? "text-green-500 border-green-500/50"
                      : "text-red-500 border-red-500/50"
                  }
                >
                  {trade.action}
                </Badge>
                <span className="ml-2">{trade.type}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-4">
          <div className="space-y-6">
            {/* Trade Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Trade Details
              </h3>

              <div className="grid gap-4">
                <DetailRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Date"
                  value={format(new Date(trade.timestamp), "MMM dd, yyyy")}
                />

                <DetailRow
                  icon={<Hash className="h-4 w-4" />}
                  label="Quantity"
                  value={trade.quantity.toString()}
                />

                <DetailRow
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Price"
                  value={`$${trade.price.toFixed(2)}`}
                />

                <DetailRow
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Total Value"
                  value={`$${value.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                  highlight
                />

                <DetailRow
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Fees"
                  value={`$${(trade.fees || 0).toFixed(2)}`}
                />

                <DetailRow
                  icon={<Building2 className="h-4 w-4" />}
                  label="Broker"
                  value={trade.account?.brokerName || "Unknown"}
                />
              </div>
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>

              <TagAssignment positionKey={positionKey} />

              <p className="text-[10px] text-muted-foreground italic">
                Tags are applied to this position based on symbol and date.
              </p>
            </div>

            <Separator />

            {/* Trade ID */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Trade ID
              </h3>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                {trade.id}
              </code>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className={`font-mono ${highlight ? "font-semibold text-lg" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}
