"use client";

import { PricingSection } from "@/components/subscription/pricing-section";
import { FAQSection } from "@/components/landing/faq-section";
import { PageTransition } from "@/components/motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
    return (
        <PageTransition>
            <div className="min-h-screen bg-[#FAFBF6] pb-20">
                <header className="container mx-auto px-4 py-8 max-w-6xl">
                    <Link href="/dashboard">
                        <Button variant="ghost" className="text-[#2E4A3B] hover:bg-[#2E4A3B]/5">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                </header>

                <main>
                    <script
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify({
                                "@context": "https://schema.org",
                                "@type": "WebPage",
                                "name": "Artha Pricing Plans",
                                "description": "Affordable pricing plans for the Artha trading journal, including Pro and Lifetime access.",
                                "publisher": {
                                    "@type": "Organization",
                                    "name": "Artha"
                                },
                                "mainEntity": {
                                    "@type": "SoftwareApplication",
                                    "name": "Artha Pro",
                                    "offers": {
                                        "@type": "AggregateOffer",
                                        "priceCurrency": "USD",
                                        "lowPrice": "12",
                                        "offerCount": "3"
                                    }
                                }
                            })
                        }}
                    />
                    <div className="container mx-auto px-4 max-w-6xl mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-[#2E4A3B] mb-4 text-center">
                            Pricing Plans for Every Trader
                        </h1>
                        <p className="text-[#2E4A3B]/60 text-center text-lg max-w-2xl mx-auto">
                            Choose the plan that fits your trading journey. No hidden fees, cancel anytime.
                        </p>
                    </div>
                    <PricingSection className="py-10" />
                    <FAQSection />
                </main>
            </div>
        </PageTransition>
    );
}
