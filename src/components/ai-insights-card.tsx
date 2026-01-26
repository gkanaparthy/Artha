"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCcw, AlertTriangle, Clock, BrainCircuit } from "lucide-react";
import { InsightRenderer } from "./insight-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AIInsightsCardProps {
    startDate?: string;
    endDate?: string;
    accountId?: string;
    isDemo?: boolean;
}

const DEMO_INSIGHT = `
### **Key Strengths**
* **Risk Management Consistency**: You've maintained a controlled maximum drawdown of $1,240.50 (approx. 2.4% of your total equity). Your stop-loss discipline on "NVDA" and "AAPL" trades prevented significant capital erosion during recent volatility.
* **Asset Allocation Synergy**: Your strategy of using Stocks for long-term growth and Options for income/hedging is working well. The Stocks portion contributed 65% of your Net P&L with lower relative volatility.

### **Areas for Improvement**
* **Morning Performance Fade**: Analysis shows that trades opened between 9:30 AM and 10:15 AM have a 22% lower win rate. You are often fighting the initial 15-minute price discovery volatility.
* **Profit Taking Early**: On your winning "TSLA" trades, you exited 40% earlier than your original target. This is capping your average win size compared to your risk.

### **Actionable Next Steps**
* **Wait for the 10:00 AM Candle**: Avoid opening new positions in the first 30 minutes of the session. Let the market settle and confirm a trend.
* **Scale Out Strategy**: Instead of full exits, try closing 50% at your first target and moving stops to break-even to allow runners to hit your final goal.
`;

export function AIInsightsCard({ startDate, endDate, accountId, isDemo = false }: AIInsightsCardProps) {
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState<{ content: string; provider: string; timestamp: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generateInsights = async () => {
        setLoading(true);
        setError(null);

        if (isDemo) {
            // Simulate AI delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            setInsights({
                content: DEMO_INSIGHT.trim(),
                provider: "Demo AI",
                timestamp: new Date().toISOString()
            });
            setLoading(false);
            return;
        }

        try {
            const params = new URLSearchParams();
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);
            if (accountId && accountId !== "all") params.set("accountId", accountId);

            const response = await fetch(`/api/insights?${params.toString()}`);

            if (response.status === 429) {
                const data = await response.json();
                setError(`Rate limited: Please try again in ${data.retryAfter} seconds.`);
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to generate insights");
            }

            const data = await response.json();
            setInsights({
                content: data.insights,
                provider: data.provider,
                timestamp: data.timestamp
            });

            if (!data.cached) {
                toast.success("AI Insights generated successfully!");
            }
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Something went wrong while talking to the AI. Please try again later.";
            setError(message);
            toast.error("Failed to generate AI insights");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
            {/* AI Glow Effect */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        AI Performance Coaching
                    </CardTitle>
                    <CardDescription>
                        Personalized insights and actionable recommendations based on your trading patterns
                    </CardDescription>
                </div>
                {!loading && insights && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateInsights}
                        className="text-muted-foreground hover:text-primary"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                )}
            </CardHeader>

            <CardContent>
                {!insights && !loading && !error && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="mb-4 rounded-full bg-primary/10 p-4">
                            <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">Ready to level up?</h3>
                        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
                            Let our AI analyze your recent trades to find your hidden strengths and biggest behavioral opportunities.
                        </p>
                        <Button onClick={generateInsights} className="bg-primary hover:bg-primary/90">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate My Insights
                        </Button>
                    </div>
                )}

                {loading && (
                    <div className="space-y-4 py-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-4 w-[100px]" />
                        </div>
                        <Skeleton className="h-[20px] w-full" />
                        <Skeleton className="h-[20px] w-[90%]" />
                        <Skeleton className="h-[20px] w-[95%]" />
                        <div className="pt-4">
                            <Skeleton className="h-4 w-[150px]" />
                        </div>
                        <Skeleton className="h-[20px] w-full" />
                        <Skeleton className="h-[20px] w-[80%]" />
                        <div className="flex justify-center py-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground italic animate-pulse">
                                <Sparkles className="h-4 w-4" />
                                Analyzing your trading patterns...
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="mb-4 rounded-full bg-red-500/10 p-4">
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold">Insight Generation Failed</h3>
                        <p className="mb-6 max-w-sm text-sm text-muted-foreground">{error}</p>
                        <Button onClick={generateInsights} variant="outline" className="border-red-500/20 hover:bg-red-500/10">
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                    </div>
                )}

                {insights && !loading && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <InsightRenderer content={insights.content} />
                        <div className="mt-6 flex items-center justify-between border-t border-primary/10 pt-4 text-[10px] text-muted-foreground italic">
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Updated {new Date(insights.timestamp).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                                Powered by {insights.provider}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
