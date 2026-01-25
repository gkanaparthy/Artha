"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Edit2, Unlink, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Strategy,
  StrategyLeg,
  STRATEGY_SHORT_LABELS,
  STRATEGY_COLORS,
} from "@/types/strategy";

interface StrategyGroupCardProps {
  strategy: Strategy & { legs?: StrategyLeg[] };
  onEdit?: (id: string) => void;
  onUngroup?: (id: string) => void;
  onClick?: (id: string) => void;
}

export function StrategyGroupCard({
  strategy,
  onEdit,
  onUngroup,
  onClick,
}: StrategyGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const colors = STRATEGY_COLORS[strategy.strategyType];
  const isProfit = strategy.realizedPnL > 0;
  const hasLegs = strategy.legs && strategy.legs.length > 0;

  const handleCardClick = () => {
    if (onClick) {
      onClick(strategy.id);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(strategy.id);
    }
  };

  const handleUngroupClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUngroup) {
      onUngroup(strategy.id);
    }
  };

  return (
    <Card
      className={cn(
        "border transition-all hover:shadow-md cursor-pointer",
        strategy.status === "closed" && "opacity-75"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Expand/Collapse Button */}
            {hasLegs && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={handleExpandClick}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}

              <div className="min-w-0">
                {/* Strategy Name and Type */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base truncate">
                    {strategy.name || strategy.underlyingSymbol}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-medium shrink-0",
                      colors.bg,
                      colors.text,
                      colors.border
                    )}
                  >
                    {STRATEGY_SHORT_LABELS[strategy.strategyType]}
                  </Badge>
                  {strategy.status === "open" ? (
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                      Open
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-gray-500/10 text-gray-600 border-gray-500/30">
                      Closed
                    </Badge>
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(strategy.openedAt), "MMM d, yyyy")}
                  </span>
                  {strategy.expirationDate && (
                    <span>Exp: {format(new Date(strategy.expirationDate), "MMM d")}</span>
                  )}
                  <span>{strategy.legCount} legs</span>
                  <span className="text-muted-foreground/60">{strategy.broker}</span>
                </div>
              </div>
            </div>

            {/* P&L and Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* P&L Display */}
              <div className="text-right">
                <div
                  className={cn(
                    "text-base font-semibold font-mono flex items-center gap-1",
                    isProfit ? "text-green-600" : strategy.realizedPnL < 0 ? "text-red-600" : "text-muted-foreground"
                  )}
                >
                  {isProfit ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : strategy.realizedPnL < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : null}
                  {strategy.realizedPnL >= 0 ? "+" : ""}
                  ${strategy.realizedPnL.toFixed(2)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
                  {strategy.netPremium !== 0 && (
                    <span>
                      {strategy.netPremium > 0 ? "Cr" : "Dr"}: $
                      {Math.abs(strategy.netPremium).toFixed(0)}
                    </span>
                  )}
                  {strategy.maxProfit !== null && strategy.maxLoss !== null && (
                    <>
                      <span className="text-green-600">+${strategy.maxProfit.toFixed(0)}</span>
                      <span>/</span>
                      <span className="text-red-600">-${strategy.maxLoss.toFixed(0)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleEditClick}
                    title="Edit Strategy"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {onUngroup && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={handleUngroupClick}
                    title="Ungroup Trades"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

        {/* Expanded Legs View */}
        <AnimatePresence>
          {isExpanded && hasLegs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t space-y-2">
                {strategy.legs!.map((leg) => (
                  <div
                    key={leg.id}
                    className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-mono",
                          leg.legType.includes("LONG")
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-red-500/10 text-red-600 border-red-500/30"
                        )}
                      >
                        {leg.legType.replace("_", " ")}
                      </Badge>
                      <span className="font-mono text-muted-foreground">
                        {leg.strikePrice ? `$${leg.strikePrice}` : "-"}
                      </span>
                      {leg.expirationDate && (
                        <span className="text-muted-foreground">
                          {format(new Date(leg.expirationDate), "MMM d")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 font-mono">
                      <span className="text-muted-foreground">x{leg.quantity}</span>
                      <span>
                        ${leg.entryPrice.toFixed(2)}
                        {leg.exitPrice && (
                          <span className="text-muted-foreground">
                            {" "}
                            &rarr; ${leg.exitPrice.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
