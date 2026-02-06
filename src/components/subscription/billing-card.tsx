"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, Sparkles, ExternalLink, Calendar } from "lucide-react";
import { SubscriptionInfo } from "@/lib/subscription";
import { toast } from "sonner";
import { format } from "date-fns";

interface BillingCardProps {
    subscription: SubscriptionInfo;
}

export function BillingCard({ subscription }: BillingCardProps) {
    const [loading, setLoading] = useState(false);
    const { status, plan, tier, isFounder, isGrandfathered, isLifetime, currentPeriodEnd } = subscription;

    const handleManageBilling = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/stripe/portal", {
                method: "POST",
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
                return; // Navigating away, don't reset loading
            } else {
                toast.error(data.error || "Failed to open billing portal");
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel your subscription? You will keep Pro access until the end of your billing period.")) return;

        try {
            setLoading(true);
            const res = await fetch("/api/subscription/cancel", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.success("Subscription cancelled successfully");
                window.location.reload();
            } else {
                toast.error(data.error || "Failed to cancel subscription");
            }
        } catch (error) {
            toast.error("An error occurred while cancelling");
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/subscription/resume", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.success("Subscription resumed! Welcome back.");
                window.location.reload();
            } else {
                toast.error(data.error || "Failed to resume subscription");
            }
        } catch (error) {
            toast.error("An error occurred while resuming");
        } finally {
            setLoading(false);
        }
    };

    const getPlanName = () => {
        if (isGrandfathered) return "Early Adopter (Free Forever)";
        if (isLifetime) return "Lifetime Pro";
        if (status === 'TRIALING') return "Free Trial";
        if (status === 'NONE') return "Free Tier";
        return `Artha Pro (${plan === 'ANNUAL' ? 'Annual' : 'Monthly'})`;
    };

    const getStatusColor = () => {
        if (status === 'ACTIVE' || status === 'LIFETIME' || isGrandfathered) return "bg-green-500/10 text-green-500 border-green-500/30";
        if (status === 'TRIALING') return "bg-blue-500/10 text-blue-500 border-blue-500/30";
        if (status === 'PAST_DUE') return "bg-red-500/10 text-red-500 border-red-500/30";
        if (status === 'CANCELLED') return "bg-orange-500/10 text-orange-500 border-orange-500/30";
        return "bg-muted text-muted-foreground";
    };

    return (
        <Card className="card-hover overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="p-4 sm:p-6 pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base sm:text-lg">Subscription & Billing</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Manage your plan and payment methods</CardDescription>
                        </div>
                    </div>
                    {!isGrandfathered && status !== 'NONE' && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManageBilling}
                            disabled={loading}
                            className="h-9"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                            Manage Billing
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-background/50 backdrop-blur-sm">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{getPlanName()}</span>
                            <Badge variant="outline" className={getStatusColor()}>
                                {status.replace('_', ' ')}
                            </Badge>
                            {isFounder && (
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Founder
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isGrandfathered
                                ? "Full access granted as thank you for early support."
                                : status === 'ACTIVE'
                                    ? `Next billing date: ${currentPeriodEnd ? format(new Date(currentPeriodEnd), 'PPP') : 'N/A'}`
                                    : status === 'TRIALING'
                                        ? `Trial ends in ${subscription.trialDaysRemaining ?? 0} days`
                                        : "Unlock pro features to grow your trading account."}
                        </p>
                    </div>
                    {(status === 'NONE' || status === 'EXPIRED') && (
                        <Button className="font-bold bg-primary hover:bg-primary/90 rounded-xl" asChild>
                            <a href="/pricing">Upgrade Now</a>
                        </Button>
                    )}
                    {status === 'CANCELLED' && currentPeriodEnd && (
                        <Button
                            variant="default"
                            className="font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl"
                            onClick={handleResume}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Resume Subscription
                        </Button>
                    )}
                    {(status === 'ACTIVE' || status === 'TRIALING') && plan !== 'LIFETIME' && !isGrandfathered && (
                        <Button
                            variant="ghost"
                            className="text-xs text-muted-foreground hover:text-destructive"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancel Subscription
                        </Button>
                    )}
                </div>

                {status === 'CANCELLED' && currentPeriodEnd && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-sm">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Your subscription has been cancelled and will remain active until {format(new Date(currentPeriodEnd), 'PPP')}.</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
