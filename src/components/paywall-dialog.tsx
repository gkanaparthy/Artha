"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface PaywallDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feature?: string;
}

export function PaywallDialog({ open, onOpenChange, feature = "this feature" }: PaywallDialogProps) {
    const router = useRouter();

    const handleUpgrade = () => {
        onOpenChange(false);
        router.push("/pricing");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 mx-auto">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-center text-2xl">
                        Upgrade to Pro
                    </DialogTitle>
                    <DialogDescription className="text-center text-base pt-2">
                        Unlock automated trade tracking, AI insights, and advanced analytics to level up your trading.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {[
                        "Automatic trade sync from 25+ brokers",
                        "Real-time P&L tracking with FIFO matching",
                        "AI-powered performance insights",
                        "Advanced analytics and reports",
                    ].map((benefit, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">{benefit}</p>
                        </div>
                    ))}
                </div>

                <div className="space-y-2 pt-4">
                    <Button onClick={handleUpgrade} className="w-full" size="lg">
                        View Plans
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="w-full"
                    >
                        Maybe Later
                    </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground pt-2">
                    No credit card required. Cancel anytime.
                </p>
            </DialogContent>
        </Dialog>
    );
}
