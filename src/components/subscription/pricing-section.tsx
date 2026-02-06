"use client";

import { useState, useEffect } from "react";
import { PricingCard } from "./pricing-card";
import { cn } from "@/lib/utils";
import { Playfair_Display } from "next/font/google";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const playfair = Playfair_Display({ subsets: ["latin"] });

interface PricingSectionProps {
    className?: string;
    isFounderPricingActive?: boolean;
    founderSpotsRemaining?: number;
}

export function PricingSection({
    className,
    isFounderPricingActive = true,
    founderSpotsRemaining = 87 // Default for UI, should be dynamic later
}: PricingSectionProps) {
    const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
    const [loading, setLoading] = useState<string | null>(null);
    const [dynamicFounderSpots, setDynamicFounderSpots] = useState<number | null>(null);
    const [dynamicGrandfatheredCount, setDynamicGrandfatheredCount] = useState<number | null>(null);
    const router = useRouter();
    const { data: session } = useSession();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats/founder-count');
                const data = await res.json();
                if (typeof data.count === 'number') {
                    setDynamicFounderSpots(Math.max(0, 100 - data.count));
                }
                if (typeof data.grandfatheredCount === 'number') {
                    setDynamicGrandfatheredCount(data.grandfatheredCount);
                }
            } catch (err) {
                console.error('Failed to fetch founder count:', err);
            }
        };
        fetchStats();
    }, []);

    const spotsRemaining = dynamicFounderSpots ?? founderSpotsRemaining;
    const isFounderActive = spotsRemaining > 0;
    const grandfatheredDisplayCount = dynamicGrandfatheredCount ?? 23;

    const handleSelectPlan = async (plan: "MONTHLY" | "ANNUAL" | "LIFETIME") => {
        if (!session) {
            router.push("/login?callbackUrl=/pricing");
            return;
        }

        setLoading(plan);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || "Failed to start checkout");
                setLoading(null);
            }
        } catch (error) {
            toast.error("An unexpected error occurred");
            setLoading(null);
        }
    };

    return (
        <section id="pricing" className={cn("py-24 bg-[#FAFBF6] overflow-hidden", className)}>
            <div className="container mx-auto px-4 max-w-6xl relative">
                {/* Background Decoration */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#E8EFE0]/20 rounded-full blur-[120px] pointer-events-none -z-10" />

                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className={cn("text-4xl md:text-6xl font-bold text-[#2E4A3B] mb-6", playfair.className)}>
                            The Last Tool for Your <br />
                            <span className="italic text-[#E59889]">Trading Edge</span>
                        </h2>
                        <p className="text-lg text-[#2E4A3B]/70 max-w-2xl mx-auto mb-10">
                            Stop guessing. Start knowing. Artha Pro gives you the behavioral insights
                            you need to finally trade with consistency.
                        </p>

                        {/* Billing Switcher */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <span className={cn("text-sm font-medium transition-colors", billingCycle === "MONTHLY" ? "text-[#2E4A3B]" : "text-[#2E4A3B]/40")}>
                                Monthly
                            </span>
                            <button
                                onClick={() => setBillingCycle(billingCycle === "MONTHLY" ? "ANNUAL" : "MONTHLY")}
                                className="relative w-14 h-7 bg-[#2E4A3B]/10 rounded-full p-1 transition-colors hover:bg-[#2E4A3B]/20"
                            >
                                <motion.div
                                    animate={{ x: billingCycle === "MONTHLY" ? 0 : 28 }}
                                    className="w-5 h-5 bg-[#2E4A3B] rounded-full shadow-md"
                                />
                            </button>
                            <span className={cn("text-sm font-medium transition-colors flex items-center gap-2", billingCycle === "ANNUAL" ? "text-[#2E4A3B]" : "text-[#2E4A3B]/40")}>
                                Annual
                                <span className="px-2 py-0.5 bg-[#E8EFE0] text-[#2E4A3B] text-[10px] font-bold rounded-full uppercase tracking-wider">
                                    Save 17%
                                </span>
                            </span>
                        </div>
                    </motion.div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 items-stretch pt-8">
                    {/* Monthly/Annual Plan */}
                    <PricingCard
                        name="Artha Pro"
                        price={billingCycle === "MONTHLY" ? (isFounderActive ? "$12" : "$20") : (isFounderActive ? "$120" : "$200")}
                        subtitle={billingCycle === "MONTHLY" ? "/ month" : "/ year"}
                        description={isFounderActive
                            ? "Founder pricing locked-in forever. Includes all current and future Pro features."
                            : "Full access to the behavioral trading suite. Automated sync and unlimited insights."
                        }
                        features={[
                            "Unlimited brokerage sync",
                            "AI Behavioral Insights",
                            "Emotional correlation analytics",
                            "Setup performance tracking",
                            "Export to CSV/Excel",
                            "Email support",
                            "Custom psychology tags"
                        ]}
                        buttonText={`Start 1 Month Free Trial`}
                        onSelect={() => handleSelectPlan(billingCycle)}
                        loading={loading === billingCycle}
                        tag={isFounderActive ? "FOUNDER PRICING" : undefined}
                        highlighted={true}
                    />

                    {/* Lifetime Deal */}
                    <PricingCard
                        name="Artha Lifetime"
                        price={isFounderActive ? "$99" : "$149"}
                        subtitle=" one-time"
                        description="Pay once, own forever. The ultimate commitment to your trading career. Limited spots available."
                        features={[
                            "Everything in Pro forever",
                            "Zero recurring fees",
                            "Early access to new modules",
                            "Lifetime feature updates",
                            "Exclusive 'Founder' profile badge",
                            "Priority feature requests",
                            "1-on-1 onboarding session"
                        ]}
                        buttonText="Get Lifetime Access"
                        onSelect={() => handleSelectPlan("LIFETIME")}
                        loading={loading === "LIFETIME"}
                        tag="BEST VALUE"
                    />

                    {/* Early Adopter (Visual Only) */}
                    <div className="flex flex-col p-8 rounded-3xl bg-[#FAFBF6] border border-[#2E4A3B]/10 opacity-80">
                        <h3 className="text-xl font-bold text-[#2E4A3B] mb-2 text-center uppercase tracking-tighter opacity-50">Early Adopter</h3>
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-[#E8EFE0] flex items-center justify-center mb-6">
                                <span className="text-2xl">🎁</span>
                            </div>
                            <h4 className="font-bold text-[#2E4A3B] mb-2">Grandfather Clause</h4>
                            <p className="text-sm text-[#2E4A3B]/60 max-w-[200px]">
                                Already in our database? You're grandfathered into Pro free forever.
                                <span className="block mt-2 font-semibold">Thank you for being here early.</span>
                            </p>
                        </div>
                        <div className="mt-auto border-t border-[#2E4A3B]/10 pt-6">
                            <p className="text-[10px] text-center text-[#2E4A3B]/40 uppercase font-bold tracking-[0.2em]">
                                Already {grandfatheredDisplayCount} users grandfathered
                            </p>
                        </div>
                    </div>
                </div>

                {/* Founder Spots Progress */}
                {isFounderActive && (
                    <div className="mt-16 max-w-md mx-auto">
                        <div className="flex justify-between items-end mb-2">
                            <div className="text-sm font-bold text-[#2E4A3B]">Founder Spots Remaining</div>
                            <div className="text-sm font-bold text-[#E59889]">{spotsRemaining} / 100</div>
                        </div>
                        <div className="h-3 w-full bg-[#2E4A3B]/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${spotsRemaining}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-[#2E4A3B] rounded-full"
                            />
                        </div>
                        <p className="text-center text-xs text-[#2E4A3B]/50 mt-4 italic">
                            Founder pricing ends once the first 100 users subscribe.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}
