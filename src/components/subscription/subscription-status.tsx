"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Zap } from "lucide-react";
import { SubscriptionInfo } from "@/lib/subscription";
import Link from "next/link";

interface SubscriptionStatusProps {
    subscription: SubscriptionInfo;
}

export function SubscriptionStatus({ subscription }: SubscriptionStatusProps) {
    const { status, isGrandfathered, isFounder, isLifetime, isTrialing, trialDaysRemaining } = subscription;

    if (isGrandfathered) {
        return (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Crown className="w-4 h-4" />
                    Early Adopter
                </div>
                <div className="text-xs text-muted-foreground">
                    Free Pro access forever as a thank you for your early support.
                </div>
                <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-wider px-1.5 h-4">
                    PRO FOREVER
                </Badge>
            </div>
        );
    }

    if (isLifetime) {
        return (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm">
                    <Sparkles className="w-4 h-4" />
                    Lifetime Pro
                </div>
                <div className="text-xs text-muted-foreground">
                    Unlimited access to all Artha features.
                </div>
                <Badge variant="outline" className="w-fit bg-orange-500/10 text-orange-600 dark:text-orange-400 border-none text-[10px] uppercase font-bold tracking-wider px-1.5 h-4">
                    LIFETIME
                </Badge>
            </div>
        );
    }

    if (isTrialing) {
        return (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold text-sm">
                        <Zap className="w-4 h-4" />
                        Free Trial
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {trialDaysRemaining} days remaining in your trial.
                </div>
                <div className="mt-1">
                    <Link href="/pricing">
                        <Button size="sm" variant="outline" className="w-full text-xs h-8 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400">
                            Upgrade to Pro
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'PAST_DUE') {
        return (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
                    <Zap className="w-4 h-4" />
                    Payment Failed
                </div>
                <div className="text-xs text-muted-foreground">
                    Please update your payment method to keep Pro access.
                </div>
                <div className="mt-1">
                    <Link href="/settings">
                        <Button size="sm" variant="outline" className="w-full text-xs h-8 border-red-500/20 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400">
                            Update Payment
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'CANCELLED') {
        return (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm">
                    <Zap className="w-4 h-4" />
                    Cancelling
                </div>
                <div className="text-xs text-muted-foreground">
                    Access until period ends. Resubscribe anytime.
                </div>
                <div className="mt-1">
                    <Link href="/settings">
                        <Button size="sm" variant="outline" className="w-full text-xs h-8 border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400">
                            Resume Subscription
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'NONE' || status === 'EXPIRED') {
        return (
            <div className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-secondary/50">
                <div className="text-sm font-semibold">Artha Pro</div>
                <div className="text-xs text-muted-foreground">
                    Unlock AI insights, unlimited brokers, and deep analytics.
                </div>
                <Link href="/pricing" className="mt-1">
                    <Button size="sm" className="w-full text-xs h-8">
                        View Pricing
                    </Button>
                </Link>
            </div>
        );
    }

    // Default active subscription
    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <Sparkles className="w-4 h-4" />
                    Artha Pro
                </div>
                {isFounder && (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-wider px-1.5 h-4">
                        FOUNDER
                    </Badge>
                )}
            </div>
            <div className="text-xs text-muted-foreground">
                Your subscription is active. Thank you!
            </div>
            <Link href="/settings" className="mt-1">
                <Button size="sm" variant="ghost" className="w-full text-xs h-8 text-muted-foreground hover:text-foreground">
                    Manage Billing
                </Button>
            </Link>
        </div>
    );
}
