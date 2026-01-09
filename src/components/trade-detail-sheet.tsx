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
  onTagAdd,
  onTagRemove,
}: TradeDetailSheetProps) {
  const [newTag, setNewTag] = useState("");

  if (!trade) return null;

  const value = trade.price * trade.quantity;
  const isBuy = trade.action === "BUY";

  const handleAddTag = () => {
    if (newTag.trim() && onTagAdd) {
      onTagAdd(trade.id, newTag.trim());
      setNewTag("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                isBuy ? "bg-green-500/20" : "bg-red-500/20"
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
                  label="Date & Time"
                  value={format(new Date(trade.timestamp), "MMM dd, yyyy 'at' HH:mm")}
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

              <div className="flex flex-wrap gap-2">
                {trade.tags && trade.tags.length > 0 ? (
                  trade.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="pl-2 pr-1 py-1 flex items-center gap-1"
                      style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    >
                      {tag.name}
                      {onTagRemove && (
                        <button
                          onClick={() => onTagRemove(trade.id, tag.id)}
                          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>

              {onTagAdd && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
