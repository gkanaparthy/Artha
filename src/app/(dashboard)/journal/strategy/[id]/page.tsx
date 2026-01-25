"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Unlink, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";
import {
  StrategyWithLegs,
  STRATEGY_LABELS,
  STRATEGY_COLORS,
  getStrategyDirection,
} from "@/types/strategy";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StrategyDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [strategy, setStrategy] = useState<StrategyWithLegs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/strategies/${id}`);
        if (!res.ok) {
          throw new Error("Strategy not found");
        }
        const data = await res.json();
        setStrategy(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load strategy");
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [id]);

  const handleUngroup = async () => {
    if (!confirm("Are you sure you want to ungroup this strategy? The trades will remain but won't be grouped.")) {
      return;
    }

    try {
      const res = await fetch(`/api/strategies/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/journal");
      } else {
        alert("Failed to ungroup strategy");
      }
    } catch (err) {
      console.error(err);
      alert("Error ungrouping strategy");
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageTransition>
    );
  }

  if (error || !strategy) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{error || "Strategy not found"}</p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const colors = STRATEGY_COLORS[strategy.strategyType];
  const direction = getStrategyDirection(strategy.strategyType);
  const isProfit = strategy.realizedPnL > 0;

  // Calculate risk/reward ratio
  const riskRewardRatio = strategy.maxProfit !== null && strategy.maxLoss !== null && strategy.maxLoss !== 0
    ? (strategy.maxProfit / strategy.maxLoss).toFixed(2)
    : null;

  // Calculate progress towards max profit/loss
  const profitProgress = strategy.maxProfit !== null && strategy.maxProfit > 0
    ? Math.min(100, Math.max(-100, (strategy.realizedPnL / strategy.maxProfit) * 100))
    : null;

  // NOTE: Total leg P&L can be calculated as:
  // strategy.legs.reduce((sum, leg) => {
  //   if (leg.exitPrice !== null) {
  //     const isLong = leg.legType.includes("LONG");
  //     const multiplier = 100;
  //     return sum + (isLong
  //       ? (leg.exitPrice - leg.entryPrice) * leg.quantity * multiplier
  //       : (leg.entryPrice - leg.exitPrice) * leg.quantity * multiplier);
  //   }
  //   return sum;
  // }, 0);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  {strategy.name || strategy.underlyingSymbol}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-sm font-medium",
                    colors.bg,
                    colors.text,
                    colors.border
                  )}
                >
                  {STRATEGY_LABELS[strategy.strategyType]}
                </Badge>
                {strategy.status === "open" ? (
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                    Open
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
                    Closed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Opened {format(new Date(strategy.openedAt), "MMM d, yyyy")}
                </span>
                {strategy.expirationDate && (
                  <span>Expires {format(new Date(strategy.expirationDate), "MMM d, yyyy")}</span>
                )}
                <span>{strategy.broker}</span>
                {strategy.autoDetected && (
                  <Badge variant="secondary" className="text-xs">Auto-detected</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleUngroup}>
              <Unlink className="h-4 w-4 mr-2" />
              Ungroup
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AnimatedCard delay={0.1}>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Net Premium</div>
                <div className={cn(
                  "text-2xl font-bold font-mono mt-1",
                  strategy.netPremium > 0 ? "text-green-600" : strategy.netPremium < 0 ? "text-red-600" : ""
                )}>
                  {strategy.netPremium > 0 ? "+" : ""}${strategy.netPremium.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {strategy.netPremium > 0 ? "Credit received" : "Debit paid"}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Realized P&L</div>
                <div className={cn(
                  "text-2xl font-bold font-mono mt-1 flex items-center gap-2",
                  isProfit ? "text-green-600" : strategy.realizedPnL < 0 ? "text-red-600" : ""
                )}>
                  {isProfit ? <TrendingUp className="h-5 w-5" /> : strategy.realizedPnL < 0 ? <TrendingDown className="h-5 w-5" /> : null}
                  {strategy.realizedPnL >= 0 ? "+" : ""}${strategy.realizedPnL.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  From closed legs
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Max Profit</div>
                <div className="text-2xl font-bold font-mono mt-1 text-green-600">
                  {strategy.maxProfit !== null ? `$${strategy.maxProfit.toFixed(2)}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Theoretical maximum
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Max Loss</div>
                <div className="text-2xl font-bold font-mono mt-1 text-red-600">
                  {strategy.maxLoss !== null ? `$${Math.abs(strategy.maxLoss).toFixed(2)}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Theoretical maximum
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Risk/Reward Summary */}
        {riskRewardRatio !== null && (
          <AnimatedCard delay={0.45}>
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground">Risk/Reward</div>
                      <div className="text-xl font-bold font-mono">{riskRewardRatio}:1</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Direction</div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-sm font-medium mt-1",
                          direction === "bullish" && "bg-green-500/10 text-green-600 border-green-500/30",
                          direction === "bearish" && "bg-red-500/10 text-red-600 border-red-500/30",
                          direction === "neutral" && "bg-gray-500/10 text-gray-600 border-gray-500/30"
                        )}
                      >
                        {direction.charAt(0).toUpperCase() + direction.slice(1)}
                      </Badge>
                    </div>
                    {profitProgress !== null && (
                      <div className="flex-1 max-w-xs">
                        <div className="text-sm text-muted-foreground mb-1">P&L Progress</div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              profitProgress >= 0 ? "bg-green-500" : "bg-red-500"
                            )}
                            style={{ width: `${Math.abs(profitProgress)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {profitProgress >= 0 ? `${profitProgress.toFixed(0)}% of max profit` : `${Math.abs(profitProgress).toFixed(0)}% of max loss`}
                        </div>
                      </div>
                    )}
                  </div>
                  {strategy.confidence !== null && (
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Detection Confidence</div>
                      <div className="text-lg font-mono">{(strategy.confidence * 100).toFixed(0)}%</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        )}

        {/* Legs Table */}
        <AnimatedCard delay={0.5}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strategy Legs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strategy.legs.map((leg, index) => {
                  const isLong = leg.legType.includes("LONG");
                  const multiplier = 100;
                  let legPnL = 0;
                  if (leg.exitPrice !== null) {
                    legPnL = isLong
                      ? (leg.exitPrice - leg.entryPrice) * leg.quantity * multiplier
                      : (leg.entryPrice - leg.exitPrice) * leg.quantity * multiplier;
                  }

                  return (
                    <div
                      key={leg.id}
                      className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-lg font-bold text-muted-foreground w-8">
                          #{index + 1}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-sm",
                            isLong
                              ? "bg-green-500/10 text-green-600 border-green-500/30"
                              : "bg-red-500/10 text-red-600 border-red-500/30"
                          )}
                        >
                          {leg.legType.replace(/_/g, " ")}
                        </Badge>
                        <div className="font-mono">
                          <span className="text-muted-foreground">Strike:</span>{" "}
                          <span className="font-semibold">
                            {leg.strikePrice ? `$${leg.strikePrice}` : "—"}
                          </span>
                        </div>
                        {leg.expirationDate && (
                          <div className="text-muted-foreground">
                            Exp: {format(new Date(leg.expirationDate), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 font-mono">
                        <div>
                          <span className="text-muted-foreground">Qty:</span>{" "}
                          <span className="font-semibold">{leg.quantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Entry:</span>{" "}
                          <span className="font-semibold">${leg.entryPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Exit:</span>{" "}
                          <span className="font-semibold">
                            {leg.exitPrice !== null ? `$${leg.exitPrice.toFixed(2)}` : "—"}
                          </span>
                        </div>
                        {leg.exitPrice !== null && (
                          <div className={cn(
                            "font-semibold",
                            legPnL > 0 ? "text-green-600" : legPnL < 0 ? "text-red-600" : ""
                          )}>
                            {legPnL >= 0 ? "+" : ""}${legPnL.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Original Trades */}
        <AnimatedCard delay={0.6}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Original Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {strategy.legs.map((leg) => (
                  <div
                    key={leg.id}
                    className="flex items-center justify-between text-sm bg-background border rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        {format(new Date(leg.trade.timestamp), "MMM d, yyyy HH:mm")}
                      </span>
                      <span className="font-mono font-semibold">{leg.trade.symbol}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          leg.trade.action.includes("BUY")
                            ? "bg-green-500/10 text-green-600 border-green-500/30"
                            : "bg-red-500/10 text-red-600 border-red-500/30"
                        )}
                      >
                        {leg.trade.action}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-sm">
                      <span>{leg.trade.quantity} contracts</span>
                      <span>@ ${leg.trade.price.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </PageTransition>
  );
}
